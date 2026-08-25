package app.jspcoders.perzent

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
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
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class PerzentLocationService : Service() {

    companion object {
        const val TAG = "PerzentLocationService"
        const val NOTIFICATION_CHANNEL_ID = "perzent_duty_tracking_v1"
        const val NOTIFICATION_ID = 99881
        const val PREFS_NAME = "perzent_service_prefs"
        const val KEY_TOKEN = "auth_token"
        const val KEY_USER_ID = "user_id"
        const val KEY_API_BASE = "api_base_url"
        const val KEY_TRACKING_ACTIVE = "tracking_active"

        const val ACTION_START = "app.jspcoders.perzent.ACTION_START_TRACKING"
        const val ACTION_STOP = "app.jspcoders.perzent.ACTION_STOP_TRACKING"

        const val UPDATE_INTERVAL_MS = 15_000L // 15 seconds
        const val FASTEST_INTERVAL_MS = 10_000L // 10 seconds

        fun startService(context: Context, token: String, userId: String, apiBase: String = "https://perzent.vercel.app") {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString(KEY_TOKEN, token)
                .putString(KEY_USER_ID, userId)
                .putString(KEY_API_BASE, apiBase)
                .putBoolean(KEY_TRACKING_ACTIVE, true)
                .apply()

            val intent = Intent(context, PerzentLocationService::class.java).apply {
                action = ACTION_START
                putExtra(KEY_TOKEN, token)
                putExtra(KEY_USER_ID, userId)
                putExtra(KEY_API_BASE, apiBase)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_TRACKING_ACTIVE, false).apply()

            val intent = Intent(context, PerzentLocationService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }

        fun isTracking(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_TRACKING_ACTIVE, false)
        }
    }

    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var locationManager: LocationManager? = null
    private var systemLocationListener: LocationListener? = null

    private var wakeLock: PowerManager.WakeLock? = null
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private var lastTelemetrySendTime = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "PerzentLocationService onCreate")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        if (action == ACTION_STOP) {
            Log.i(TAG, "Received ACTION_STOP - Stopping foreground tracking")
            stopTracking()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = intent?.getStringExtra(KEY_TOKEN) ?: prefs.getString(KEY_TOKEN, null)
        val userId = intent?.getStringExtra(KEY_USER_ID) ?: prefs.getString(KEY_USER_ID, null)
        val apiBase = intent?.getStringExtra(KEY_API_BASE) ?: prefs.getString(KEY_API_BASE, "https://perzent.vercel.app")

        if (token.isNullOrEmpty() || userId.isNullOrEmpty()) {
            Log.w(TAG, "No valid credentials found in SharedPreferences or Intent. Terminating service.")
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = buildForegroundNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        acquireWakeLock()
        startLocationUpdates(token, userId, apiBase ?: "https://perzent.vercel.app")

        return START_STICKY
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Perzent:DutyTrackingWakeLock").apply {
                setReferenceCounted(false)
                acquire(24 * 60 * 60 * 1000L)
            }
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wake lock", e)
        }
        wakeLock = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Work Shift & Duty Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active shift tracking and real-time location sync"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
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
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Perzent • On Duty Active")
            .setContentText("Continuous shift tracking active • GPS sync on")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun startLocationUpdates(token: String, userId: String, apiBase: String) {
        stopLocationUpdates()

        try {
            fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
                .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
                .setMaxUpdateDelayMillis(UPDATE_INTERVAL_MS)
                .setWaitForAccurateLocation(false)
                .build()

            locationCallback = object : LocationCallback() {
                override fun onLocationResult(locationResult: LocationResult) {
                    val location = locationResult.lastLocation ?: return
                    handleNewLocation(location, token, userId, apiBase)
                }
            }

            fusedLocationClient?.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                Looper.getMainLooper()
            )
            Log.i(TAG, "FusedLocationProvider updates registered successfully")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing for FusedLocationProvider", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting FusedLocationProvider, falling back to LocationManager", e)
            startSystemLocationFallback(token, userId, apiBase)
        }
    }

    private fun startSystemLocationFallback(token: String, userId: String, apiBase: String) {
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            systemLocationListener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    handleNewLocation(location, token, userId, apiBase)
                }
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }

            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    UPDATE_INTERVAL_MS,
                    0f,
                    systemLocationListener!!,
                    Looper.getMainLooper()
                )
            }
            if (locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    UPDATE_INTERVAL_MS,
                    0f,
                    systemLocationListener!!,
                    Looper.getMainLooper()
                )
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission missing for LocationManager", e)
        }
    }

    private fun handleNewLocation(location: Location, token: String, userId: String, apiBase: String) {
        val nowIso = formatIso8601(Date(location.time.takeIf { it > 0 } ?: System.currentTimeMillis()))
        val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }

        Log.d(TAG, "GPS fix: lat=${location.latitude}, lng=${location.longitude}, acc=${location.accuracy}, mock=$isMock")

        Thread {
            try {
                val waypointJson = JSONObject().apply {
                    put("latitude", location.latitude)
                    put("longitude", location.longitude)
                    put("accuracy", location.accuracy.toDouble())
                    put("speed", location.speed.toDouble())
                    put("heading", location.bearing.toDouble())
                    put("recorded_at", nowIso)
                }

                val mediaType = "application/json; charset=utf-8".toMediaType()
                val requestBody = waypointJson.toString().toRequestBody(mediaType)

                val request = Request.Builder()
                    .url("$apiBase/api/mobile/waypoints")
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("Content-Type", "application/json")
                    .build()

                val response = httpClient.newCall(request).execute()
                Log.d(TAG, "Waypoint POST response: code=${response.code}")
                response.close()
            } catch (e: Exception) {
                Log.w(TAG, "Failed to send waypoint to server: ${e.message}")
            }

            val nowMs = System.currentTimeMillis()
            if (nowMs - lastTelemetrySendTime > 60_000L) {
                lastTelemetrySendTime = nowMs
                try {
                    sendTelemetry(token, apiBase, isMock)
                } catch (e: Exception) {
                    Log.w(TAG, "Telemetry send error: ${e.message}")
                }
            }
        }.start()
    }

    private fun sendTelemetry(token: String, apiBase: String, isMock: Boolean) {
        val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager

        val telemetryObj = JSONObject().apply {
            put("battery_level", batteryLevel)
            put("battery_power_save", powerManager.isPowerSaveMode)
            put("mock_location_detected", isMock)
            put("location_services_enabled", true)
            put("location_permission_granted", true)
            put("updated_at", formatIso8601(Date()))
        }

        val rootObj = JSONObject().apply {
            put("telemetry", telemetryObj)
        }

        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = rootObj.toString().toRequestBody(mediaType)

        val request = Request.Builder()
            .url("$apiBase/api/mobile/attendance")
            .patch(requestBody)
            .addHeader("Authorization", "Bearer $token")
            .addHeader("Content-Type", "application/json")
            .build()

        val response = httpClient.newCall(request).execute()
        response.close()
    }

    private fun formatIso8601(date: Date): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(date)
    }

    private fun stopLocationUpdates() {
        try {
            if (locationCallback != null && fusedLocationClient != null) {
                fusedLocationClient?.removeLocationUpdates(locationCallback!!)
                locationCallback = null
            }
            if (systemLocationListener != null && locationManager != null) {
                locationManager?.removeUpdates(systemLocationListener!!)
                systemLocationListener = null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping location updates", e)
        }
    }

    private fun stopTracking() {
        stopLocationUpdates()
        releaseWakeLock()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.w(TAG, "App task removed from recent menu! Re-scheduling service survival.")

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val isActive = prefs.getBoolean(KEY_TRACKING_ACTIVE, false)

        if (isActive) {
            val restartIntent = Intent(applicationContext, PerzentLocationService::class.java).apply {
                action = ACTION_START
            }
            val pendingIntent = PendingIntent.getService(
                applicationContext,
                101,
                restartIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + 1000,
                pendingIntent
            )
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "PerzentLocationService onDestroy")
        stopTracking()
        super.onDestroy()
    }
}
