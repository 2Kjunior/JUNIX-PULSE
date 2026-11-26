package expo.modules.junixalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * The time of an alarm (sheet 034): Android wakes this receiver, which starts the ringing service.
 * Starting a service from the background is allowed here: an exact alarm the person asked for.
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: return
    val alarm = AlarmStore.get(context, id) ?: return
    // It rings now: it is no longer planned
    AlarmStore.remove(context, id)
    val ring = Intent(context, AlarmService::class.java)
      .setAction(AlarmService.ACTION_RING)
      .putExtra(AlarmService.EXTRA_ALARM, alarm.toJson().toString())
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(ring) else context.startService(ring)
  }
}

/** "Arrêter" and "Plus tard" of the notification: the service stops, and "Plus tard" plans it again. */
class AlarmActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = Intent(context, AlarmService::class.java).setAction(intent.action)
    intent.getStringExtra(AlarmService.EXTRA_ALARM)?.let { action.putExtra(AlarmService.EXTRA_ALARM, it) }
    // The service is running in the foreground: it can be reached from here
    context.startService(action)
  }
}

/** The phone restarted, or Junix was updated: Android forgot the alarms, they are planned again. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      AlarmScheduler.rescheduleAll(context)
    }
  }
}
