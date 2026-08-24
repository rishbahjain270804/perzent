package app.jspcoders.perzent

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.PowerManager
import android.provider.Settings
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
      val batteryManager = reactContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
      val batteryIntent = reactContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
      val batteryStatus = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
      val charging = batteryStatus == BatteryManager.BATTERY_STATUS_CHARGING ||
        batteryStatus == BatteryManager.BATTERY_STATUS_FULL
      val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
      val developerOptionsEnabled = Settings.Global.getInt(
        reactContext.contentResolver,
        Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
        0
      ) == 1

      val result = Arguments.createMap().apply {
        putDouble("batteryLevel", batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).toDouble())
        putBoolean("batteryCharging", charging)
        putBoolean("powerSaveMode", powerManager.isPowerSaveMode)
        putBoolean("developerOptionsEnabled", developerOptionsEnabled)
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("DEVICE_INTEGRITY_ERROR", "Unable to inspect device compliance", error)
    }
  }
}
