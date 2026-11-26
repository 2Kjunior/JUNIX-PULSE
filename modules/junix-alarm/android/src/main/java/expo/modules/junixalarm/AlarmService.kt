package expo.modules.junixalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import org.json.JSONObject

/**
 * The alarm that keeps ringing (study 001, 16.9; sheet 034). A service in the foreground plays the
 * alarm sound in a loop on the alarm volume of the phone (so it rings in silent mode, as the
 * phone's alarm clock), the volume rising over 20 seconds, with the vibration. Its notification
 * has "Arrêter" and "Plus tard" (10 minutes). Without a gesture it stops after 5 minutes and
 * leaves "Alarme manquée". The full-screen page comes with sheet 035.
 */
class AlarmService : Service() {
  companion object {
    const val ACTION_RING = "expo.modules.junixalarm.ACTION_RING"
    const val ACTION_STOP = "expo.modules.junixalarm.ACTION_STOP"
    const val ACTION_SNOOZE = "expo.modules.junixalarm.ACTION_SNOOZE"
    const val EXTRA_ALARM = "expo.modules.junixalarm.ALARM"

    const val RINGING_CHANNEL = "junix-pulse-alarm-ringing-v1"
    const val MISSED_CHANNEL = "junix-pulse-alarm-missed-v1"
    private const val RINGING_ID = 4_201

    /** How long it rings without a gesture, and how long "Plus tard" waits. */
    const val RING_LIMIT_MS = 5 * 60 * 1000L
    const val SNOOZE_MS = 10 * 60 * 1000L
    /** The volume rises from this to full in RAMP_MS. */
    private const val RAMP_START = 0.15f
    private const val RAMP_MS = 20_000L

    /** The alarm ringing now, if any: read by the module (and the page of sheet 035). */
    @Volatile
    var current: AlarmItem? = null
      private set
  }

  private val handler = Handler(Looper.getMainLooper())
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var rampStartedAt = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val alarm = intent?.getStringExtra(EXTRA_ALARM)?.let { AlarmItem.fromJson(JSONObject(it)) } ?: current
    when (intent?.action) {
      ACTION_RING -> if (alarm != null) ring(alarm) else stopSelf()
      ACTION_SNOOZE -> {
        if (alarm != null) snooze(alarm)
        stopRinging()
      }
      else -> stopRinging()
    }
    return START_NOT_STICKY
  }

  private fun ring(alarm: AlarmItem) {
    // A new alarm while one rings: the new one takes its place
    stopSound()
    current = alarm
    createChannels()
    val notification = ringingNotification(alarm)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(RINGING_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(RINGING_ID, notification)
    }
    holdWakeLock()
    playSound(alarm.sound)
    vibrate()
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({ missed(alarm) }, RING_LIMIT_MS)
  }

  // ─── Sound and vibration ───────────────────────────────────────────────────

  private val alarmAudio: AudioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_ALARM)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()

  private fun playSound(sound: String) {
    if (sound.isEmpty()) return
    val resource = resources.getIdentifier(sound, "raw", packageName)
    if (resource == 0) return
    try {
      val media = MediaPlayer()
      media.setAudioAttributes(alarmAudio)
      media.setDataSource(this, Uri.parse("android.resource://$packageName/$resource"))
      media.isLooping = true
      media.setVolume(RAMP_START, RAMP_START)
      media.prepare()
      media.start()
      player = media
      rampStartedAt = System.currentTimeMillis()
      handler.post(object : Runnable {
        override fun run() {
          val active = player ?: return
          val progress = ((System.currentTimeMillis() - rampStartedAt).toFloat() / RAMP_MS).coerceIn(0f, 1f)
          val volume = RAMP_START + (1f - RAMP_START) * progress
          active.setVolume(volume, volume)
          if (progress < 1f) handler.postDelayed(this, 1_000L)
        }
      })
    } catch (error: Exception) {
      // A sound that cannot play: the vibration and the notification still warn
      player = null
    }
  }

  private fun vibrate() {
    val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    vibrator = device
    val pattern = longArrayOf(0, 800, 600)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION")
      device.vibrate(VibrationEffect.createWaveform(pattern, 0), alarmAudio)
    } else {
      @Suppress("DEPRECATION")
      device.vibrate(pattern, 0)
    }
  }

  private fun holdWakeLock() {
    if (wakeLock?.isHeld == true) return
    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JunixPulse:alarm").apply {
      setReferenceCounted(false)
      acquire(RING_LIMIT_MS + 30_000L)
    }
  }

  private fun stopSound() {
    handler.removeCallbacksAndMessages(null)
    player?.let {
      try {
        it.stop()
      } catch (error: Exception) {
        // Already stopped
      }
      it.release()
    }
    player = null
    vibrator?.cancel()
    vibrator = null
  }

  private fun stopRinging() {
    stopSound()
    current = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE) else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  override fun onDestroy() {
    stopSound()
    current = null
    wakeLock?.let { if (it.isHeld) it.release() }
    super.onDestroy()
  }

  // ─── Plus tard, and the alarm nobody stopped ─────────────────────────────────

  private fun snooze(alarm: AlarmItem) {
    // Its own group: a sync of the app never removes an alarm put off by a gesture
    val later = alarm.copy(id = "${alarm.id}-later", group = "snooze", at = System.currentTimeMillis() + SNOOZE_MS)
    AlarmStore.put(this, later)
    AlarmScheduler.schedule(this, later)
  }

  private fun missed(alarm: AlarmItem) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val builder = builder(MISSED_CHANNEL)
      .setSmallIcon(smallIcon())
      .setContentTitle(alarm.missedTitle)
      .setContentText(alarm.title)
      .setAutoCancel(true)
      .setContentIntent(openIntent(alarm))
    manager.notify(alarm.id.hashCode(), builder.build())
    stopRinging()
  }

  // ─── Notifications ───────────────────────────────────────────────────────────

  private fun createChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val name = current?.channelName ?: "Alarms"
    // The sound is played by the service, on the alarm volume: the channel itself stays silent
    val ringing = NotificationChannel(RINGING_CHANNEL, name, NotificationManager.IMPORTANCE_HIGH).apply {
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setShowBadge(false)
    }
    val missedChannel = NotificationChannel(MISSED_CHANNEL, current?.missedTitle ?: "Missed alarms", NotificationManager.IMPORTANCE_DEFAULT).apply {
      setShowBadge(true)
    }
    manager.createNotificationChannel(ringing)
    manager.createNotificationChannel(missedChannel)
  }

  private fun builder(channel: String): Notification.Builder =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, channel)
    else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

  private fun smallIcon(): Int {
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName)
    return if (icon != 0) icon else applicationInfo.icon
  }

  private fun actionIntent(action: String, alarm: AlarmItem): PendingIntent {
    val intent = Intent(this, AlarmActionReceiver::class.java)
      .setAction(action)
      .putExtra(EXTRA_ALARM, alarm.toJson().toString())
    return PendingIntent.getBroadcast(this, (action + alarm.id).hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** Touching the notification: the thing in Junix (its link), or else the app. */
  private fun openIntent(alarm: AlarmItem): PendingIntent? {
    val open = if (alarm.url.isNotEmpty()) {
      Intent(Intent.ACTION_VIEW, Uri.parse(alarm.url)).setPackage(packageName)
    } else {
      packageManager.getLaunchIntentForPackage(packageName)
    } ?: return null
    open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(this, alarm.id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun ringingNotification(alarm: AlarmItem): Notification {
    val stop = Notification.Action.Builder(null, alarm.stopLabel, actionIntent(ACTION_STOP, alarm)).build()
    val later = Notification.Action.Builder(null, alarm.snoozeLabel, actionIntent(ACTION_SNOOZE, alarm)).build()
    return builder(RINGING_CHANNEL)
      .setSmallIcon(smallIcon())
      .setContentTitle(alarm.title)
      .setContentText(alarm.body)
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(openIntent(alarm))
      .addAction(stop)
      .addAction(later)
      .build()
  }
}
