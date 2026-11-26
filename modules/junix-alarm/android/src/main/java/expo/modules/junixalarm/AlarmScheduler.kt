package expo.modules.junixalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Plans the alarms with Android (sheet 034). setAlarmClock rings at the minute, even when the phone
 * sleeps, and shows the alarm clock in the status bar. Without the "exact alarms" permission it
 * cannot be used: the alarm is then planned as close as Android allows, rather than lost.
 */
object AlarmScheduler {
  const val EXTRA_ID = "expo.modules.junixalarm.ID"

  private fun ringIntent(context: Context, id: String): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).putExtra(EXTRA_ID, id)
    // The id in the action keeps one PendingIntent for each alarm
    intent.action = "expo.modules.junixalarm.RING.$id"
    return PendingIntent.getBroadcast(
      context,
      id.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  /** What the alarm clock of the status bar opens: the app. */
  private fun showIntent(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return manager.canScheduleExactAlarms()
  }

  fun schedule(context: Context, alarm: AlarmItem) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = ringIntent(context, alarm.id)
    try {
      if (canScheduleExact(context)) {
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(alarm.at, showIntent(context)), operation)
      } else {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, operation)
      }
    } catch (error: SecurityException) {
      // The permission was taken back between the check and the call
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, operation)
    }
  }

  fun cancel(context: Context, id: String) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    manager.cancel(ringIntent(context, id))
  }

  /**
   * The alarms of one group become exactly these (the others stay): the ones gone are cancelled,
   * the others planned again. The past ones are dropped.
   */
  fun replaceGroup(context: Context, group: String, alarms: List<AlarmItem>) {
    val now = System.currentTimeMillis()
    val kept = AlarmStore.all(context).filter { it.group != group }
    AlarmStore.all(context).filter { it.group == group }.forEach { cancel(context, it.id) }
    val future = alarms.filter { it.at > now }
    future.forEach { schedule(context, it) }
    AlarmStore.saveAll(context, kept + future)
  }

  /** After a restart: every alarm still to come is planned again; the past ones are dropped. */
  fun rescheduleAll(context: Context) {
    val now = System.currentTimeMillis()
    val future = AlarmStore.all(context).filter { it.at > now }
    future.forEach { schedule(context, it) }
    AlarmStore.saveAll(context, future)
  }
}
