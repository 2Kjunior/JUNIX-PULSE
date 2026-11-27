package expo.modules.junixalarm

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns

/**
 * The musics of the phone (study 001, 16.10; sheets 037 and 039): their names, hearing one before
 * choosing it, and the channels of Android that ring them for the ordinary notifications. The
 * choosing itself goes through the picker of files of Android, opened by the module.
 */
object DeviceSounds {
  private var preview: MediaPlayer? = null
  private val handler = Handler(Looper.getMainLooper())

  /** The name of a file of music ("Mon titre.mp3"), without its extension. */
  fun fileTitle(context: Context, uri: Uri): String {
    val name = try {
      context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) cursor.getString(0) else null
      }
    } catch (error: Exception) {
      null
    } ?: return ""
    return name.substringBeforeLast('.', name)
  }

  /** Plays a sound of the phone for a few seconds, on the alarm volume; a new one stops the last. */
  fun preview(context: Context, uri: Uri, durationMs: Long): Boolean {
    stopPreview()
    val media = MediaPlayer()
    return try {
      media.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      media.setDataSource(context, uri)
      media.prepare()
      media.start()
      preview = media
      handler.postDelayed({ stopPreview() }, durationMs)
      true
    } catch (error: Exception) {
      media.release()
      false
    }
  }

  /**
   * The channels of the musics of the phone for the discreet and normal notifications (sheet 039):
   * a channel's sound is fixed when it is made, so each music has its own. The ones not listed are
   * removed; those of Junix and of the alarms are never touched.
   */
  fun syncChannels(context: Context, channels: List<Map<String, Any?>>) {
    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
    val kept = mutableSetOf<String>()
    for (channel in channels) {
      val id = channel["id"] as? String ?: continue
      val uri = channel["uri"] as? String ?: continue
      if (!id.startsWith(PHONE_CHANNEL_PREFIX)) continue
      val level = channel["level"] as? String ?: "normal"
      val insists = channel["insists"] as? Boolean ?: false
      val made = android.app.NotificationChannel(
        id,
        channel["name"] as? String ?: id,
        if (level == "discreet") android.app.NotificationManager.IMPORTANCE_DEFAULT else android.app.NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = channel["description"] as? String ?: ""
        setSound(
          Uri.parse(uri),
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        enableVibration(level != "discreet")
        vibrationPattern = if (insists) longArrayOf(0, 500, 200, 500, 200, 500, 200, 500) else longArrayOf(0, 250, 250, 250)
        lightColor = 0xFF8B3DF0.toInt()
        setShowBadge(false)
      }
      manager.createNotificationChannel(made)
      kept.add(id)
    }
    for (old in manager.notificationChannels) {
      if (old.id.startsWith(PHONE_CHANNEL_PREFIX) && old.id !in kept) manager.deleteNotificationChannel(old.id)
    }
  }

  private const val PHONE_CHANNEL_PREFIX = "junix-pulse-phone-"

  fun stopPreview() {
    handler.removeCallbacksAndMessages(null)
    preview?.let {
      try {
        it.stop()
      } catch (error: Exception) {
        // Already stopped
      }
      it.release()
    }
    preview = null
  }
}
