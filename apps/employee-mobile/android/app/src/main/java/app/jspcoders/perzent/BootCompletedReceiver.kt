package app.jspcoders.perzent

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Restarts live-location tracking after a reboot when a shift was still open.
 *
 * Android delivers BOOT_COMPLETED after the user's first unlock, so the credential-encrypted
 * preferences written by [PerzentLocationService] are readable here. Starting a *location*
 * foreground service from this broadcast is permitted on Android 15+ (only dataSync/media/camera
 * types are restricted).
 */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return

        val prefs = PerzentLocationService.prefs(context)
        val active = prefs.getBoolean(PerzentLocationService.KEY_TRACKING_ACTIVE, false)
        val hasToken = !prefs.getString(PerzentLocationService.KEY_TOKEN, null).isNullOrEmpty()
        if (!active || !hasToken) {
            Log.i(PerzentLocationService.TAG, "Boot: no open shift to resume (active=$active, token=$hasToken)")
            return
        }
        if (!DeviceStatus.hasFineLocationPermission(context)) {
            Log.w(PerzentLocationService.TAG, "Boot: location permission missing, tracking not resumed")
            return
        }

        Log.i(PerzentLocationService.TAG, "Boot: resuming live-location tracking for the open shift")
        val serviceIntent = Intent(context, PerzentLocationService::class.java).apply {
            this.action = PerzentLocationService.ACTION_START
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.w(PerzentLocationService.TAG, "Boot: could not restart tracking: ${e.message}")
        }
    }
}
