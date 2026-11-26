package expo.modules.junixalarm

import android.content.Context
import android.content.Intent
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * What the app sees of the alarm (sheet 034): it hands over the alarms of a group (reminders,
 * tasks and moments, habits), and can stop the one ringing. Everything else happens in Android.
 */
class JunixAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("JunixAlarm")

    /** The alarms of one group become exactly these; the past ones are dropped. */
    AsyncFunction("replaceGroup") { group: String, alarms: List<Map<String, Any?>> ->
      val items = alarms.mapNotNull { AlarmItem.fromMap(it) }.map { it.copy(group = group) }
      AlarmScheduler.replaceGroup(context, group, items)
      items.size
    }

    /** The ids of the alarms planned (for the checks of the app). */
    Function("plannedIds") {
      AlarmStore.all(context).map { it.id }
    }

    /** Whether the alarms ring at the minute (the "exact alarms" permission). */
    Function("canScheduleExact") {
      AlarmScheduler.canScheduleExact(context)
    }

    /** The id of the alarm ringing now, or null. */
    Function("ringingId") {
      AlarmService.current?.id
    }

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
        context.startService(Intent(context, AlarmService::class.java).setAction(AlarmService.ACTION_STOP))
      }
    }
  }
}
