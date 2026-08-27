package app.jspcoders.perzent

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PerzentTrackingModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PerzentBackgroundTracking"

    @ReactMethod
    fun startTracking(
        token: String?, userId: String?, apiBaseUrl: String?, punchInEpochMs: Double,
        directUrl: String?, directAnonKey: String?, directToken: String?, promise: Promise
    ) {
        try {
            val safeToken = token ?: ""
            val safeUserId = userId ?: ""
            val safeApiBase = if (apiBaseUrl.isNullOrBlank() || apiBaseUrl == "undefined") {
                PerzentLocationService.DEFAULT_API_BASE
            } else {
                apiBaseUrl
            }
            val punchIn = if (punchInEpochMs.isFinite() && punchInEpochMs > 0) punchInEpochMs.toLong() else System.currentTimeMillis()
            val clean = { v: String? -> if (v.isNullOrBlank() || v == "undefined" || v == "null") "" else v }
            PerzentLocationService.startService(
                reactContext, safeToken, safeUserId, safeApiBase, punchIn,
                clean(directUrl), clean(directAnonKey), clean(directToken)
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TRACKING_START_ERROR", "Failed to start background tracking service", e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        // stopService never throws; it is safe from any app state.
        PerzentLocationService.stopService(reactContext)
        promise.resolve(true)
    }

    @ReactMethod
    fun isTrackingActive(promise: Promise) {
        try {
            promise.resolve(PerzentLocationService.isTracking(reactContext))
        } catch (e: Exception) {
            promise.reject("TRACKING_STATUS_ERROR", "Failed to get tracking status", e)
        }
    }

    /** Flags raised by the native service while JS was asleep (401 / 409 / permission revoked). */
    @ReactMethod
    fun getTrackingState(promise: Promise) {
        try {
            val state = PerzentLocationService.getState(reactContext)
            val map = Arguments.createMap().apply {
                putBoolean("tracking_active", state.trackingActive)
                putBoolean("auth_invalid", state.authInvalid)
                putBoolean("shift_ended_remotely", state.shiftEndedRemotely)
                putBoolean("permission_revoked", state.permissionRevoked)
                putDouble("last_fix_epoch", state.lastFixEpochMs.toDouble())
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("TRACKING_STATE_ERROR", "Failed to read tracking state", e)
        }
    }

    @ReactMethod
    fun clearFlags(promise: Promise) {
        try {
            PerzentLocationService.clearFlags(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TRACKING_FLAGS_ERROR", "Failed to clear tracking flags", e)
        }
    }
}
