# FICHE OPÉRATOIRE N° 035 — La page de l'alarme, par-dessus l'écran verrouillé

Projet : **Junix Pulse** · Date : 27 novembre 2026 · Suite de : [FICHE 034](FICHE-034-l-alarme-qui-sonne.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), 16.9

---

## 1. Objectif

Avec la fiche 034, l'alarme sonne jusqu'à ton geste, par sa notification. Ton essai : **ça fonctionne**, avec une précision : **le logo manquait dans le petit cercle** de la notification. Cette fiche corrige le logo et termine le chantier 9-B :

| Avant (fiche 034) | Après (cette fiche) |
|---|---|
| petit cercle de la notification sans logo visible | le logo de Junix sur le **violet** de l'appli, comme les autres notifications |
| téléphone verrouillé : une notification qui sonne | **une page pleine** qui allume l'écran : l'heure en grand, le titre, le type, **Arrêter** et **Plus tard · 10 min**, « Ouvrir dans Junix » |
| appli ouverte : la notification | la même page, tout de suite |
| — | Paramètres → Notifications et vibrations : « **Alarmes en plein écran** » (Autorisé, ou À autoriser › vers la page d'Android) |

Sans l'autorisation (Android 14 et plus la réserve aux applis de réveil et d'appel ; avec l'APK installé à la main, tu l'accordes toi-même), Android montre la notification en haut de l'écran, qui sonne toujours : le repli de l'étude (10.6).

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 034 est enregistrée | `git log --oneline -1` | `feat(alarm): an alarm that rings until a gesture…` |
| Tout passe | `npx jest` | `Tests: 2153 passed` |

## 3. Matériel

Rien à installer : la page est faite avec les vues d'Android lui-même.

## 4. Hypothèses

- Le bouton retour ne ferme pas la page : une alarme ne s'arrête que par « Arrêter », « Plus tard », « Ouvrir dans Junix » ou au bout de 5 minutes.
- « Ouvrir dans Junix » arrête l'alarme (on s'en occupe) et ouvre la chose.
- Le type affiché est celui de la chose (Rappel, Tâche à rendre, Moment, Habitude).

## 5. Carte de l'intervention

| Fichier | Action |
|---|---|
| `…/junixalarm/AlarmService.kt` | le logo et le violet ; l'intention plein écran ; la page appli ouverte ; la page prévenue quand ça s'arrête |
| `…/junixalarm/AlarmActivity.kt` | **nouveau** : la page de l'alarme |
| `modules/junix-alarm/android/src/main/AndroidManifest.xml` | la page et l'autorisation « notifications plein écran » |
| `…/junixalarm/AlarmStore.kt` | le type et « Ouvrir dans Junix » de chaque alarme |
| `…/junixalarm/JunixAlarmModule.kt`, `modules/junix-alarm/index.ts`, `services/alarm-bridge.ts` | savoir si c'est autorisé, ouvrir la page d'Android |
| `alarm-handover-rules.ts` (+ test), les trois services de synchronisation | le type et le lien, dans la langue de la personne |
| `app/settings/index.tsx`, i18n | la ligne « Alarmes en plein écran » |

## 6. Sauvegarde

`git status` propre (hors `docs/motion/`). Aucune donnée touchée. Retour en arrière : section 10.

## 7. Pas à pas

D'abord la fiche 034, puis : `node docs/fiches/outils/appliquer-fiche-035.js .` fait toutes les étapes ci-dessous. Puis fabriquer l'APK (fiche 003), sans `prebuild`.

### Étape 1 — Le logo dans le cercle, et le service qui ouvre la page

**Pourquoi** : **Ton retour sur l'APK de la fiche 034** : dans la notification de l'alarme, le petit cercle n'avait pas de logo. Les autres notifications de Junix prennent l'icône et le **violet** déclarés dans l'appli (par `expo-notifications`) ; celle de l'alarme ne prenait pas la couleur, et le logo blanc disparaissait dans un cercle clair. Elle lit maintenant les mêmes, comme le fait `expo-notifications` (`withJunixLook`), pour « Alarme manquée » aussi. Le service prépare aussi la page : sa notification porte une **intention plein écran** (Android allume l'écran et montre la page quand il l'autorise, sinon il montre la notification en haut, qui sonne toujours) ; appli ouverte, il ouvre la page tout de suite ; quand la sonnerie s'arrête, il le dit à la page pour qu'elle se ferme.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-035.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmService.kt`


Changement 1 sur 7. Chercher :

<!-- bloc: mod-alarmservice-1-avant -->

```kotlin
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
```

Remplacer par :

<!-- bloc: mod-alarmservice-1-apres -->

```kotlin
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
```

Changement 2 sur 7. Chercher :

<!-- bloc: mod-alarmservice-2-avant -->

```kotlin
    const val ACTION_STOP = "expo.modules.junixalarm.ACTION_STOP"
    const val ACTION_SNOOZE = "expo.modules.junixalarm.ACTION_SNOOZE"
    const val EXTRA_ALARM = "expo.modules.junixalarm.ALARM"

    const val RINGING_CHANNEL = "junix-pulse-alarm-ringing-v1"
    const val MISSED_CHANNEL = "junix-pulse-alarm-missed-v1"
```

Remplacer par :

<!-- bloc: mod-alarmservice-2-apres -->

```kotlin
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
```

Changement 3 sur 7. Chercher :

<!-- bloc: mod-alarmservice-3-avant -->

```kotlin
      startForeground(RINGING_ID, notification)
    }
    holdWakeLock()
    playSound(alarm.sound)
    vibrate()
    handler.removeCallbacksAndMessages(null)
```

Remplacer par :

<!-- bloc: mod-alarmservice-3-apres -->

```kotlin
      startForeground(RINGING_ID, notification)
    }
    holdWakeLock()
    // The app open on the screen: the page of the alarm shows at once (sheet 035); otherwise the
    // full-screen intent of the notification lights the screen, when Android allows it
    if (appInForeground()) showPage(alarm)
    playSound(alarm.sound)
    vibrate()
    handler.removeCallbacksAndMessages(null)
```

Changement 4 sur 7. Chercher :

<!-- bloc: mod-alarmservice-4-avant -->

```kotlin
  private fun stopRinging() {
    stopSound()
    current = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE) else {
```

Remplacer par :

<!-- bloc: mod-alarmservice-4-apres -->

```kotlin
  private fun stopRinging() {
    stopSound()
    current = null
    // The page of the alarm, if it is open, closes
    sendBroadcast(Intent(ACTION_ENDED).setPackage(packageName))
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE) else {
```

Changement 5 sur 7. Chercher :

<!-- bloc: mod-alarmservice-5-avant -->

```kotlin
  private fun missed(alarm: AlarmItem) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val builder = builder(MISSED_CHANNEL)
      .setSmallIcon(smallIcon())
      .setContentTitle(alarm.missedTitle)
      .setContentText(alarm.title)
      .setAutoCancel(true)
```

Remplacer par :

<!-- bloc: mod-alarmservice-5-apres -->

```kotlin
  private fun missed(alarm: AlarmItem) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val builder = builder(MISSED_CHANNEL)
      .withJunixLook()
      .setContentTitle(alarm.missedTitle)
      .setContentText(alarm.title)
      .setAutoCancel(true)
```

Changement 6 sur 7. Chercher :

<!-- bloc: mod-alarmservice-6-avant -->

```kotlin
      Notification.Builder(this)
    }

  private fun smallIcon(): Int {
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName)
    return if (icon != 0) icon else applicationInfo.icon
  }

  private fun actionIntent(action: String, alarm: AlarmItem): PendingIntent {
```

Remplacer par :

<!-- bloc: mod-alarmservice-6-apres -->

```kotlin
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
```

Changement 7 sur 7. Chercher :

<!-- bloc: mod-alarmservice-7-avant -->

```kotlin
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
```

Remplacer par :

<!-- bloc: mod-alarmservice-7-apres -->

```kotlin
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
    // Locked screen: the page lights it when Android allows it; otherwise, Android shows the
    // notification itself, at the top, still ringing (the fallback of the study, 10.6)
    return builder(RINGING_CHANNEL)
      .setFullScreenIntent(pagePendingIntent(alarm), true)
      .withJunixLook()
      .setContentTitle(alarm.title)
      .setContentText(alarm.body)
      .setCategory(Notification.CATEGORY_ALARM)
```


### Étape 2 — La page de l'alarme

**Pourquoi** : Une page Android dessinée avec les vues d'Android lui-même (aucune bibliothèque), aux couleurs de Junix : fond de nuit, le logo dans un cercle rouge, **l'heure en grand**, le titre, le type ; en bas, sous le pouce, **Arrêter** (rouge) et **Plus tard · 10 min**, et le lien « Ouvrir dans Junix » qui arrête l'alarme et ouvre la chose. Elle s'affiche **par-dessus l'écran verrouillé** et l'allume ; le bouton retour ne l'arrête pas par mégarde. Son manifeste la déclare, avec l'autorisation « notifications plein écran ».

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-035.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmActivity.kt`

Fichier nouveau, en entier :

<!-- bloc: new-mod-alarmactivity -->

```kotlin
package expo.modules.junixalarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.text.format.DateFormat
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.util.Date

/**
 * The page of the alarm (study 001, 16.9; sheet 035): it lights the screen, even locked, and shows
 * the time in large, the title and the type; two large buttons "Arrêter" and "Plus tard · 10 min",
 * and "Ouvrir dans Junix". Drawn with Android's own views (no library), in the colours of Junix:
 * the night background, the red of the alarm, the violet of the app. It closes when the alarm
 * stops, from here, from the notification, or after 5 minutes.
 */
class AlarmActivity : Activity() {
  companion object {
    private const val NIGHT = 0xFF141317.toInt()
    private const val ALARM_RED = 0xFFFFB4AB.toInt()
    private const val ALARM_RED_DEEP = 0xFF93000A.toInt()
    private const val VIOLET = 0xFFD0BCFF.toInt()
    private const val TEXT = 0xFFE6E1E5.toInt()
    private const val TEXT_SOFT = 0xFFCAC4D0.toInt()
  }

  private var alarm: AlarmItem? = null

  /** The alarm stopped elsewhere (notification, 5 minutes): the page closes. */
  private val ended = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showOverLockScreen()
    alarm = intent.getStringExtra(AlarmService.EXTRA_ALARM)?.let { AlarmItem.fromJson(JSONObject(it)) } ?: AlarmService.current
    val current = alarm
    if (current == null) {
      finish()
      return
    }
    setContentView(page(current))
    val filter = IntentFilter(AlarmService.ACTION_ENDED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(ended, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(ended, filter)
    }
  }

  override fun onDestroy() {
    try {
      unregisterReceiver(ended)
    } catch (error: Exception) {
      // Not registered: the page closed at once
    }
    super.onDestroy()
  }

  /** The back button does not stop the alarm by mistake: only the two buttons do. */
  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    // Nothing: "Arrêter" or "Plus tard"
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      (getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).requestDismissKeyguard(this, null)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    // The bars in the night colour; newer Androids draw the page under them anyway
    @Suppress("DEPRECATION")
    window.statusBarColor = NIGHT
    @Suppress("DEPRECATION")
    window.navigationBarColor = NIGHT
  }

  // ─── The page ────────────────────────────────────────────────────────────────

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun text(value: String, size: Float, color: Int, bold: Boolean = false): TextView =
    TextView(this).apply {
      text = value
      setTextColor(color)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
      gravity = Gravity.CENTER
      if (bold) typeface = Typeface.DEFAULT_BOLD
    }

  private fun pill(fill: Int, stroke: Int): GradientDrawable = GradientDrawable().apply {
    cornerRadius = dp(32).toFloat()
    setColor(fill)
    setStroke(dp(1), stroke)
  }

  private fun button(label: String, fill: Int, stroke: Int, color: Int, onPress: () -> Unit): TextView =
    text(label, 18f, color, bold = true).apply {
      background = pill(fill, stroke)
      setPadding(dp(16), dp(18), dp(16), dp(18))
      isClickable = true
      isFocusable = true
      contentDescription = label
      setOnClickListener { onPress() }
    }

  private fun page(alarm: AlarmItem): View {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(NIGHT)
      setPadding(dp(28), dp(56), dp(28), dp(40))
      gravity = Gravity.CENTER_HORIZONTAL
    }

    // The logo of Junix (the icon of its notifications) in the red of the alarm, in a red circle
    val badge = ImageView(this).apply {
      setImageResource(AlarmService.smallIconOf(this@AlarmActivity))
      setColorFilter(ALARM_RED)
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.argb(60, 255, 180, 171))
      }
      setPadding(dp(20), dp(20), dp(20), dp(20))
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }
    root.addView(badge, LinearLayout.LayoutParams(dp(88), dp(88)).apply { gravity = Gravity.CENTER_HORIZONTAL })

    val time = DateFormat.getTimeFormat(this).format(Date(alarm.at))
    root.addView(text(time, 64f, TEXT, bold = true).apply { setPadding(0, dp(24), 0, 0) })
    root.addView(text(alarm.title, 24f, TEXT, bold = true).apply { setPadding(0, dp(8), 0, 0) })
    if (alarm.kindLabel.isNotEmpty()) root.addView(text(alarm.kindLabel, 16f, TEXT_SOFT).apply { setPadding(0, dp(6), 0, 0) })

    // The buttons at the bottom, where the thumb is
    root.addView(View(this), LinearLayout.LayoutParams(0, 0, 1f))
    val stop = button(alarm.stopLabel, ALARM_RED_DEEP, ALARM_RED, Color.WHITE) { send(AlarmService.ACTION_STOP) }
    root.addView(stop, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    val later = button(alarm.snoozeLabel, Color.TRANSPARENT, TEXT_SOFT, TEXT) { send(AlarmService.ACTION_SNOOZE) }
    root.addView(later, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(12) })
    if (alarm.openLabel.isNotEmpty()) {
      val open = text(alarm.openLabel, 15f, VIOLET).apply {
        paintFlags = paintFlags or android.graphics.Paint.UNDERLINE_TEXT_FLAG
        setPadding(0, dp(18), 0, dp(4))
        isClickable = true
        contentDescription = alarm.openLabel
        setOnClickListener { openInJunix(alarm) }
      }
      root.addView(open)
    }
    return root
  }

  // ─── The gestures ────────────────────────────────────────────────────────────

  private fun send(action: String) {
    val current = alarm ?: return
    startService(Intent(this, AlarmService::class.java).setAction(action).putExtra(AlarmService.EXTRA_ALARM, current.toJson().toString()))
    finish()
  }

  /** "Ouvrir dans Junix": the alarm stops, and the thing opens in the app. */
  private fun openInJunix(alarm: AlarmItem) {
    startService(Intent(this, AlarmService::class.java).setAction(AlarmService.ACTION_STOP))
    val open = if (alarm.url.isNotEmpty()) {
      Intent(Intent.ACTION_VIEW, Uri.parse(alarm.url)).setPackage(packageName)
    } else {
      packageManager.getLaunchIntentForPackage(packageName)
    }
    if (open != null) {
      open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      try {
        startActivity(open)
      } catch (error: Exception) {
        // No screen for the link: the app itself
        packageManager.getLaunchIntentForPackage(packageName)?.let { startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
      }
    }
    finish()
  }
}
```

#### `modules/junix-alarm/android/src/main/AndroidManifest.xml`


Changement 1 sur 2. Chercher :

<!-- bloc: mod-androidmanifest-1-avant -->

```xml
  <!-- Plan the alarms again after the phone restarts -->
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

  <application>
    <!-- Wakes up at the time of an alarm and starts the ringing -->
```

Remplacer par :

<!-- bloc: mod-androidmanifest-1-apres -->

```xml
  <!-- Plan the alarms again after the phone restarts -->
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
  <!-- The page that lights the locked screen (sheet 035). Android 14 gives it only to alarm and
       call apps; for the others, the person allows it in the settings of Android, or the alarm
       rings as a priority notification -->
  <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />

  <application>
    <!-- Wakes up at the time of an alarm and starts the ringing -->
```

Changement 2 sur 2. Chercher :

<!-- bloc: mod-androidmanifest-2-avant -->

```xml
      </intent-filter>
    </receiver>

    <!-- Plays the sound in a loop until "Arrêter", "Plus tard" or 5 minutes -->
    <service
      android:name="expo.modules.junixalarm.AlarmService"
```

Remplacer par :

<!-- bloc: mod-androidmanifest-2-apres -->

```xml
      </intent-filter>
    </receiver>

    <!-- The page of the alarm, over the locked screen (sheet 035) -->
    <activity
      android:name="expo.modules.junixalarm.AlarmActivity"
      android:exported="false"
      android:excludeFromRecents="true"
      android:launchMode="singleInstance"
      android:taskAffinity="com.junix.pulse.alarm"
      android:showWhenLocked="true"
      android:turnScreenOn="true"
      android:theme="@android:style/Theme.DeviceDefault.NoActionBar" />

    <!-- Plays the sound in a loop until "Arrêter", "Plus tard" or 5 minutes -->
    <service
      android:name="expo.modules.junixalarm.AlarmService"
```

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmStore.kt`


Changement 1 sur 4. Chercher :

<!-- bloc: mod-alarmstore-1-avant -->

```kotlin
  val stopLabel: String,
  val snoozeLabel: String,
  val missedTitle: String,
  val channelName: String
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
```

Remplacer par :

<!-- bloc: mod-alarmstore-1-apres -->

```kotlin
  val stopLabel: String,
  val snoozeLabel: String,
  val missedTitle: String,
  val channelName: String,
  /** What it is, for the page of the alarm: "Rappel · Urgente" (sheet 035). */
  val kindLabel: String = "",
  /** "Ouvrir dans Junix", on the page of the alarm (sheet 035). */
  val openLabel: String = ""
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
```

Changement 2 sur 4. Chercher :

<!-- bloc: mod-alarmstore-2-avant -->

```kotlin
    .put("snoozeLabel", snoozeLabel)
    .put("missedTitle", missedTitle)
    .put("channelName", channelName)

  companion object {
    fun fromJson(json: JSONObject): AlarmItem = AlarmItem(
```

Remplacer par :

<!-- bloc: mod-alarmstore-2-apres -->

```kotlin
    .put("snoozeLabel", snoozeLabel)
    .put("missedTitle", missedTitle)
    .put("channelName", channelName)
    .put("kindLabel", kindLabel)
    .put("openLabel", openLabel)

  companion object {
    fun fromJson(json: JSONObject): AlarmItem = AlarmItem(
```

Changement 3 sur 4. Chercher :

<!-- bloc: mod-alarmstore-3-avant -->

```kotlin
      stopLabel = json.optString("stopLabel", "Stop"),
      snoozeLabel = json.optString("snoozeLabel", "Later"),
      missedTitle = json.optString("missedTitle", "Missed alarm"),
      channelName = json.optString("channelName", "Alarms")
    )

    /** From what the app sends (a map of the JS object); null when something essential is missing. */
```

Remplacer par :

<!-- bloc: mod-alarmstore-3-apres -->

```kotlin
      stopLabel = json.optString("stopLabel", "Stop"),
      snoozeLabel = json.optString("snoozeLabel", "Later"),
      missedTitle = json.optString("missedTitle", "Missed alarm"),
      channelName = json.optString("channelName", "Alarms"),
      kindLabel = json.optString("kindLabel", ""),
      openLabel = json.optString("openLabel", "")
    )

    /** From what the app sends (a map of the JS object); null when something essential is missing. */
```

Changement 4 sur 4. Chercher :

<!-- bloc: mod-alarmstore-4-avant -->

```kotlin
        stopLabel = map["stopLabel"] as? String ?: "Stop",
        snoozeLabel = map["snoozeLabel"] as? String ?: "Later",
        missedTitle = map["missedTitle"] as? String ?: "Missed alarm",
        channelName = map["channelName"] as? String ?: "Alarms"
      )
    }
  }
```

Remplacer par :

<!-- bloc: mod-alarmstore-4-apres -->

```kotlin
        stopLabel = map["stopLabel"] as? String ?: "Stop",
        snoozeLabel = map["snoozeLabel"] as? String ?: "Later",
        missedTitle = map["missedTitle"] as? String ?: "Missed alarm",
        channelName = map["channelName"] as? String ?: "Alarms",
        kindLabel = map["kindLabel"] as? String ?: "",
        openLabel = map["openLabel"] as? String ?: ""
      )
    }
  }
```


### Étape 3 — Le module : savoir si c'est autorisé, et ouvrir la page d'Android

**Pourquoi** : Depuis Android 14, l'autorisation « notifications plein écran » se donne dans les réglages d'Android. Le module dit si elle est accordée (`canUseFullScreenIntent`) et ouvre directement la bonne page (`ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT`) ; avant Android 14, elle est donnée à l'installation, et ce sont les réglages des notifications de Junix qui s'ouvrent.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-035.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/JunixAlarmModule.kt`


Changement 1 sur 2. Chercher :

<!-- bloc: mod-junixalarmmodule-1-avant -->

```kotlin

import android.content.Context
import android.content.Intent
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
```

Remplacer par :

<!-- bloc: mod-junixalarmmodule-1-apres -->

```kotlin

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
```

Changement 2 sur 2. Chercher :

<!-- bloc: mod-junixalarmmodule-2-avant -->

```kotlin
      AlarmService.current?.id
    }

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
```

Remplacer par :

<!-- bloc: mod-junixalarmmodule-2-apres -->

```kotlin
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

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
```

#### `modules/junix-alarm/index.ts`


Changement 1 sur 3. Chercher :

<!-- bloc: mod-index-1-avant -->

```ts
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
}

interface JunixAlarmNative {
```

Remplacer par :

<!-- bloc: mod-index-1-apres -->

```ts
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
  /** What it is, on the page of the alarm: "Rappel · Urgente" (sheet 035). */
  kindLabel: string;
  /** "Ouvrir dans Junix" (sheet 035). */
  openLabel: string;
}

interface JunixAlarmNative {
```

Changement 2 sur 3. Chercher :

<!-- bloc: mod-index-2-avant -->

```ts
  canScheduleExact(): boolean;
  ringingId(): string | null;
  stopRinging(): void;
}

const native = requireOptionalNativeModule<JunixAlarmNative>('JunixAlarm');
```

Remplacer par :

<!-- bloc: mod-index-2-apres -->

```ts
  canScheduleExact(): boolean;
  ringingId(): string | null;
  stopRinging(): void;
  canUseFullScreen(): boolean;
  openFullScreenSettings(): boolean;
}

const native = requireOptionalNativeModule<JunixAlarmNative>('JunixAlarm');
```

Changement 3 sur 3. Chercher :

<!-- bloc: mod-index-3-avant -->

```ts
  stopRinging(): void {
    native?.stopRinging();
  },
};
```

Remplacer par :

<!-- bloc: mod-index-3-apres -->

```ts
  stopRinging(): void {
    native?.stopRinging();
  },

  /** Whether the page of the alarm may light the locked screen; null without the module (sheet 035). */
  canUseFullScreen(): boolean | null {
    return native ? native.canUseFullScreen() : null;
  },

  /** Opens the page of Android to allow it; false when it could not be opened. */
  openFullScreenSettings(): boolean {
    return native ? native.openFullScreenSettings() : false;
  },
};
```

#### `src/services/alarm-bridge.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: alarm-bridge-1-avant -->

```ts
  return Platform.OS === 'android' && JunixAlarm.available;
}

/** The alarms of one group become exactly these; true when Android took them. */
export async function handOverAlarms(group: 'reminder' | 'item' | 'habit', alarms: AlarmHandover[]): Promise<boolean> {
  if (!nativeAlarmsOn()) return false;
```

Remplacer par :

<!-- bloc: alarm-bridge-1-apres -->

```ts
  return Platform.OS === 'android' && JunixAlarm.available;
}

/**
 * Whether the page of the alarm may light the locked screen (sheet 035); null when this phone has
 * no alarm of Junix (web, old build): the settings then show nothing about it.
 */
export function fullScreenAlarmsAllowed(): boolean | null {
  if (!nativeAlarmsOn()) return null;
  try {
    return JunixAlarm.canUseFullScreen();
  } catch {
    return null;
  }
}

/** Opens the page of Android where the person allows it. */
export function openFullScreenAlarmSettings(): boolean {
  return nativeAlarmsOn() ? JunixAlarm.openFullScreenSettings() : false;
}

/** The alarms of one group become exactly these; true when Android took them. */
export async function handOverAlarms(group: 'reminder' | 'item' | 'habit', alarms: AlarmHandover[]): Promise<boolean> {
  if (!nativeAlarmsOn()) return false;
```


### Étape 4 — Le type et « Ouvrir dans Junix », dans la langue de la personne

**Pourquoi** : Kotlin n'a pas les traductions de l'appli : la synchronisation donne à chaque alarme son type (Rappel, Tâche à rendre, Moment, Habitude) et « Ouvrir dans Junix ».

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-035.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/domain/rules/alarm-handover-rules.ts`


Changement 1 sur 3. Chercher :

<!-- bloc: alarm-handover-rules-1-avant -->

```ts
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
}

/** The planned notifications that ring as alarms, and the ones that stay notifications. */
export function splitAlarms<T extends { level: NotificationLevel }>(
  planned: readonly T[],
```

Remplacer par :

<!-- bloc: alarm-handover-rules-1-apres -->

```ts
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
  /** What it is, on the page of the alarm (sheet 035). */
  kindLabel: string;
  openLabel: string;
}

/** What rings, for the page of the alarm. */
export type AlarmKind = 'reminder' | 'task' | 'moment' | 'habit';

/** The planned notifications that ring as alarms, and the ones that stay notifications. */
export function splitAlarms<T extends { level: NotificationLevel }>(
  planned: readonly T[],
```

Changement 2 sur 3. Chercher :

<!-- bloc: alarm-handover-rules-2-avant -->

```ts
  item: { identifier: string; title: string; body: string; scheduledAt: Date },
  sound: SoundChoice,
  route: string | null,
  language: AppLanguage
): AlarmHandover {
  return {
    id: item.identifier,
```

Remplacer par :

<!-- bloc: alarm-handover-rules-2-apres -->

```ts
  item: { identifier: string; title: string; body: string; scheduledAt: Date },
  sound: SoundChoice,
  route: string | null,
  language: AppLanguage,
  kind: AlarmKind = 'reminder'
): AlarmHandover {
  return {
    id: item.identifier,
```

Changement 3 sur 3. Chercher :

<!-- bloc: alarm-handover-rules-3-avant -->

```ts
    snoozeLabel: translate(language, 'alarm.snooze'),
    missedTitle: translate(language, 'alarm.missed'),
    channelName: translate(language, 'alarm.channel'),
  };
}
```

Remplacer par :

<!-- bloc: alarm-handover-rules-3-apres -->

```ts
    snoozeLabel: translate(language, 'alarm.snooze'),
    missedTitle: translate(language, 'alarm.missed'),
    channelName: translate(language, 'alarm.channel'),
    kindLabel: translate(language, `alarm.kind.${kind}`),
    openLabel: translate(language, 'alarm.open'),
  };
}
```

#### `src/domain/rules/__tests__/alarm-handover-rules.test.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: alarm-handover-rules-test-1-avant -->

```ts
      stopLabel: 'Arrêter',
      snoozeLabel: 'Plus tard · 10 min',
      missedTitle: 'Alarme manquée',
    });
    // The sound off: the vibration alone
    expect(alarmOf({ identifier: 'x', title: 't', body: 'b', scheduledAt: at }, 'none', null, 'en')).toMatchObject({ sound: '', url: '', stopLabel: 'Stop' });
  });
```

Remplacer par :

<!-- bloc: alarm-handover-rules-test-1-apres -->

```ts
      stopLabel: 'Arrêter',
      snoozeLabel: 'Plus tard · 10 min',
      missedTitle: 'Alarme manquée',
      // The page of the alarm (sheet 035)
      kindLabel: 'Rappel',
      openLabel: 'Ouvrir dans Junix',
    });
    expect(alarmOf({ identifier: 'y', title: 't', body: 'b', scheduledAt: at }, 'alarm', '/events/e1', 'fr', 'moment').kindLabel).toBe('Moment');
    // The sound off: the vibration alone
    expect(alarmOf({ identifier: 'x', title: 't', body: 'b', scheduledAt: at }, 'none', null, 'en')).toMatchObject({ sound: '', url: '', stopLabel: 'Stop' });
  });
```

#### `src/services/reminder-notification-service.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: reminder-notification-service-1-avant -->

```ts
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'reminder',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/reminders/${item.reminderId}`, language))
    );
    const planned = handed ? split.notifications : allPlanned;

```

Remplacer par :

<!-- bloc: reminder-notification-service-1-apres -->

```ts
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'reminder',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/reminders/${item.reminderId}`, language, 'reminder'))
    );
    const planned = handed ? split.notifications : allPlanned;

```

#### `src/services/item-notification-service.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: item-notification-service-1-avant -->

```ts
    const handed = await handOverAlarms(
      'item',
      split.alarms.map(item =>
        alarmOf(item, soundOf(item), item.itemType === 'TASK' ? `/tasks/${item.itemId}` : `/events/${item.itemId}`, language)
      )
    );
    const planned = handed ? split.notifications : allPlanned;
```

Remplacer par :

<!-- bloc: item-notification-service-1-apres -->

```ts
    const handed = await handOverAlarms(
      'item',
      split.alarms.map(item =>
        item.itemType === 'TASK'
          ? alarmOf(item, soundOf(item), `/tasks/${item.itemId}`, language, 'task')
          : alarmOf(item, soundOf(item), `/events/${item.itemId}`, language, 'moment')
      )
    );
    const planned = handed ? split.notifications : allPlanned;
```

#### `src/services/habit-notification-service.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: habit-notification-service-1-avant -->

```ts
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'habit',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/habits/${item.habitId}`, language))
    );
    const planned = handed ? split.notifications : allPlanned;

```

Remplacer par :

<!-- bloc: habit-notification-service-1-apres -->

```ts
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'habit',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/habits/${item.habitId}`, language, 'habit'))
    );
    const planned = handed ? split.notifications : allPlanned;

```


### Étape 5 — La ligne « Alarmes en plein écran » des Paramètres

**Pourquoi** : Dans Notifications et vibrations : « Autorisé » en vert, ou « À autoriser » ; toucher la ligne ouvre la page d'Android. En revenant dans Junix, la ligne se met à jour toute seule (l'appli redevient active). Elle n'apparaît que là où l'alarme de Junix existe : pas sur le web.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-035.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/app/settings/index.tsx`


Changement 1 sur 6. Chercher :

<!-- bloc: index-1-avant -->

```tsx
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import { router, useLocalSearchParams } from 'expo-router';
```

Remplacer par :

<!-- bloc: index-1-apres -->

```tsx
  TouchableOpacity,
  TextInput,
  Platform,
  AppState,
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import { router, useLocalSearchParams } from 'expo-router';
```

Changement 2 sur 6. Chercher :

<!-- bloc: index-2-avant -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AlertDefaultsSetting } from '@/components/settings/AlertDefaultsSetting';
import { SoundSetting } from '@/components/settings/SoundSetting';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { DEFAULT_SOUND_PREFS, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { NotificationSoundService } from '@/services/sound/NotificationSoundService';
```

Remplacer par :

<!-- bloc: index-2-apres -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AlertDefaultsSetting } from '@/components/settings/AlertDefaultsSetting';
import { SoundSetting } from '@/components/settings/SoundSetting';
import { fullScreenAlarmsAllowed, openFullScreenAlarmSettings } from '@/services/alarm-bridge';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { DEFAULT_SOUND_PREFS, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { NotificationSoundService } from '@/services/sound/NotificationSoundService';
```

Changement 3 sur 6. Chercher :

<!-- bloc: index-3-avant -->

```tsx
  const [backupPasswordVisible, setBackupPasswordVisible] = useState(false);
  const [isSanctumPinConfigured, setIsSanctumPinConfigured] = useState(false);
  const [canEnableExactAlarms, setCanEnableExactAlarms] = useState(false);

  const loadSettings = useCallback(async () => {
    setAutoBackup(await getAutoBackupConfig());
```

Remplacer par :

<!-- bloc: index-3-apres -->

```tsx
  const [backupPasswordVisible, setBackupPasswordVisible] = useState(false);
  const [isSanctumPinConfigured, setIsSanctumPinConfigured] = useState(false);
  const [canEnableExactAlarms, setCanEnableExactAlarms] = useState(false);
  // Whether the page of the alarm may light the locked screen (sheet 035); null: no alarm of Junix here
  const [fullScreenAlarms, setFullScreenAlarms] = useState<boolean | null>(null);

  const loadSettings = useCallback(async () => {
    setAutoBackup(await getAutoBackupConfig());
```

Changement 4 sur 6. Chercher :

<!-- bloc: index-4-avant -->

```tsx
    setDisplayNameInput(s.displayName ?? '');
    const exactAlarms = await NotificationService.getExactAlarmStatus();
    setCanEnableExactAlarms(!exactAlarms.granted && exactAlarms.canAsk);
    try {
      const pinConfigured = await SanctumAuthService.isPinConfigured();
      setIsSanctumPinConfigured(pinConfigured);
```

Remplacer par :

<!-- bloc: index-4-apres -->

```tsx
    setDisplayNameInput(s.displayName ?? '');
    const exactAlarms = await NotificationService.getExactAlarmStatus();
    setCanEnableExactAlarms(!exactAlarms.granted && exactAlarms.canAsk);
    setFullScreenAlarms(fullScreenAlarmsAllowed());
    try {
      const pinConfigured = await SanctumAuthService.isPinConfigured();
      setIsSanctumPinConfigured(pinConfigured);
```

Changement 5 sur 6. Chercher :

<!-- bloc: index-5-avant -->

```tsx
    loadSettings();
  }, [loadSettings]);

  const refreshAutoBackup = async () => setAutoBackup(await getAutoBackupConfig());

  const runAutoBackupNow = async () => {
```

Remplacer par :

<!-- bloc: index-5-apres -->

```tsx
    loadSettings();
  }, [loadSettings]);

  // Back from the settings of Android: the row says at once whether it is allowed now (sheet 035)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setFullScreenAlarms(fullScreenAlarmsAllowed());
    });
    return () => subscription.remove();
  }, []);

  const refreshAutoBackup = async () => setAutoBackup(await getAutoBackupConfig());

  const runAutoBackupNow = async () => {
```

Changement 6 sur 6. Chercher :

<!-- bloc: index-6-avant -->

```tsx
        </TouchableOpacity>
      )}

      {settings.notificationsEnabled && (
        <View style={styles.row}>
          <View style={styles.rowTextFill}>
```

Remplacer par :

<!-- bloc: index-6-apres -->

```tsx
        </TouchableOpacity>
      )}

      {/* The page of the alarm over the locked screen (sheet 035): only where the alarm of Junix exists */}
      {settings.notificationsEnabled && fullScreenAlarms !== null && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            if (!openFullScreenAlarmSettings()) GlassAlert.alert(t('alarm.fullScreen'), t('alarm.fullScreenHint'));
          }}
          accessibilityRole="button"
          accessibilityLabel={`${t('alarm.fullScreen')}, ${t(fullScreenAlarms ? 'alarm.fullScreenOn' : 'alarm.fullScreenOff')}`}
          testID="settings-full-screen-alarms"
        >
          <View style={styles.rowTextFill}>
            <Text style={styles.rowLabel}>{t('alarm.fullScreen')}</Text>
            <Text style={styles.rowSub}>{t('alarm.fullScreenHint')}</Text>
          </View>
          <Text style={[styles.rowSub, { color: fullScreenAlarms ? palette.success.default : palette.primary.default }]}>
            {t(fullScreenAlarms ? 'alarm.fullScreenOn' : 'alarm.fullScreenOff')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
        </TouchableOpacity>
      )}

      {settings.notificationsEnabled && (
        <View style={styles.row}>
          <View style={styles.rowTextFill}>
```

#### `src/i18n/messages-rest-fr.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-fr-1-avant -->

```ts
  'focus.taskTicked': "Tâche cochée",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Lancer Focus pour {title}",
  'alarm.stop': "Arrêter",
  'alarm.snooze': "Plus tard · 10 min",
  'alarm.missed': "Alarme manquée",
```

Remplacer par :

<!-- bloc: messages-rest-fr-1-apres -->

```ts
  'focus.taskTicked': "Tâche cochée",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Lancer Focus pour {title}",
  'alarm.open': "Ouvrir dans Junix",
  'alarm.kind.reminder': "Rappel",
  'alarm.kind.task': "Tâche à rendre",
  'alarm.kind.moment': "Moment",
  'alarm.kind.habit': "Habitude",
  'alarm.fullScreen': "Alarmes en plein écran",
  'alarm.fullScreenHint': "Pour qu’une alarme allume l’écran, même verrouillé. Sinon, elle sonne en notification.",
  'alarm.fullScreenOn': "Autorisé",
  'alarm.fullScreenOff': "À autoriser",
  'alarm.stop': "Arrêter",
  'alarm.snooze': "Plus tard · 10 min",
  'alarm.missed': "Alarme manquée",
```

#### `src/i18n/messages-rest-en.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-en-1-avant -->

```ts
  'focus.taskTicked': "Task ticked",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Start Focus for {title}",
  'alarm.stop': "Stop",
  'alarm.snooze': "Later · 10 min",
  'alarm.missed': "Missed alarm",
```

Remplacer par :

<!-- bloc: messages-rest-en-1-apres -->

```ts
  'focus.taskTicked': "Task ticked",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Start Focus for {title}",
  'alarm.open': "Open in Junix",
  'alarm.kind.reminder': "Reminder",
  'alarm.kind.task': "Task due",
  'alarm.kind.moment': "Moment",
  'alarm.kind.habit': "Habit",
  'alarm.fullScreen': "Full-screen alarms",
  'alarm.fullScreenHint': "So that an alarm lights the screen, even locked. Otherwise, it rings as a notification.",
  'alarm.fullScreenOn': "Allowed",
  'alarm.fullScreenOff': "To allow",
  'alarm.stop': "Stop",
  'alarm.snooze': "Later · 10 min",
  'alarm.missed': "Missed alarm",
```


## 8. Test final

| Contrôle | Résultat attendu |
|---|---|
| `npx jest` | tout passe, dont « gives Android the sound file and the words of the person » (type et « Ouvrir dans Junix ») |
| `./gradlew :junix-alarm:compileReleaseKotlin`, puis l'APK | `BUILD SUCCESSFUL` ; le manifeste final contient `AlarmActivity` et `USE_FULL_SCREEN_INTENT` |
| Web : Paramètres → Notifications et vibrations | pas de ligne « Alarmes en plein écran » (pas d'alarme Junix sur le web), aucune erreur |
| **Téléphone** : notification de l'alarme | le logo de Junix dans un cercle violet |
| Paramètres → Alarmes en plein écran | « À autoriser » ; la toucher ouvre la page d'Android ; l'autoriser, revenir : « Autorisé » |
| Un rappel Urgente dans 2 min, téléphone verrouillé, plein écran autorisé | l'écran s'allume sur la page : l'heure, le titre, « Rappel », Arrêter, Plus tard |
| Arrêter / Plus tard / Ouvrir dans Junix | la sonnerie s'arrête ; Plus tard resonne dans 10 min ; Ouvrir ouvre le rappel |
| Le même, plein écran non autorisé | la notification en haut de l'écran, qui sonne toujours |
| Le même, appli ouverte | la page s'ouvre tout de suite |
| Arrêter depuis la notification, la page ouverte | la page se ferme |

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| L'écran ne s'allume pas, seule la notification sonne | « Alarmes en plein écran » n'est pas autorisé | Paramètres → Alarmes en plein écran → autoriser |
| La ligne n'apparaît pas dans les Paramètres | pas d'alarme Junix sur cet appareil (web, ancien APK) | refaire l'APK |
| `createBundleReleaseJsAndAssets` … `0xC0000005` en fabriquant l'APK | la mémoire du PC (Metro s'arrête) | relancer avec `--max-workers=1`, sans serveur web ouvert |

## 10. Retour en arrière

`git checkout -- <fichiers de la section 5>` (en gardant la fiche 034), supprimer `AlarmActivity.kt`, refaire l'APK. L'alarme sonne alors par sa notification, comme avec la fiche 034.

## 11. Lexique

| Mot | En une phrase |
|---|---|
| Intention plein écran | ce que porte une notification urgente pour qu'Android ouvre une page, même téléphone verrouillé |
| Page par-dessus l'écran verrouillé | une page qui s'affiche sans déverrouiller, comme celle du réveil ou d'un appel |
| Couleur de notification | la couleur du petit cercle de l'icône ; sans elle, un logo blanc peut disparaître |

## 12. Et après

1. Commit, APK et essai sur le téléphone (le tableau du test final).
2. Le chantier n° 9 se termine avec **9-C** : les sonneries et les musiques du téléphone comme sons d'alarme.

## Compte rendu d'exécution (27 novembre 2026)

- Fait après ton essai de l'APK de la fiche 034 : l'alarme sonnait, mais le petit cercle de la notification n'avait pas de logo. Cause : l'icône était bien là, sans la couleur violette des autres notifications. Les deux sont maintenant lues dans l'appli, comme le fait `expo-notifications` (lu dans son code avant d'écrire).
- Appliquée à partir des blocs de cette fiche (`appliquer-fiche-035.js`), après la fiche 034, sur une copie propre du code enregistré : `src` et le module sont **identiques** (0 différence).
- Écarts corrigés pendant le travail, et reportés dans la fiche : une émoticône prévue sur la page remplacée par le logo de Junix (le design n'en met pas) ; deux appels anciens d'Android marqués comme voulus.
- Tests : `Test Suites: 106 passed`, `Tests: 2153 passed` ; `tsc` et `eslint` sans erreur. Compilation du module, puis l'APK : un premier essai arrêté par la mémoire du PC (`0xC0000005` dans Metro), le second réussi (`BUILD SUCCESSFUL in 6m 22s`, une tâche à la fois) ; le manifeste final contient la page et l'autorisation.
- **Vérifié sur le web** : l'appli démarre, les Paramètres s'affichent sans la ligne (pas d'alarme Junix sur le web), la console est vide.
- **Pas vérifié** : la page et le logo eux-mêmes, l'autorisation plein écran et son retour, tout le comportement sur le téléphone. Rien n'est encore enregistré dans git, et l'APK n'est pas encore copié sur le Bureau.
