package app.jspcoders.perzent

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.TimeUnit

/**
 * Sticky foreground location service used while an employee is checked in.
 *
 * Threading model:
 *  - Location callbacks, notification refreshes and lifecycle run on the main looper.
 *  - All network I/O and every read/modify/write of the offline queue run on ONE
 *    single-thread executor; the queue itself is additionally guarded by [queueLock]
 *    because the companion (called from the React Native thread) also writes it.
 */
class PerzentLocationService : Service() {

    data class TrackingState(
        val trackingActive: Boolean,
        val authInvalid: Boolean,
        val shiftEndedRemotely: Boolean,
        val permissionRevoked: Boolean,
        val lastFixEpochMs: Long,
    )

    companion object {
        const val TAG = "PerzentLocationService"
        const val NOTIFICATION_CHANNEL_ID = "perzent_duty_tracking_v1"
        const val NOTIFICATION_ID = 99881
        const val PREFS_NAME = "perzent_service_prefs"
        const val KEY_TOKEN = "auth_token"
        const val KEY_USER_ID = "user_id"
        const val KEY_API_BASE = "api_base_url"
        const val KEY_TRACKING_ACTIVE = "tracking_active"
        const val KEY_PUNCH_IN_EPOCH = "punch_in_epoch"
        const val KEY_OFFLINE_WAYPOINTS = "offline_waypoints_queue_v1"
        const val KEY_AUTH_INVALID = "auth_invalid"
        const val KEY_SHIFT_ENDED_REMOTELY = "shift_ended_remotely"
        const val KEY_PERMISSION_REVOKED = "permission_revoked"
        // Database-direct access (Supabase PostgREST RPC); empty when the backend has not issued it.
        const val KEY_DIRECT_URL = "direct_url"
        const val KEY_DIRECT_ANON = "direct_anon_key"
        const val KEY_DIRECT_TOKEN = "direct_token"
        const val DEFAULT_API_BASE = "https://perzent.vercel.app"

        const val MAX_OFFLINE_POINTS = 3000
        const val MAX_BATCH_SIZE = 500

        const val ACTION_START = "app.jspcoders.perzent.ACTION_START_TRACKING"
        const val ACTION_STOP = "app.jspcoders.perzent.ACTION_STOP_TRACKING"

        // Fused provider cadence (kept at 3 s for a smooth live map). Points are only QUEUED when the
        // device has moved; while stationary one "still here" sample per 10 min is enough for dwell
        // time (presence is carried by the telemetry heartbeat). Queued points are FLUSHED in small
        // batches so a moving employee costs one request per ~6 s instead of one per fix.
        const val UPDATE_INTERVAL_MS = 3_000L
        const val FASTEST_INTERVAL_MS = 1_500L
        const val MOVING_QUEUE_INTERVAL_MS = 3_000L
        const val STATIONARY_QUEUE_INTERVAL_MS = 10 * 60_000L
        const val MOVING_DISTANCE_METERS = 10f
        const val FLUSH_INTERVAL_MS = 6_000L
        const val TELEMETRY_INTERVAL_MS = 45_000L
        const val NOTIFICATION_REFRESH_MS = 15_000L
        const val BACKOFF_MIN_MS = 5_000L
        const val BACKOFF_MAX_MS = 120_000L

        /** Set by [stopService]; the running instance observes it and shuts down without any service start. */
        @Volatile private var stopRequested = false
        @Volatile private var instance: PerzentLocationService? = null

        /** Epoch ms of the last GPS fix seen in this process (0 if none). */
        @Volatile var lastFixEpochMs: Long = 0L
            private set

        private val queueLock = Any()

        fun prefs(context: Context): SharedPreferences =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        fun startService(
            context: Context,
            token: String,
            userId: String,
            apiBase: String = DEFAULT_API_BASE,
            punchInEpochMs: Long = System.currentTimeMillis(),
            directUrl: String = "",
            directAnonKey: String = "",
            directToken: String = "",
        ) {
            stopRequested = false
            synchronized(queueLock) {
                prefs(context).edit()
                    .putString(KEY_TOKEN, token)
                    .putString(KEY_USER_ID, userId)
                    .putString(KEY_API_BASE, apiBase)
                    .putString(KEY_DIRECT_URL, directUrl)
                    .putString(KEY_DIRECT_ANON, directAnonKey)
                    .putString(KEY_DIRECT_TOKEN, directToken)
                    .putLong(KEY_PUNCH_IN_EPOCH, punchInEpochMs)
                    .putBoolean(KEY_TRACKING_ACTIVE, true)
                    .putBoolean(KEY_AUTH_INVALID, false)
                    .putBoolean(KEY_SHIFT_ENDED_REMOTELY, false)
                    .putBoolean(KEY_PERMISSION_REVOKED, false)
                    // A new shift must never inherit points recorded for an earlier one.
                    .putString(KEY_OFFLINE_WAYPOINTS, "[]")
                    .apply()
            }
            val intent = Intent(context, PerzentLocationService::class.java).apply { action = ACTION_START }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /**
         * Stops tracking. Safe from any thread and any app state and never throws: the running
         * instance lives in this process, so it is asked to shut down directly instead of
         * sending a start intent (which is illegal from the background on Android 8+).
         * If no instance is alive, the prefs flag alone guarantees that any sticky restart
         * exits immediately in [onStartCommand].
         */
        fun stopService(context: Context) {
            stopRequested = true
            try {
                prefs(context).edit()
                    .putBoolean(KEY_TRACKING_ACTIVE, false)
                    .remove(KEY_TOKEN)
                    .remove(KEY_USER_ID)
                    .remove(KEY_PUNCH_IN_EPOCH)
                    .remove(KEY_DIRECT_TOKEN)
                    .apply()
            } catch (e: Exception) {
                Log.w(TAG, "stopService: prefs update failed: ${e.message}")
            }
            val running = instance ?: return
            try {
                running.mainHandler.post { running.shutdown(flushBeforeExit = true) }
            } catch (e: Exception) {
                Log.w(TAG, "stopService: could not reach running instance: ${e.message}")
            }
        }

        /**
         * True only while the service instance is alive in this process. The prefs flag alone means
         * "a shift is open and tracking is wanted" and survives reboots / process death, which made
         * the app believe tracking was running after a reboot when it was not.
         */
        fun isTracking(context: Context): Boolean =
            prefs(context).getBoolean(KEY_TRACKING_ACTIVE, false) && instance != null

        fun getState(context: Context): TrackingState {
            val p = prefs(context)
            return TrackingState(
                trackingActive = p.getBoolean(KEY_TRACKING_ACTIVE, false) && instance != null,
                authInvalid = p.getBoolean(KEY_AUTH_INVALID, false),
                shiftEndedRemotely = p.getBoolean(KEY_SHIFT_ENDED_REMOTELY, false),
                permissionRevoked = p.getBoolean(KEY_PERMISSION_REVOKED, false),
                lastFixEpochMs = lastFixEpochMs,
            )
        }

        fun clearFlags(context: Context) {
            prefs(context).edit()
                .putBoolean(KEY_AUTH_INVALID, false)
                .putBoolean(KEY_SHIFT_ENDED_REMOTELY, false)
                .putBoolean(KEY_PERMISSION_REVOKED, false)
                .apply()
        }

        private fun newUploadExecutor(): ExecutorService =
            Executors.newSingleThreadExecutor { runnable ->
                Thread(runnable, "perzent-upload").apply { isDaemon = true }
            }
    }

    internal val mainHandler = Handler(Looper.getMainLooper())
    private var uploadExecutor: ExecutorService = newUploadExecutor()
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var locationManager: LocationManager? = null
    private var systemLocationListener: LocationListener? = null
    private var gpsStateReceiver: BroadcastReceiver? = null
    private var wakeLock: PowerManager.WakeLock? = null

    @Volatile private var token: String = ""
    @Volatile private var userId: String = ""
    @Volatile private var apiBase: String = DEFAULT_API_BASE
    @Volatile private var punchInEpochMs: Long = 0L
    @Volatile private var directUrl: String = ""
    @Volatile private var directAnon: String = ""
    @Volatile private var directToken: String = ""

    // Main-thread state
    private var lastAcceptedLocation: Location? = null
    private var lastUploadElapsedMs = 0L
    private var lastTelemetryElapsedMs = 0L
    private var gpsProviderOff = false
    private var isForeground = false
    private var shuttingDown = false
    @Volatile private var lastMockFlag = false

    // Retry/backoff state (upload thread), read on main for scheduling
    private var currentBackoffMs = 0L
    @Volatile private var retryNotBeforeMs = 0L

    private val notificationRefresh = object : Runnable {
        override fun run() {
            if (shuttingDown) return
            if (stopRequested) {
                shutdown(flushBeforeExit = true)
                return
            }
            refreshNotification()
            mainHandler.postDelayed(this, NOTIFICATION_REFRESH_MS)
        }
    }
    private val retryRunnable = Runnable { scheduleFlush() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.i(TAG, "PerzentLocationService onCreate")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val p = prefs(this)
        val active = p.getBoolean(KEY_TRACKING_ACTIVE, false)

        if (intent?.action == ACTION_STOP || stopRequested || !active) {
            Log.i(TAG, "Stop requested (action=${intent?.action}, stopRequested=$stopRequested, active=$active)")
            ensureForegroundForStop()
            shutdown(flushBeforeExit = true)
            return START_NOT_STICKY
        }

        val savedToken = p.getString(KEY_TOKEN, null)
        val savedUserId = p.getString(KEY_USER_ID, null)
        if (savedToken.isNullOrEmpty() || savedUserId.isNullOrEmpty()) {
            Log.w(TAG, "No credentials in prefs. Terminating service.")
            p.edit().putBoolean(KEY_TRACKING_ACTIVE, false).apply()
            ensureForegroundForStop()
            shutdown(flushBeforeExit = false)
            return START_NOT_STICKY
        }
        token = savedToken
        userId = savedUserId
        apiBase = p.getString(KEY_API_BASE, DEFAULT_API_BASE) ?: DEFAULT_API_BASE
        punchInEpochMs = p.getLong(KEY_PUNCH_IN_EPOCH, System.currentTimeMillis())
        directUrl = p.getString(KEY_DIRECT_URL, "") ?: ""
        directAnon = p.getString(KEY_DIRECT_ANON, "") ?: ""
        directToken = p.getString(KEY_DIRECT_TOKEN, "") ?: ""

        if (!DeviceStatus.hasFineLocationPermission(this)) {
            Log.w(TAG, "Location permission not granted - cannot track.")
            markPermissionRevoked()
            ensureForegroundForStop()
            shutdown(flushBeforeExit = false)
            return START_NOT_STICKY
        }

        // A restarted instance may have been shut down earlier (break -> resume); reset for reuse.
        shuttingDown = false
        if (uploadExecutor.isShutdown) uploadExecutor = newUploadExecutor()

        if (!enterForeground()) return START_NOT_STICKY

        acquireWakeLock()
        registerGpsStateReceiver()
        gpsProviderOff = !DeviceStatus.locationServicesEnabled(this)
        startLocationUpdates()
        mainHandler.removeCallbacks(notificationRefresh)
        mainHandler.post(notificationRefresh)
        scheduleFlush() // push anything left over from a restart

        return START_STICKY
    }

    // ---------------------------------------------------------------------------------------------
    // Foreground / notification
    // ---------------------------------------------------------------------------------------------

    /** Enters the foreground; on a SecurityException (permission revoked) flags it and stops gracefully. */
    private fun enterForeground(): Boolean {
        val notification = buildForegroundNotification(title = "Perzent • On duty", content = shiftStatusText())
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            isForeground = true
            true
        } catch (e: SecurityException) {
            Log.e(TAG, "startForeground refused - location permission revoked", e)
            markPermissionRevoked()
            shutdown(flushBeforeExit = false)
            false
        } catch (e: Exception) {
            // e.g. ForegroundServiceStartNotAllowedException on Android 12+ when started from the background
            Log.e(TAG, "startForeground failed", e)
            prefs(this).edit().putBoolean(KEY_TRACKING_ACTIVE, false).apply()
            shutdown(flushBeforeExit = false)
            false
        }
    }

    /**
     * A service started via startForegroundService() must call startForeground() before it
     * stops, otherwise the system kills the process. Used on the stop path only.
     */
    private fun ensureForegroundForStop() {
        if (isForeground) return
        try {
            val notification = buildForegroundNotification(title = "Perzent", content = "Stopping location sharing…")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            isForeground = true
        } catch (e: Exception) {
            Log.w(TAG, "ensureForegroundForStop: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Work shift location sharing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shown while you are checked in and your live location is shared with your employer"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(title: String, content: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_perzent)
            .setContentTitle(title)
            .setContentText(content)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun shiftStatusText(): String {
        val elapsed = if (punchInEpochMs > 0) System.currentTimeMillis() - punchInEpochMs else 0L
        val clock = formatElapsed(elapsed)
        return if (gpsProviderOff) {
            "Shift $clock • GPS is off - turn it on to keep tracking"
        } else {
            "Shift $clock • Live location on"
        }
    }

    /** Refreshes the single persistent notification (called every 15 s and on GPS state changes). */
    private fun refreshNotification() {
        if (!isForeground || shuttingDown) return
        val title = if (gpsProviderOff) "Perzent • Location (GPS) turned off" else "Perzent • On duty"
        try {
            (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
                ?.notify(NOTIFICATION_ID, buildForegroundNotification(title, shiftStatusText()))
        } catch (e: Exception) {
            Log.w(TAG, "Notification refresh failed: ${e.message}")
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Wake lock / receivers
    // ---------------------------------------------------------------------------------------------

    private fun acquireWakeLock() {
        if (wakeLock != null) return
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Perzent:DutyTrackingWakeLock").apply {
                setReferenceCounted(false)
                acquire(24 * 60 * 60 * 1000L)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Wake lock unavailable: ${e.message}")
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock", e)
        }
        wakeLock = null
    }

    private fun registerGpsStateReceiver() {
        if (gpsStateReceiver != null) return
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (shuttingDown) return
                val enabled = DeviceStatus.locationServicesEnabled(this@PerzentLocationService)
                Log.i(TAG, "Location provider state changed. Enabled: $enabled")
                gpsProviderOff = !enabled
                refreshNotification()
                if (enabled) startLocationUpdates()
            }
        }
        val filter = IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(receiver, filter)
            }
            gpsStateReceiver = receiver
        } catch (e: Exception) {
            Log.w(TAG, "Could not register GPS state receiver: ${e.message}")
        }
    }

    private fun unregisterGpsReceiver() {
        val receiver = gpsStateReceiver ?: return
        gpsStateReceiver = null
        try {
            unregisterReceiver(receiver)
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering gps receiver: ${e.message}")
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Location
    // ---------------------------------------------------------------------------------------------

    private fun startLocationUpdates() {
        stopLocationUpdates()
        try {
            val client = LocationServices.getFusedLocationProviderClient(this)
            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
                .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
                .setMinUpdateDistanceMeters(0f) // stationary fixes still arrive so heartbeats keep flowing
                .setWaitForAccurateLocation(false)
                .build()
            val callback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    result.lastLocation?.let { handleNewLocation(it) }
                }
            }
            client.requestLocationUpdates(request, callback, Looper.getMainLooper())
            fusedLocationClient = client
            locationCallback = callback
            Log.i(TAG, "Fused location updates started (${UPDATE_INTERVAL_MS} ms)")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing for FusedLocationProviderClient", e)
            markPermissionRevoked()
            shutdown(flushBeforeExit = true)
        } catch (e: Exception) {
            // Fused provider unavailable (e.g. no Play services): fall back to the platform LocationManager.
            Log.e(TAG, "Fused provider failed, falling back to LocationManager", e)
            startSystemLocationFallback()
        }
    }

    private fun startSystemLocationFallback() {
        if (locationManager != null && systemLocationListener != null) return
        try {
            val manager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    handleNewLocation(location)
                }

                @Deprecated("Deprecated in Java")
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }
            if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, UPDATE_INTERVAL_MS, 0f, listener, Looper.getMainLooper())
            }
            if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                manager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, UPDATE_INTERVAL_MS, 0f, listener, Looper.getMainLooper())
            }
            locationManager = manager
            systemLocationListener = listener
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing for LocationManager", e)
            markPermissionRevoked()
            shutdown(flushBeforeExit = true)
        } catch (e: Exception) {
            Log.e(TAG, "LocationManager fallback failed", e)
        }
    }

    private fun stopLocationUpdates() {
        try {
            locationCallback?.let { callback -> fusedLocationClient?.removeLocationUpdates(callback) }
            systemLocationListener?.let { listener -> locationManager?.removeUpdates(listener) }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping location updates", e)
        }
        locationCallback = null
        fusedLocationClient = null
        systemLocationListener = null
        locationManager = null
    }

    /** Main thread. Coalesces fixes into uploads: every 5 s while moving, every 30 s while stationary. */
    private fun handleNewLocation(location: Location) {
        if (shuttingDown) return
        if (stopRequested) {
            shutdown(flushBeforeExit = true)
            return
        }

        val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }
        lastMockFlag = isMock
        lastFixEpochMs = System.currentTimeMillis() // heartbeat: recorded for every fix

        val nowElapsed = SystemClock.elapsedRealtime()
        val previous = lastAcceptedLocation
        // "Moved" is measured from the last point we actually kept, so slow drift accumulates.
        val moved = previous == null || previous.distanceTo(location) >= MOVING_DISTANCE_METERS
        val minInterval = if (moved) MOVING_QUEUE_INTERVAL_MS else STATIONARY_QUEUE_INTERVAL_MS
        val queueDue = lastUploadElapsedMs == 0L || nowElapsed - lastUploadElapsedMs >= minInterval

        if (queueDue) {
            lastUploadElapsedMs = nowElapsed
            lastAcceptedLocation = location
            val recordedAt = formatIso8601(Date(location.time.takeIf { it > 0 } ?: System.currentTimeMillis()))
            val waypoint = JSONObject().apply {
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("accuracy", location.accuracy.toDouble())
                put("speed", location.speed.toDouble())
                put("heading", location.bearing.toDouble())
                put("recorded_at", recordedAt)
            }
            Log.d(TAG, "Queue waypoint lat=${location.latitude} lng=${location.longitude} moved=$moved")
            submit { enqueueWaypoint(waypoint) }
            scheduleBatchedFlush(nowElapsed)
        }

        if (nowElapsed - lastTelemetryElapsedMs >= TELEMETRY_INTERVAL_MS) {
            lastTelemetryElapsedMs = nowElapsed
            val currentToken = token
            val currentBase = apiBase
            submit { sendTelemetry(currentToken, currentBase, isMock) }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Offline queue (single upload worker + lock)
    // ---------------------------------------------------------------------------------------------

    private fun submit(task: () -> Unit) {
        if (shuttingDown && !stopRequested) return
        try {
            uploadExecutor.execute {
                try {
                    task()
                } catch (e: Exception) {
                    Log.w(TAG, "Upload task failed: ${e.message}")
                }
            }
        } catch (e: RejectedExecutionException) {
            Log.w(TAG, "Upload worker is shut down; task dropped")
        }
    }

    private fun readQueue(): JSONArray = synchronized(queueLock) {
        try {
            JSONArray(prefs(this).getString(KEY_OFFLINE_WAYPOINTS, "[]") ?: "[]")
        } catch (e: Exception) {
            JSONArray()
        }
    }

    private fun writeQueue(array: JSONArray) = synchronized(queueLock) {
        prefs(this).edit().putString(KEY_OFFLINE_WAYPOINTS, array.toString()).commit()
    }

    private fun enqueueWaypoint(waypoint: JSONObject) {
        synchronized(queueLock) {
            val array = readQueue()
            array.put(waypoint)
            val trimmed = if (array.length() > MAX_OFFLINE_POINTS) {
                JSONArray().also { next ->
                    for (i in (array.length() - MAX_OFFLINE_POINTS) until array.length()) next.put(array.get(i))
                }
            } else {
                array
            }
            writeQueue(trimmed)
        }
    }

    private fun removeFromQueueHead(count: Int) {
        synchronized(queueLock) {
            val array = readQueue()
            val remaining = JSONArray()
            for (i in count until array.length()) remaining.put(array.get(i))
            writeQueue(remaining)
        }
    }

    private fun clearQueue() = writeQueue(JSONArray())

    private fun scheduleFlush() {
        val currentToken = token
        val currentBase = apiBase
        if (currentToken.isEmpty()) return
        submit { flushQueue(currentToken, currentBase) }
    }

    private var lastFlushElapsedMs = 0L
    private var batchedFlushPending = false
    private val batchedFlushRunnable = Runnable {
        batchedFlushPending = false
        lastFlushElapsedMs = SystemClock.elapsedRealtime()
        scheduleFlush()
    }

    /** Main thread. Flushes at most once per [FLUSH_INTERVAL_MS]; a queued point never waits longer than that. */
    private fun scheduleBatchedFlush(nowElapsed: Long) {
        if (batchedFlushPending) return
        val wait = (lastFlushElapsedMs + FLUSH_INTERVAL_MS - nowElapsed).coerceIn(0L, FLUSH_INTERVAL_MS)
        batchedFlushPending = true
        mainHandler.postDelayed(batchedFlushRunnable, wait)
    }

    private fun scheduleBackoff() {
        currentBackoffMs = (currentBackoffMs * 2).coerceIn(BACKOFF_MIN_MS, BACKOFF_MAX_MS)
        retryNotBeforeMs = System.currentTimeMillis() + currentBackoffMs
        Log.w(TAG, "Upload failed; retrying in ${currentBackoffMs / 1000}s")
        mainHandler.post {
            if (shuttingDown) return@post
            mainHandler.removeCallbacks(retryRunnable)
            mainHandler.postDelayed(retryRunnable, currentBackoffMs)
        }
    }

    private fun resetBackoff() {
        currentBackoffMs = 0L
        retryNotBeforeMs = 0L
    }

    /**
     * Upload thread. Drains the queue in batches of up to [MAX_BATCH_SIZE] until empty or failure.
     * 2xx -> remove batch; 400 -> drop batch; 401 -> auth invalid; 409 -> shift ended remotely;
     * 5xx / IOException -> keep and retry with exponential backoff (5 s .. 2 min).
     */
    private enum class Refresh { OK, AUTH_INVALID, FAILED }

    /**
     * Upload thread. Re-fetches the session from the API, which mints a fresh database-direct token.
     * A 401 from the API means the whole session is dead.
     */
    private fun refreshDirectToken(): Refresh {
        if (token.isEmpty()) return Refresh.AUTH_INVALID
        val request = Request.Builder()
            .url("$apiBase/api/auth")
            .get()
            .addHeader("Authorization", "Bearer $token")
            .build()
        return try {
            httpClient.newCall(request).execute().use { response ->
                if (response.code == 401) return Refresh.AUTH_INVALID
                if (!response.isSuccessful) return Refresh.FAILED
                val json = JSONObject(response.body?.string() ?: return Refresh.FAILED)
                val direct = json.optJSONObject("supabase") ?: return Refresh.FAILED
                val url = direct.optString("url"); val anon = direct.optString("anon_key"); val fresh = direct.optString("token")
                if (url.isEmpty() || fresh.isEmpty()) return Refresh.FAILED
                directUrl = url; directAnon = anon; directToken = fresh
                prefs(this).edit().putString(KEY_DIRECT_URL, url).putString(KEY_DIRECT_ANON, anon).putString(KEY_DIRECT_TOKEN, fresh).apply()
                Refresh.OK
            }
        } catch (e: Exception) {
            Refresh.FAILED
        }
    }

    private fun useDirect(): Boolean = directUrl.isNotEmpty() && directToken.isNotEmpty()

    private fun directRequest(fn: String, args: JSONObject): Request =
        Request.Builder()
            .url("$directUrl/rest/v1/rpc/$fn")
            .post(args.toString().toRequestBody(jsonMediaType))
            .addHeader("apikey", directAnon)
            .addHeader("Authorization", "Bearer $directToken")
            .addHeader("Content-Type", "application/json")
            .build()

    private fun flushQueue(token: String, apiBase: String, ignoreBackoff: Boolean = false) {
        if (token.isEmpty()) return
        if (!ignoreBackoff && System.currentTimeMillis() < retryNotBeforeMs) return
        var refreshedOnce = false

        while (true) {
            val queue = readQueue()
            if (queue.length() == 0) return
            val batch = JSONArray()
            for (i in 0 until minOf(queue.length(), MAX_BATCH_SIZE)) batch.put(queue.get(i))

            val direct = useDirect()
            val request = if (direct) {
                directRequest("ingest_waypoints", JSONObject().put("p_points", JSONObject().put("waypoints", batch)))
            } else {
                Request.Builder()
                    .url("$apiBase/api/mobile/waypoints")
                    .post(JSONObject().put("waypoints", batch).toString().toRequestBody(jsonMediaType))
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("Content-Type", "application/json")
                    .build()
            }

            try {
                httpClient.newCall(request).execute().use { response ->
                    when {
                        response.isSuccessful -> {
                            if (direct) {
                                val code = try { JSONObject(response.body?.string() ?: "{}").optString("code") } catch (e: Exception) { "" }
                                if (code == "NO_ACTIVE_SHIFT") {
                                    onShiftEndedRemotely()
                                    return
                                }
                            }
                            removeFromQueueHead(batch.length())
                            resetBackoff()
                            Log.d(TAG, "Uploaded ${batch.length()} waypoint(s)${if (direct) " (direct)" else ""}")
                        }
                        direct && (response.code == 401 || response.code == 403) -> {
                            if (refreshedOnce) { scheduleBackoff(); return }
                            refreshedOnce = true
                            when (refreshDirectToken()) {
                                Refresh.OK -> { /* loop retries the same batch with the new token */ }
                                Refresh.AUTH_INVALID -> { onAuthInvalid(); return }
                                Refresh.FAILED -> { scheduleBackoff(); return }
                            }
                        }
                        response.code == 401 -> {
                            onAuthInvalid()
                            return
                        }
                        response.code == 409 -> {
                            onShiftEndedRemotely()
                            return
                        }
                        response.code in 400..499 -> {
                            Log.w(TAG, "Batch rejected (HTTP ${response.code}); dropping ${batch.length()} point(s)")
                            removeFromQueueHead(batch.length())
                        }
                        else -> {
                            scheduleBackoff()
                            return
                        }
                    }
                }
            } catch (e: IOException) {
                Log.w(TAG, "Network unavailable (${e.message}); ${queue.length()} point(s) kept offline")
                scheduleBackoff()
                return
            } catch (e: Exception) {
                Log.w(TAG, "Upload error: ${e.message}")
                scheduleBackoff()
                return
            }
        }
    }

    private fun onAuthInvalid() {
        Log.w(TAG, "Server returned 401 - session invalid. Stopping tracking and wiping credentials.")
        synchronized(queueLock) {
            prefs(this).edit()
                .putBoolean(KEY_AUTH_INVALID, true)
                .putBoolean(KEY_TRACKING_ACTIVE, false)
                .remove(KEY_TOKEN)
                .remove(KEY_USER_ID)
                .remove(KEY_PUNCH_IN_EPOCH)
                .remove(KEY_DIRECT_TOKEN)
                .putString(KEY_OFFLINE_WAYPOINTS, "[]")
                .commit()
        }
        token = ""
        mainHandler.post { shutdown(flushBeforeExit = false) }
    }

    private fun onShiftEndedRemotely() {
        Log.w(TAG, "Server returned 409 NO_ACTIVE_SHIFT - shift ended elsewhere. Stopping tracking.")
        synchronized(queueLock) {
            prefs(this).edit()
                .putBoolean(KEY_SHIFT_ENDED_REMOTELY, true)
                .putBoolean(KEY_TRACKING_ACTIVE, false)
                .putString(KEY_OFFLINE_WAYPOINTS, "[]")
                .commit()
        }
        mainHandler.post { shutdown(flushBeforeExit = false) }
    }

    private fun markPermissionRevoked() {
        prefs(this).edit()
            .putBoolean(KEY_PERMISSION_REVOKED, true)
            .putBoolean(KEY_TRACKING_ACTIVE, false)
            .apply()
    }

    // ---------------------------------------------------------------------------------------------
    // Telemetry
    // ---------------------------------------------------------------------------------------------

    /** Upload thread. PATCH /api/mobile/attendance with the same telemetry shape as the JS side. */
    private fun sendTelemetry(token: String, apiBase: String, isMock: Boolean) {
        if (token.isEmpty()) return
        val context = this
        val telemetry = JSONObject().apply {
            put("battery_level", DeviceStatus.batteryLevel(context))
            put("battery_status", DeviceStatus.batteryStatus(context))
            put("battery_power_save", DeviceStatus.isPowerSaveMode(context))
            put("developer_options_enabled", DeviceStatus.developerOptionsEnabled(context))
            put("location_services_enabled", DeviceStatus.locationServicesEnabled(context))
            put("location_permission_granted", DeviceStatus.hasFineLocationPermission(context))
            put("background_location_permission_granted", DeviceStatus.hasBackgroundLocationPermission(context))
            put("mock_location_detected", isMock)
            put("updated_at", formatIso8601(Date()))
        }
        val device = JSONObject().apply {
            put("device_model", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
            put("os_version", "Android ${Build.VERSION.RELEASE}")
        }
        val direct = useDirect()
        val request = if (direct) {
            directRequest("device_heartbeat", JSONObject().put("p_telemetry", telemetry).put("p_device", device))
        } else {
            Request.Builder()
                .url("$apiBase/api/mobile/attendance")
                .patch(JSONObject().put("telemetry", telemetry).put("device", device).toString().toRequestBody(jsonMediaType))
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .build()
        }

        try {
            httpClient.newCall(request).execute().use { response ->
                if (direct && (response.code == 401 || response.code == 403)) {
                    if (refreshDirectToken() == Refresh.AUTH_INVALID) onAuthInvalid()
                } else if (response.code == 401) {
                    onAuthInvalid()
                }
            }
        } catch (e: IOException) {
            Log.w(TAG, "Telemetry deferred: ${e.message}")
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------------------------

    /**
     * Main thread. Tears everything down and stops the service. When [flushBeforeExit] is set a
     * final upload of the offline queue is attempted on the worker before it shuts down.
     */
    internal fun shutdown(flushBeforeExit: Boolean) {
        if (shuttingDown) return
        shuttingDown = true
        mainHandler.removeCallbacksAndMessages(null)
        stopLocationUpdates()
        unregisterGpsReceiver()
        releaseWakeLock()

        val finalToken = token
        val finalBase = apiBase
        if (flushBeforeExit && finalToken.isNotEmpty() && !uploadExecutor.isShutdown) {
            try {
                uploadExecutor.execute { flushQueue(finalToken, finalBase, ignoreBackoff = true) }
            } catch (e: RejectedExecutionException) {
                // worker already gone
            }
        }
        uploadExecutor.shutdown() // queued work (the final flush) completes; nothing new is accepted

        try {
            if (isForeground) {
                stopForeground(STOP_FOREGROUND_REMOVE)
                isForeground = false
            } else {
                (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)?.cancel(NOTIFICATION_ID)
            }
        } catch (e: Exception) {
            Log.w(TAG, "stopForeground failed: ${e.message}")
        }
        stopSelf()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        if (!prefs(this).getBoolean(KEY_TRACKING_ACTIVE, false) || stopRequested) return
        Log.w(TAG, "App task removed while on duty - scheduling service restart.")
        val restartIntent = Intent(applicationContext, PerzentLocationService::class.java).apply { action = ACTION_START }
        val pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(
                applicationContext, 101, restartIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            PendingIntent.getService(
                applicationContext, 101, restartIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
        }
        try {
            (getSystemService(Context.ALARM_SERVICE) as? AlarmManager)?.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + 1000,
                pendingIntent
            )
        } catch (e: Exception) {
            Log.w(TAG, "Could not schedule restart alarm: ${e.message}")
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "PerzentLocationService onDestroy")
        if (instance === this) instance = null
        mainHandler.removeCallbacksAndMessages(null)
        stopLocationUpdates()
        unregisterGpsReceiver()
        releaseWakeLock()

        val p = prefs(this)
        if (stopRequested || !p.getBoolean(KEY_TRACKING_ACTIVE, false)) {
            // Destroyed after a stop (not a system kill mid-shift): credentials must not outlive the shift.
            p.edit().remove(KEY_TOKEN).remove(KEY_USER_ID).remove(KEY_PUNCH_IN_EPOCH).apply()
        }
        if (!uploadExecutor.isShutdown) uploadExecutor.shutdown()
        super.onDestroy()
    }

    // ---------------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------------

    private fun formatIso8601(date: Date): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(date)
    }

    private fun formatElapsed(ms: Long): String {
        val totalSeconds = (ms / 1000).coerceAtLeast(0)
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        return String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds)
    }
}
