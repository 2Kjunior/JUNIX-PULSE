package expo.modules.junixalarm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.app.Activity
import expo.modules.kotlin.Promise
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

  // ─── A sound of the phone (sheet 037): a page of Android answers later ─────────
  private companion object {
    const val PICK_MUSIC = 4_212
  }

  /** The promise of the page of Android open now, answered when it closes. */
  private var pending: Promise? = null

  private fun open(intent: Intent, requestCode: Int, promise: Promise) {
    if (pending != null) {
      promise.resolve(null)
      return
    }
    pending = promise
    try {
      appContext.throwingActivity.startActivityForResult(intent, requestCode)
    } catch (error: Exception) {
      pending = null
      promise.resolve(null)
    }
  }

  /** The choice made: its address, its name, and whether it is a ringtone or a music. */
  private fun picked(uri: Uri, kind: String): Map<String, String> {
    val name = DeviceSounds.fileTitle(context, uri)
    return mapOf("uri" to uri.toString(), "name" to name, "kind" to kind)
  }

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

    /** Whether the page of the alarm may light the locked screen (sheet 035). */
    Function("canUseFullScreen") {
      AlarmService.canUseFullScreen(context)
    }

    /**
     * Opens the page of Android where the person allows it (Android 14 and later); before, the
     * permission is given at install, and the settings of the notifications of the app open.
     */
    Function("openFullScreenSettings") {
      val intent = if (Build.VERSION.SDK_INT >= 34) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + context.packageName))
      } else {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(intent)
        true
      } catch (error: Exception) {
        false
      }
    }

    /** The channels of the musics of the phone for the ordinary notifications (sheet 039). */
    Function("syncPhoneChannels") { channels: List<Map<String, Any?>> ->
      DeviceSounds.syncChannels(context, channels)
    }

    /**
     * A file of music, from the picker of Android; the app keeps the right to read it (it rings
     * long after, appli fermée). null when nothing is chosen.
     */
    AsyncFunction("pickMusic") { promise: Promise ->
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
        .addCategory(Intent.CATEGORY_OPENABLE)
        .setType("audio/*")
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
      open(intent, PICK_MUSIC, promise)
    }

    /** Plays a sound of the phone a few seconds, to hear it before choosing it. */
    Function("previewUri") { uri: String, durationMs: Int ->
      DeviceSounds.preview(context, Uri.parse(uri), durationMs.toLong())
    }

    Function("stopPreview") {
      DeviceSounds.stopPreview()
    }

    OnActivityResult { _, payload ->
      val promise = pending ?: return@OnActivityResult
      if (payload.requestCode != PICK_MUSIC) return@OnActivityResult
      pending = null
      if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
        promise.resolve(null)
        return@OnActivityResult
      }
      val uri = payload.data!!.data
      if (uri == null) {
        promise.resolve(null)
      } else {
        try {
          context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        } catch (error: Exception) {
          // Some pickers give no lasting right: the alarm will fall back on the sound of Junix
        }
        promise.resolve(picked(uri, "music"))
      }
    }

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
        context.startService(Intent(context, AlarmService::class.java).setAction(AlarmService.ACTION_STOP))
      }
    }
  }
}
