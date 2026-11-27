package expo.modules.junixalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
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
    /** Sent inside the app when the ringing stops: the page of the alarm closes (sheet 035). */
    const val ACTION_ENDED = "expo.modules.junixalarm.ACTION_ENDED"

    /** The icon of the notifications of Junix, declared by the app (as expo-notifications reads it). */
    fun smallIconOf(context: Context): Int {
      val declared = try {
        context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
          .metaData?.getInt("expo.modules.notifications.default_notification_icon", 0) ?: 0
      } catch (error: Exception) {
        0
      }
      if (declared != 0) return declared
      val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
      return if (icon != 0) icon else context.applicationInfo.icon
    }

    /** Whether Android lets the page of the alarm light the locked screen (Android 14 asks the person). */
    fun canUseFullScreen(context: Context): Boolean {
      if (Build.VERSION.SDK_INT < 34) return true
      return (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
    }

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
    // The app open on the screen: the page of the alarm shows at once (sheet 035); otherwise the
    // full-screen intent of the notification lights the screen, when Android allows it
    if (appInForeground()) showPage(alarm)
    playSound(alarm.sound, alarm.soundUri)
    vibrate()
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({ missed(alarm) }, RING_LIMIT_MS)
  }

  // ─── Sound and vibration ───────────────────────────────────────────────────

  private val alarmAudio: AudioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_ALARM)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()

  /**
   * The sound of the phone first (a ringtone, a music: sheet 037), then the sound of Junix: a music
   * deleted or no longer readable never leaves the alarm silent.
   */
  private fun playSound(sound: String, soundUri: String) {
    val fromPhone = soundUri.isNotEmpty() && startPlayer(Uri.parse(soundUri))
    if (fromPhone || sound.isEmpty()) return
    val resource = resources.getIdentifier(sound, "raw", packageName)
    if (resource != 0) startPlayer(Uri.parse("android.resource://$packageName/$resource"))
  }

  /** Plays a sound in a loop on the alarm volume, rising; false when it cannot be read. */
  private fun startPlayer(source: Uri): Boolean {
    val media = MediaPlayer()
    try {
      media.setAudioAttributes(alarmAudio)
      media.setDataSource(this, source)
      media.isLooping = true
      media.setVolume(RAMP_START, RAMP_START)
      media.prepare()
      media.start()
    } catch (error: Exception) {
      media.release()
      return false
    }
    run {
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
    }
    return true
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
    // The page of the alarm, if it is open, closes
    sendBroadcast(Intent(ACTION_ENDED).setPackage(packageName))
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
      .withJunixLook()
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

  /**
   * The icon and the colour of the other notifications of Junix (sheet 034, after the test on the
   * phone): read from the app, as expo-notifications does. Without the colour, the white logo
   * disappeared in a light circle.
   */
  private val appMetaData by lazy {
    try {
      packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA).metaData
    } catch (error: Exception) {
      null
    }
  }

  private fun smallIcon(): Int = smallIconOf(this)

  /** The violet of Junix, or null when the app declares none. */
  private fun accentColor(): Int? {
    val declared = appMetaData?.getInt("expo.modules.notifications.default_notification_color", 0) ?: 0
    if (declared == 0) return null
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) resources.getColor(declared, null) else {
        @Suppress("DEPRECATION")
        resources.getColor(declared)
      }
    } catch (error: Exception) {
      null
    }
  }

  /** The icon and its colour on every notification of the alarm. */
  private fun Notification.Builder.withJunixLook(): Notification.Builder {
    setSmallIcon(smallIcon())
    accentColor()?.let { setColor(it) }
    return this
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

  // ─── The page of the alarm (sheet 035) ───────────────────────────────────────

  private fun pageIntent(alarm: AlarmItem): Intent =
    Intent(this, AlarmActivity::class.java)
      .putExtra(EXTRA_ALARM, alarm.toJson().toString())
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)

  private fun pagePendingIntent(alarm: AlarmItem): PendingIntent =
    PendingIntent.getActivity(this, ("page" + alarm.id).hashCode(), pageIntent(alarm), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

  private fun appInForeground(): Boolean {
    val state = android.app.ActivityManager.RunningAppProcessInfo()
    android.app.ActivityManager.getMyMemoryState(state)
    return state.importance <= android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  private fun showPage(alarm: AlarmItem) {
    try {
      startActivity(pageIntent(alarm))
    } catch (error: Exception) {
      // Android refused: the notification still rings, with its buttons
    }
  }

  private fun ringingNotification(alarm: AlarmItem): Notification {
    val stop = Notification.Action.Builder(null, alarm.stopLabel, actionIntent(ACTION_STOP, alarm)).build()
    val later = Notification.Action.Builder(null, alarm.snoozeLabel, actionIntent(ACTION_SNOOZE, alarm)).build()
    // "Terminer" (sheet 039): Junix opens on the link that ends the thing, and stops the alarm
    val done = if (alarm.doneLabel.isNotEmpty() && alarm.doneUrl.isNotEmpty()) {
      val open = Intent(Intent.ACTION_VIEW, Uri.parse(alarm.doneUrl)).setPackage(packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      val pending = PendingIntent.getActivity(this, ("done" + alarm.id).hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      Notification.Action.Builder(null, alarm.doneLabel, pending).build()
    } else null
    // Locked screen: the page lights it when Android allows it; otherwise, Android shows the
    // notification itself, at the top, still ringing (the fallback of the study, 10.6)
    return builder(RINGING_CHANNEL)
      .setFullScreenIntent(pagePendingIntent(alarm), true)
      .withJunixLook()
      .setContentTitle(alarm.title)
      .setContentText(alarm.body)
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(openIntent(alarm))
      .addAction(stop)
      .apply { if (done != null) addAction(done) }
      .addAction(later)
      .build()
  }
}
