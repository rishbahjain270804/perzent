package app.jspcoders.perzent

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceIntegrityModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DeviceIntegrity"

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      val result = Arguments.createMap().apply {
        putDouble("batteryLevel", DeviceStatus.batteryLevel(reactContext).toDouble())
        putBoolean("batteryCharging", DeviceStatus.isCharging(reactContext))
        putString("batteryStatus", DeviceStatus.batteryStatus(reactContext))
        putBoolean("powerSaveMode", DeviceStatus.isPowerSaveMode(reactContext))
        putBoolean("developerOptionsEnabled", DeviceStatus.developerOptionsEnabled(reactContext))
        putBoolean("locationServicesEnabled", DeviceStatus.locationServicesEnabled(reactContext))
        putBoolean("locationPermissionGranted", DeviceStatus.hasFineLocationPermission(reactContext))
        putBoolean("backgroundLocationPermissionGranted", DeviceStatus.hasBackgroundLocationPermission(reactContext))
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("DEVICE_INTEGRITY_ERROR", "Unable to inspect device compliance", error)
    }
  }
}
