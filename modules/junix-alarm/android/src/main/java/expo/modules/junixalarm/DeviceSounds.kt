package expo.modules.junixalarm

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns

/**
 * The sounds of the phone for the alarms (study 001, 16.10; sheet 037): their names, and hearing
 * one before choosing it. The choosing itself goes through the pages of Android (the list of the
 * ringtones, the picker of files), opened by the module.
 */
object DeviceSounds {
  private var preview: MediaPlayer? = null
  private val handler = Handler(Looper.getMainLooper())

  /** The name of a ringtone, as Android shows it ("Argon"); empty when unknown. */
  fun ringtoneTitle(context: Context, uri: Uri): String =
    try {
      RingtoneManager.getRingtone(context, uri)?.getTitle(context) ?: ""
    } catch (error: Exception) {
      ""
    }

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
