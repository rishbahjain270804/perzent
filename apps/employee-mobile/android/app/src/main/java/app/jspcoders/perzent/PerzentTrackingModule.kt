package app.jspcoders.perzent

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PerzentTrackingModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PerzentBackgroundTracking"

    @ReactMethod
    fun startTracking(token: String, userId: String, apiBaseUrl: String, promise: Promise) {
        try {
            PerzentLocationService.startService(reactContext, token, userId, apiBaseUrl)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TRACKING_START_ERROR", "Failed to start background tracking service", e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            PerzentLocationService.stopService(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TRACKING_STOP_ERROR", "Failed to stop background tracking service", e)
        }
    }

    @ReactMethod
    fun isTrackingActive(promise: Promise) {
        try {
            val active = PerzentLocationService.isTracking(reactContext)
            promise.resolve(active)
        } catch (e: Exception) {
            promise.reject("TRACKING_STATUS_ERROR", "Failed to get tracking status", e)
        }
    }
}
