# FICHE OPÉRATOIRE N° 034 — L'alarme qui sonne jusqu'à ton geste

Projet : **Junix Pulse** · Date : 26 novembre 2026 · Suite de : [FICHE 033](FICHE-033-temps-pour-le-faire-et-focus.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), 16.9

---

## 1. Objectif

Jusqu'ici, une notification « Alarme » sonnait **une fois**, comme les autres, juste plus fort. Le chantier 9-B (proposition et maquette validées) en fait une **vraie alarme**, comme le réveil du téléphone :

| Avant | Après (cette fiche) |
|---|---|
| un son, une fois | le son d'alarme choisi **en boucle**, le **volume qui monte** sur 20 s, la vibration |
| le volume des notifications (muet en silencieux) | le **volume alarme** : ça sonne même en mode silencieux |
| une notification qu'on balaie | une notification qui reste, avec **Arrêter** et **Plus tard · 10 min** |
| — | sans geste pendant 5 min : la sonnerie s'arrête, « **Alarme manquée** » reste |
| — | après un **redémarrage** du téléphone, les alarmes sont replanifiées sans ouvrir Junix |

Ce qui sonne ainsi : tout ce qui est au **niveau Alarme** (Urgente, départ d'un voyage, famille réglée sur Alarme). Discret et normal ne changent pas.

Pour cela, un **module Android à nous** (`modules/junix-alarm`, en Kotlin), fait avec l'outil officiel d'Expo, **sans bibliothèque ajoutée**.

**Pas dans cette fiche** : la page plein écran qui allume l'écran verrouillé, et la ligne « Alarmes en plein écran » des Paramètres (fiche 035). En attendant, l'alarme sonne par sa notification : c'est le repli prévu quand Android refuse le plein écran.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| Les fiches 032 et 033 sont enregistrées | `git log --oneline -1` | `feat(alerts): the priority chooses the sound…` |
| Tout passe | `npx jest` | `Tests: 2148 passed` |
| Le dossier `android/` existe et compile | fiche 003 | un APK se fabrique |

## 3. Matériel

Rien à installer. Le module utilise seulement Android lui-même (pas même `androidx`) et l'API des modules d'Expo déjà présente (`expo-modules-core`).

Lu avant d'écrire (comme le demande `AGENTS.md`) : la documentation d'Expo sur les modules (création d'un module local, API Kotlin, `expo-module.config.json`, autoliaison : les modules locaux sont cherchés dans `./modules`), et celle d'Android sur les notifications urgentes, les types de services au premier plan (`mediaPlayback`) et les alarmes exactes.

## 4. Hypothèses

- Android permet de lancer le service qui sonne depuis l'arrière-plan quand une **alarme exacte demandée par la personne** se déclenche (documentation d'Android sur les exceptions). À confirmer sur le téléphone.
- Sans l'autorisation « alarmes exactes », l'alarme est planifiée au plus près plutôt que perdue ; la fiche 031 propose déjà cette autorisation quand on choisit Urgente.
- Le son coupé dans les Paramètres : l'alarme vibre seulement.
- Si le module manque (web, tests, ancien APK), ou si Android refuse une alarme, elle reste une notification ordinaire.

## 5. Carte de l'intervention

| Fichier | Action |
|---|---|
| `modules/junix-alarm/package.json`, `expo-module.config.json`, `android/build.gradle`, `AndroidManifest.xml` | **nouveaux** : le module et ce qu'Android doit en connaître |
| `…/junixalarm/AlarmStore.kt`, `AlarmScheduler.kt` | **nouveaux** : garder et planifier les alarmes |
| `…/junixalarm/AlarmReceivers.kt` | **nouveau** : l'heure, les boutons, le redémarrage |
| `…/junixalarm/AlarmService.kt` | **nouveau** : le service qui sonne |
| `…/junixalarm/JunixAlarmModule.kt`, `modules/junix-alarm/index.ts` | **nouveaux** : ce que l'appli voit du module |
| `domain/rules/alarm-handover-rules.ts` (+ test), `services/alarm-bridge.ts` | **nouveaux** : quoi confier à l'alarme |
| `reminder-`, `item-`, `habit-notification-service.ts` (+ test), i18n | la synchronisation confie le niveau Alarme au module |

## 6. Sauvegarde

`git status` propre (hors `docs/motion/`). Aucune donnée de la base n'est touchée. Retour en arrière : section 10.

## 7. Pas à pas

Le plus simple : `node docs/fiches/outils/appliquer-fiche-034.js .` fait toutes les étapes ci-dessous. Puis, pour le téléphone, fabriquer l'APK (fiche 003) : l'autoliaison ajoute le module toute seule, sans `prebuild`.

### Étape 1 — Le module : sa carte d'identité

**Pourquoi** : Un module Expo **local** vit dans le dossier `modules/` : l'outil d'Expo (l'autoliaison) le trouve tout seul et l'ajoute à l'appli Android, sans bibliothèque à installer. Il lui faut un `package.json`, un `expo-module.config.json` qui donne le nom complet de la classe Kotlin, et un `build.gradle` fait comme ceux des modules d'Expo du projet. Son `AndroidManifest.xml` déclare ce qu'Android doit connaître (le service qui sonne, les récepteurs, les autorisations) : Android le **fusionne** dans celui de l'appli, comme le fait `expo-haptics` pour la vibration.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-034.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/package.json`

Fichier nouveau, en entier :

<!-- bloc: new-mod-package -->

```json
{
  "name": "junix-alarm",
  "version": "1.0.0",
  "description": "The alarm of Junix Pulse that keeps ringing (study 001, 16.9; sheet 034): an Android module of our own.",
  "main": "index.ts",
  "types": "index.ts",
  "private": true,
  "license": "UNLICENSED"
}
```

#### `modules/junix-alarm/expo-module.config.json`

Fichier nouveau, en entier :

<!-- bloc: new-mod-expo-module-config -->

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.junixalarm.JunixAlarmModule"]
  }
}
```

#### `modules/junix-alarm/android/build.gradle`

Fichier nouveau, en entier :

<!-- bloc: new-mod-build -->

```groovy
// The alarm of Junix Pulse (sheet 034): built like the Expo modules of the project (expo-contacts)
plugins {
  id 'com.android.library'
  id 'expo-module-gradle-plugin'
}

group = 'com.junix.pulse'
version = '1.0.0'

android {
  namespace "expo.modules.junixalarm"
  defaultConfig {
    versionCode 1
    versionName "1.0.0"
  }
}
```

#### `modules/junix-alarm/android/src/main/AndroidManifest.xml`

Fichier nouveau, en entier :

<!-- bloc: new-mod-androidmanifest -->

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <!-- The alarm of Junix Pulse (sheet 034). Android merges this file into the app's. -->

  <!-- Ring in a service while the phone sleeps: a sound that plays (media playback) -->
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  <uses-permission android:name="android.permission.VIBRATE" />
  <!-- Plan the alarms again after the phone restarts -->
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

  <application>
    <!-- Wakes up at the time of an alarm and starts the ringing -->
    <receiver android:name="expo.modules.junixalarm.AlarmReceiver" android:exported="false" />

    <!-- "Arrêter" and "Plus tard" of the notification -->
    <receiver android:name="expo.modules.junixalarm.AlarmActionReceiver" android:exported="false" />

    <!-- The phone restarted, or the app was updated: the alarms are planned again -->
    <receiver android:name="expo.modules.junixalarm.BootReceiver" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
        <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
      </intent-filter>
    </receiver>

    <!-- Plays the sound in a loop until "Arrêter", "Plus tard" or 5 minutes -->
    <service
      android:name="expo.modules.junixalarm.AlarmService"
      android:exported="false"
      android:foregroundServiceType="mediaPlayback" />
  </application>
</manifest>
```

Contrôle : `npx expo-modules-autolinking search --platform android` affiche `junix-alarm` avec son dossier.

### Étape 2 — Garder les alarmes, et les planifier

**Pourquoi** : Une alarme (`AlarmItem`) porte son heure, son titre, son son et ses mots (« Arrêter », « Plus tard »…), donnés par l'appli dans la langue de la personne. Elles sont **gardées sur le téléphone** (préférences privées de l'appli) : après un redémarrage, Android les a oubliées, et on les retrouve là. `AlarmScheduler` les confie à Android avec `setAlarmClock` (à la minute, même téléphone en veille) ; sans l'autorisation « alarmes exactes », au plus près, plutôt que de les perdre. Chaque groupe (rappels, tâches et moments, habitudes) remplace seulement les siennes.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-034.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmStore.kt`

Fichier nouveau, en entier :

<!-- bloc: new-mod-alarmstore -->

```kotlin
package expo.modules.junixalarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * One alarm of Junix (sheet 034): what rings, when, with which sound, and the words of its
 * notification (the app gives them in the language of the person: Kotlin has no translations).
 */
data class AlarmItem(
  val id: String,
  /** The group that planned it (reminder, item, habit): each one replaces only its own alarms. */
  val group: String,
  /** When it rings, in milliseconds since 1970. */
  val at: Long,
  val title: String,
  val body: String,
  /** The sound in res/raw (junix_alarm…), or empty: no sound, only the vibration. */
  val sound: String,
  /** The link that opens the thing in the app (junixpulse://reminders/…), or empty. */
  val url: String,
  val stopLabel: String,
  val snoozeLabel: String,
  val missedTitle: String,
  val channelName: String
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
    .put("group", group)
    .put("at", at)
    .put("title", title)
    .put("body", body)
    .put("sound", sound)
    .put("url", url)
    .put("stopLabel", stopLabel)
    .put("snoozeLabel", snoozeLabel)
    .put("missedTitle", missedTitle)
    .put("channelName", channelName)

  companion object {
    fun fromJson(json: JSONObject): AlarmItem = AlarmItem(
      id = json.getString("id"),
      group = json.optString("group", ""),
      at = json.getLong("at"),
      title = json.optString("title", ""),
      body = json.optString("body", ""),
      sound = json.optString("sound", ""),
      url = json.optString("url", ""),
      stopLabel = json.optString("stopLabel", "Stop"),
      snoozeLabel = json.optString("snoozeLabel", "Later"),
      missedTitle = json.optString("missedTitle", "Missed alarm"),
      channelName = json.optString("channelName", "Alarms")
    )

    /** From what the app sends (a map of the JS object); null when something essential is missing. */
    fun fromMap(map: Map<String, Any?>): AlarmItem? {
      val id = map["id"] as? String ?: return null
      val at = (map["at"] as? Number)?.toLong() ?: return null
      return AlarmItem(
        id = id,
        group = map["group"] as? String ?: "",
        at = at,
        title = map["title"] as? String ?: "",
        body = map["body"] as? String ?: "",
        sound = map["sound"] as? String ?: "",
        url = map["url"] as? String ?: "",
        stopLabel = map["stopLabel"] as? String ?: "Stop",
        snoozeLabel = map["snoozeLabel"] as? String ?: "Later",
        missedTitle = map["missedTitle"] as? String ?: "Missed alarm",
        channelName = map["channelName"] as? String ?: "Alarms"
      )
    }
  }
}

/**
 * The planned alarms, kept on the phone (private preferences of the app): after a restart, the
 * phone has forgotten them, and BootReceiver plans them again from here, without opening Junix.
 */
object AlarmStore {
  private const val FILE = "junix_alarms"
  private const val KEY = "alarms"

  fun all(context: Context): List<AlarmItem> {
    val text = context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY, null) ?: return emptyList()
    return try {
      val array = JSONArray(text)
      (0 until array.length()).map { AlarmItem.fromJson(array.getJSONObject(it)) }
    } catch (error: Exception) {
      emptyList()
    }
  }

  fun get(context: Context, id: String): AlarmItem? = all(context).firstOrNull { it.id == id }

  fun saveAll(context: Context, alarms: List<AlarmItem>) {
    val array = JSONArray()
    alarms.forEach { array.put(it.toJson()) }
    context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit().putString(KEY, array.toString()).apply()
  }

  fun put(context: Context, alarm: AlarmItem) {
    saveAll(context, all(context).filterNot { it.id == alarm.id } + alarm)
  }

  fun remove(context: Context, id: String) {
    saveAll(context, all(context).filterNot { it.id == id })
  }
}
```

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmScheduler.kt`

Fichier nouveau, en entier :

<!-- bloc: new-mod-alarmscheduler -->

```kotlin
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
```


### Étape 3 — Les récepteurs : l'heure, les boutons, le redémarrage

**Pourquoi** : À l'heure, Android réveille `AlarmReceiver`, qui lance le service qui sonne : c'est permis depuis l'arrière-plan pour une alarme exacte demandée par la personne. `AlarmActionReceiver` reçoit « Arrêter » et « Plus tard ». `BootReceiver` replanifie tout après un redémarrage ou une mise à jour de l'appli, **sans ouvrir Junix**.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-034.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmReceivers.kt`

Fichier nouveau, en entier :

<!-- bloc: new-mod-alarmreceivers -->

```kotlin
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
```


### Étape 4 — Le service qui sonne

**Pourquoi** : Un service au premier plan (type « lecture multimédia ») joue le son choisi **en boucle**, sur le **volume alarme** du téléphone : il sonne même en mode silencieux, comme le réveil. Le volume **monte** de 15 % à 100 % en 20 secondes ; la vibration accompagne. Sa notification reste et porte **Arrêter** et **Plus tard · 10 min**. Sans geste pendant **5 minutes**, il s'arrête et laisse « **Alarme manquée** ». « Plus tard » replanifie l'alarme dans 10 minutes, dans un groupe à part que l'appli n'efface jamais. Un verrou de réveil garde le téléphone éveillé le temps de sonner.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-034.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmService.kt`

Fichier nouveau, en entier :

<!-- bloc: new-mod-alarmservice -->

```kotlin
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
```


### Étape 5 — Ce que l'appli voit du module

**Pourquoi** : `JunixAlarmModule` (l'API officielle des modules Expo : `ModuleDefinition`, `AsyncFunction`, `Function`) offre à l'appli : remplacer les alarmes d'un groupe, savoir si elles sonnent à la minute, et arrêter celle qui sonne. Côté appli, `modules/junix-alarm/index.ts` le charge avec `requireOptionalNativeModule` : sur le web, dans les tests ou sur un ancien APK, il est absent et **rien ne change**.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-034.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/JunixAlarmModule.kt`

Fichier nouveau, en entier :

<!-- bloc: new-mod-junixalarmmodule -->

```kotlin
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
```

#### `modules/junix-alarm/index.ts`

Fichier nouveau, en entier :

<!-- bloc: new-mod-index -->

```ts
/**
 * The alarm of Junix that keeps ringing (study 001, 16.9; sheet 034): the side of the app.
 * Android only; elsewhere (web, tests, an old build without the module) `available` is false and
 * nothing is done: the app keeps its ordinary notifications.
 */
import { requireOptionalNativeModule } from 'expo';

/** One alarm, as the app hands it over. The words are in the language of the person. */
export interface NativeAlarm {
  id: string;
  /** When it rings, in milliseconds since 1970. */
  at: number;
  title: string;
  body: string;
  /** Its sound in res/raw (junix_alarm…), or '' for the vibration alone. */
  sound: string;
  /** The link that opens it in the app (junixpulse://…), or ''. */
  url: string;
  stopLabel: string;
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
}

interface JunixAlarmNative {
  replaceGroup(group: string, alarms: NativeAlarm[]): Promise<number>;
  plannedIds(): string[];
  canScheduleExact(): boolean;
  ringingId(): string | null;
  stopRinging(): void;
}

const native = requireOptionalNativeModule<JunixAlarmNative>('JunixAlarm');

export const JunixAlarm = {
  /** True on an Android build that has the module. */
  available: native !== null,

  /** The alarms of one group (reminder, item, habit) become exactly these. */
  async replaceGroup(group: 'reminder' | 'item' | 'habit', alarms: NativeAlarm[]): Promise<void> {
    if (!native) return;
    await native.replaceGroup(group, alarms);
  },

  plannedIds(): string[] {
    return native ? native.plannedIds() : [];
  },

  ringingId(): string | null {
    return native ? native.ringingId() : null;
  },

  stopRinging(): void {
    native?.stopRinging();
  },
};
```


### Étape 6 — Le pont avec la synchronisation

**Pourquoi** : Une règle pure, testée, dit quoi confier à l'alarme : tout ce qui est au **niveau Alarme**, et seulement si le module est là. Elle prépare chaque alarme : le fichier du son, le lien qui ouvre la chose dans l'appli (`junixpulse://reminders/…`), les mots dans la langue de la personne. Les trois services de synchronisation (rappels, tâches et moments, habitudes) confient leurs alarmes au module ; **si Android ne les prend pas, elles restent des notifications** : rien n'est perdu.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-034.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/domain/rules/alarm-handover-rules.ts`

Fichier nouveau, en entier :

<!-- bloc: new-alarm-handover-rules -->

```ts
/**
 * Which notifications the alarm of Junix takes over (study 001, 16.9; sheet 034): on Android, with
 * the module, everything at the Alarm level rings until a gesture; the rest stays an ordinary
 * notification. Pure: the three sync services read it, the tests check it.
 */
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import type { NotificationLevel } from './notification-level-rules';
import { SOUNDS, type SoundChoice } from './sound-rules';

/** What Android receives for one alarm (the same shape as the module's NativeAlarm). */
export interface AlarmHandover {
  id: string;
  at: number;
  title: string;
  body: string;
  sound: string;
  url: string;
  stopLabel: string;
  snoozeLabel: string;
  missedTitle: string;
  channelName: string;
}

/** The planned notifications that ring as alarms, and the ones that stay notifications. */
export function splitAlarms<T extends { level: NotificationLevel }>(
  planned: readonly T[],
  nativeAlarms: boolean
): { alarms: T[]; notifications: T[] } {
  if (!nativeAlarms) return { alarms: [], notifications: [...planned] };
  return {
    alarms: planned.filter(item => item.level === 'alarm'),
    notifications: planned.filter(item => item.level !== 'alarm'),
  };
}

/** The link that opens a thing in the app from the alarm: junixpulse://reminders/… */
export function alarmUrl(route: string | null): string {
  return route ? `junixpulse:/${route.startsWith('/') ? route : `/${route}`}` : '';
}

/** One planned notification as an alarm, in the language of the person. */
export function alarmOf(
  item: { identifier: string; title: string; body: string; scheduledAt: Date },
  sound: SoundChoice,
  route: string | null,
  language: AppLanguage
): AlarmHandover {
  return {
    id: item.identifier,
    at: item.scheduledAt.getTime(),
    title: item.title,
    body: item.body,
    sound: sound === 'none' ? '' : SOUNDS[sound].file,
    url: alarmUrl(route),
    stopLabel: translate(language, 'alarm.stop'),
    snoozeLabel: translate(language, 'alarm.snooze'),
    missedTitle: translate(language, 'alarm.missed'),
    channelName: translate(language, 'alarm.channel'),
  };
}
```

#### `src/domain/rules/__tests__/alarm-handover-rules.test.ts`

Fichier nouveau, en entier :

<!-- bloc: new-alarm-handover-rules-test -->

```ts
import { alarmOf, alarmUrl, splitAlarms } from '../alarm-handover-rules';

describe('alarm-handover-rules (sheet 034)', () => {
  const planned = [
    { id: 'a', level: 'alarm' as const },
    { id: 'n', level: 'normal' as const },
    { id: 'd', level: 'discreet' as const },
  ];

  it('hands the Alarm level to the alarm of Junix, and only with the module', () => {
    expect(splitAlarms(planned, true)).toEqual({ alarms: [planned[0]], notifications: [planned[1], planned[2]] });
    // Without the module (web, an old build): everything stays a notification
    expect(splitAlarms(planned, false)).toEqual({ alarms: [], notifications: planned });
  });

  it('makes the link that opens the thing in the app', () => {
    expect(alarmUrl('/reminders/r1')).toBe('junixpulse://reminders/r1');
    expect(alarmUrl('tasks/t1')).toBe('junixpulse://tasks/t1');
    expect(alarmUrl(null)).toBe('');
  });

  it('gives Android the sound file and the words of the person', () => {
    const at = new Date(2026, 10, 27, 7, 30);
    const alarm = alarmOf({ identifier: 'reminder-r1-1', title: 'Prendre le train', body: 'Rappel', scheduledAt: at }, 'wake', '/reminders/r1', 'fr');
    expect(alarm).toMatchObject({
      id: 'reminder-r1-1',
      at: at.getTime(),
      title: 'Prendre le train',
      sound: 'junix_wake',
      url: 'junixpulse://reminders/r1',
      stopLabel: 'Arrêter',
      snoozeLabel: 'Plus tard · 10 min',
      missedTitle: 'Alarme manquée',
    });
    // The sound off: the vibration alone
    expect(alarmOf({ identifier: 'x', title: 't', body: 'b', scheduledAt: at }, 'none', null, 'en')).toMatchObject({ sound: '', url: '', stopLabel: 'Stop' });
  });
});
```

#### `src/services/alarm-bridge.ts`

Fichier nouveau, en entier :

<!-- bloc: new-alarm-bridge -->

```ts
/**
 * The bridge to the alarm of Junix (sheet 034): on Android with the module, the sync services hand
 * it the notifications of the Alarm level, which then ring until a gesture. Elsewhere, or if the
 * handover fails, nothing changes: they stay ordinary notifications, never lost.
 */
import { Platform } from 'react-native';

import { JunixAlarm } from '../../modules/junix-alarm';
import type { AlarmHandover } from '../domain/rules/alarm-handover-rules';
import { logger } from '../utils/logger';

/** Whether this phone has the alarm of Junix. */
export function nativeAlarmsOn(): boolean {
  return Platform.OS === 'android' && JunixAlarm.available;
}

/** The alarms of one group become exactly these; true when Android took them. */
export async function handOverAlarms(group: 'reminder' | 'item' | 'habit', alarms: AlarmHandover[]): Promise<boolean> {
  if (!nativeAlarmsOn()) return false;
  try {
    await JunixAlarm.replaceGroup(group, alarms);
    return true;
  } catch (error) {
    logger.warn('[AlarmBridge] Les alarmes restent des notifications', error);
    return false;
  }
}
```

#### `src/services/reminder-notification-service.ts`


Changement 1 sur 3. Chercher :

<!-- bloc: reminder-notification-service-1-avant -->

```ts
import { logger } from '@/utils/logger';
import { soundFor } from '@/domain/rules/sound-rules';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';

export interface ReminderSyncOptions {
  /** After a user action: may ask for the permission, and reports problems to the user. */
```

Remplacer par :

<!-- bloc: reminder-notification-service-1-apres -->

```ts
import { logger } from '@/utils/logger';
import { soundFor } from '@/domain/rules/sound-rules';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';

export interface ReminderSyncOptions {
  /** After a user action: may ask for the permission, and reports problems to the user. */
```

Changement 2 sur 3. Chercher :

<!-- bloc: reminder-notification-service-2-avant -->

```ts
    // The sound of each notification, from its level and the settings (sheet 031)
    const soundOf = (level: NotificationLevel) =>
      soundFor({ level, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });
    const planned = settings.notificationsEnabled
      ? planReminderNotifications(
          await loadReminders(),
          new Date(),
```

Remplacer par :

<!-- bloc: reminder-notification-service-2-apres -->

```ts
    // The sound of each notification, from its level and the settings (sheet 031)
    const soundOf = (level: NotificationLevel) =>
      soundFor({ level, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });
    const allPlanned = settings.notificationsEnabled
      ? planReminderNotifications(
          await loadReminders(),
          new Date(),
```

Changement 3 sur 3. Chercher :

<!-- bloc: reminder-notification-service-3-avant -->

```ts
          settings.alertLevels
        )
      : [];

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(REMINDER_IDENTIFIER_PREFIX)
```

Remplacer par :

<!-- bloc: reminder-notification-service-3-apres -->

```ts
          settings.alertLevels
        )
      : [];
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'reminder',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/reminders/${item.reminderId}`, language))
    );
    const planned = handed ? split.notifications : allPlanned;

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(REMINDER_IDENTIFIER_PREFIX)
```

#### `src/services/item-notification-service.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: item-notification-service-1-avant -->

```ts
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';

let queue: Promise<unknown> = Promise.resolve();

async function sync(force: boolean): Promise<void> {
  try {
    const settings = await SettingsRepository.get();
    const planned = settings.notificationsEnabled
      ? planItemNotifications({
          tasks: await TaskRepository.findAllActive(),
          events: await EventRepository.findAll(),
```

Remplacer par :

<!-- bloc: item-notification-service-1-apres -->

```ts
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';

let queue: Promise<unknown> = Promise.resolve();

async function sync(force: boolean): Promise<void> {
  try {
    const settings = await SettingsRepository.get();
    const allPlanned = settings.notificationsEnabled
      ? planItemNotifications({
          tasks: await TaskRepository.findAllActive(),
          events: await EventRepository.findAll(),
```

Changement 2 sur 2. Chercher :

<!-- bloc: item-notification-service-2-avant -->

```ts
    const soundOf = (item: { level: PlannedItemNotification['level']; tone?: PlannedItemNotification['tone'] }) =>
      soundFor({ level: item.level, tone: item.tone, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(ITEM_IDENTIFIER_PREFIX)
    );
```

Remplacer par :

<!-- bloc: item-notification-service-2-apres -->

```ts
    const soundOf = (item: { level: PlannedItemNotification['level']; tone?: PlannedItemNotification['tone'] }) =>
      soundFor({ level: item.level, tone: item.tone, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });

    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'item',
      split.alarms.map(item =>
        alarmOf(item, soundOf(item), item.itemType === 'TASK' ? `/tasks/${item.itemId}` : `/events/${item.itemId}`, language)
      )
    );
    const planned = handed ? split.notifications : allPlanned;

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(ITEM_IDENTIFIER_PREFIX)
    );
```

#### `src/services/habit-notification-service.ts`


Changement 1 sur 3. Chercher :

<!-- bloc: habit-notification-service-1-avant -->

```ts
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { soundFor } from '@/domain/rules/sound-rules';

let queue: Promise<unknown> = Promise.resolve();

```

Remplacer par :

<!-- bloc: habit-notification-service-1-apres -->

```ts
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { soundFor } from '@/domain/rules/sound-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';

let queue: Promise<unknown> = Promise.resolve();

```

Changement 2 sur 3. Chercher :

<!-- bloc: habit-notification-service-2-avant -->

```ts
        toPlan.push({ habit, completedDates: completions.map(completion => completion.completedDate) });
      }
    }
    const planned = planHabitNotifications({
      habits: toPlan,
      now: new Date(),
      language: useAppStore.getState().language,
```

Remplacer par :

<!-- bloc: habit-notification-service-2-apres -->

```ts
        toPlan.push({ habit, completedDates: completions.map(completion => completion.completedDate) });
      }
    }
    const allPlanned = planHabitNotifications({
      habits: toPlan,
      now: new Date(),
      language: useAppStore.getState().language,
```

Changement 3 sur 3. Chercher :

<!-- bloc: habit-notification-service-3-avant -->

```ts
    });

    // The sound of each notification, from its level and the settings (sheet 031)
    const soundOf = (level: (typeof planned)[number]['level']) =>
      soundFor({ level, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(HABIT_IDENTIFIER_PREFIX)
    );
```

Remplacer par :

<!-- bloc: habit-notification-service-3-apres -->

```ts
    });

    // The sound of each notification, from its level and the settings (sheet 031)
    const soundOf = (level: (typeof allPlanned)[number]['level']) =>
      soundFor({ level, prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled });

    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'habit',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/habits/${item.habitId}`, language))
    );
    const planned = handed ? split.notifications : allPlanned;

    const held = (await NotificationService.getAllScheduled()).filter(request =>
      request.identifier.startsWith(HABIT_IDENTIFIER_PREFIX)
    );
```

#### `src/__tests__/reminder-notification-service.test.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: reminder-notification-service-test-1-avant -->

```ts
  },
}));

const AT = '2030-01-15T18:00:00.000Z';
const IDENTIFIER = `reminder-r1-${new Date(AT).getTime()}`;
const REMINDER = {
```

Remplacer par :

<!-- bloc: reminder-notification-service-test-1-apres -->

```ts
  },
}));

// The alarm of Junix (sheet 034): off at first, as on the web and in old builds
const mockHandOver = jest.fn().mockResolvedValue(true);
let mockNativeOn = false;
jest.mock('../services/alarm-bridge', () => ({
  nativeAlarmsOn: () => mockNativeOn,
  handOverAlarms: (...args: unknown[]) => (mockNativeOn ? mockHandOver(...args) : Promise.resolve(false)),
}));

const AT = '2030-01-15T18:00:00.000Z';
const IDENTIFIER = `reminder-r1-${new Date(AT).getTime()}`;
const REMINDER = {
```

Changement 2 sur 2. Chercher :

<!-- bloc: reminder-notification-service-test-2-avant -->

```ts
    (NotificationService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (NotificationService.requestPermissions as jest.Mock).mockResolvedValue(true);
    scheduled.mockResolvedValue('id');
  });

  it('schedules what the phone does not hold yet', async () => {
```

Remplacer par :

<!-- bloc: reminder-notification-service-test-2-apres -->

```ts
    (NotificationService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (NotificationService.requestPermissions as jest.Mock).mockResolvedValue(true);
    scheduled.mockResolvedValue('id');
    mockNativeOn = false;
    mockHandOver.mockResolvedValue(true);
  });

  it('hands an urgent reminder to the alarm of Junix, not to a notification (sheet 034)', async () => {
    mockNativeOn = true;
    (ReminderRepository.findAll as jest.Mock).mockResolvedValue([{ ...REMINDER, priority: 'URGENT' }]);

    await syncReminderNotifications();

    expect(mockHandOver).toHaveBeenCalledWith('reminder', [
      expect.objectContaining({ id: IDENTIFIER, title: 'Appeler', sound: 'junix_alarm', url: 'junixpulse://reminders/r1' }),
    ]);
    expect(scheduled).not.toHaveBeenCalled();
  });

  it('keeps an urgent reminder as a notification when Android does not take it (sheet 034)', async () => {
    mockNativeOn = true;
    mockHandOver.mockResolvedValue(false);
    (ReminderRepository.findAll as jest.Mock).mockResolvedValue([{ ...REMINDER, priority: 'URGENT' }]);

    await syncReminderNotifications();

    expect(scheduled).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', level: 'alarm' }));
  });

  it('schedules what the phone does not hold yet', async () => {
```

#### `src/i18n/messages-rest-fr.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-fr-1-avant -->

```ts
  'focus.taskTicked': "Tâche cochée",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Lancer Focus pour {title}",
  'itemForm.priority': "Priorité",
  'itemForm.priorityHint': "« Urgente » sonne comme une alarme.",
  'itemForm.action': "Ce que tu feras",
```

Remplacer par :

<!-- bloc: messages-rest-fr-1-apres -->

```ts
  'focus.taskTicked': "Tâche cochée",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Lancer Focus pour {title}",
  'alarm.stop': "Arrêter",
  'alarm.snooze': "Plus tard · 10 min",
  'alarm.missed': "Alarme manquée",
  'alarm.channel': "Alarmes qui sonnent",
  'itemForm.priority': "Priorité",
  'itemForm.priorityHint': "« Urgente » sonne comme une alarme.",
  'itemForm.action': "Ce que tu feras",
```

#### `src/i18n/messages-rest-en.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-en-1-avant -->

```ts
  'focus.taskTicked': "Task ticked",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Start Focus for {title}",
  'itemForm.priority': "Priority",
  'itemForm.priorityHint': "“Urgent” rings like an alarm.",
  'itemForm.action': "What you will do",
```

Remplacer par :

<!-- bloc: messages-rest-en-1-apres -->

```ts
  'focus.taskTicked': "Task ticked",
  'todoTab.focus': "Focus",
  'todoTab.focusFor': "Start Focus for {title}",
  'alarm.stop': "Stop",
  'alarm.snooze': "Later · 10 min",
  'alarm.missed': "Missed alarm",
  'alarm.channel': "Ringing alarms",
  'itemForm.priority': "Priority",
  'itemForm.priorityHint': "“Urgent” rings like an alarm.",
  'itemForm.action': "What you will do",
```


## 8. Test final

| Contrôle | Résultat attendu |
|---|---|
| `npx jest` | tout passe, dont `alarm-handover-rules` (3 tests) et « hands an urgent reminder to the alarm of Junix » |
| `npx expo-modules-autolinking search --platform android` | `junix-alarm` trouvé dans `modules/` |
| `./gradlew :junix-alarm:compileReleaseKotlin` | `BUILD SUCCESSFUL` |
| APK (fiche 003) | `BUILD SUCCESSFUL` ; le manifeste final contient `expo.modules.junixalarm.AlarmService` et les trois récepteurs |
| **Téléphone** : un rappel Urgente dans 2 min, téléphone verrouillé et en silencieux | il sonne en boucle, de plus en plus fort, et vibre ; la notification reste |
| Toucher « Arrêter » | la sonnerie s'arrête, la notification disparaît |
| Un autre, toucher « Plus tard · 10 min » | il se tait, et resonne 10 minutes après, même appli fermée |
| Un autre, ne rien toucher | après 5 min, il se tait et laisse « Alarme manquée » ; la toucher ouvre le rappel |
| Planifier un rappel Urgente, redémarrer le téléphone sans ouvrir Junix | il sonne à l'heure |
| Un rappel Normale | une notification ordinaire, comme avant |

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Des fichiers de `modules/junix-alarm/android/build/` apparaissent dans `git status` | ce que Gradle fabrique pour le module | les ignorer : `modules/*/android/build/` dans `.gitignore` (fait) |
| L'alarme sonne quelques minutes en retard | pas d'autorisation « alarmes exactes » | l'autoriser (fenêtre « Une alarme à la minute », fiche 031) |
| Une alarme Urgente arrive en notification ordinaire, une seule fois | le module n'est pas dans l'APK (ancien APK) ou Android l'a refusée | refaire l'APK ; le repli garde la notification, rien n'est perdu |
| Le service ne démarre pas (rien ne sonne à l'heure) | Android a bloqué le démarrage depuis l'arrière-plan | à me signaler : l'exception « alarme exacte » est attendue ; sinon, un autre type de service sera nécessaire |

## 10. Retour en arrière

Supprimer le dossier `modules/junix-alarm/`, `alarm-handover-rules.ts` et son test, `alarm-bridge.ts`, puis `git checkout -- <les autres fichiers de la section 5>`, et refaire l'APK. Aucune donnée n'est touchée : les alarmes redeviennent des notifications.

## 11. Lexique

| Mot | En une phrase |
|---|---|
| Module local (Expo) | du code Android à nous, rangé dans `modules/`, que l'outil d'Expo ajoute tout seul à l'appli |
| Service au premier plan | un petit programme d'Android qui continue de tourner, appli fermée, avec une notification visible ; ici, il joue le son |
| Volume alarme | le volume du réveil du téléphone, distinct de celui des notifications : il sonne même en silencieux |
| Fusion du manifeste | Android réunit les déclarations de l'appli et de ses modules dans un seul fichier |
| `setAlarmClock` | la façon d'Android de planifier une alarme à la minute, avec l'icône de réveil dans la barre d'état |

## 12. Et après

1. Commit, APK et essai sur le téléphone (le tableau du test final).
2. **Fiche 035** : la page plein écran qui allume l'écran verrouillé, la ligne « Alarmes en plein écran » des Paramètres.

## Compte rendu d'exécution (26 novembre 2026)

- Lu avant d'écrire : la documentation d'Expo sur les modules (création locale, API Kotlin, configuration, autoliaison) et d'Android (notifications urgentes, types de services, alarmes exactes) ; deux modules installés comme modèles : `expo-contacts` (l'API documentée, `ModuleDefinition`) et `expo-haptics` (une permission déclarée dans le manifeste du module, sans plugin).
- Appliquée à partir des blocs de cette fiche (`appliquer-fiche-034.js`), puis rejouée sur une copie propre du code enregistré : **tout `src` et tout le module sont identiques** (0 différence).
- Écarts corrigés pendant le travail, et reportés dans la fiche :
  - `ContextCompat` (bibliothèque `androidx`) remplacé par Android lui-même, pour ne dépendre de rien ;
  - le dossier `build/` du module, fabriqué par Gradle, n'était pas ignoré par git : ajouté au `.gitignore` ;
  - le script d'édition a été écrit dans un fichier plutôt que dans le terminal (les barres obliques inverses y sont abîmées).
- Tests : `Test Suites: 106 passed`, `Tests: 2153 passed` (dont les nouveaux) ; `tsc` et `eslint` sans erreur.
- Une fois, pendant la suite complète, un fichier de tests n'a pas démarré (`1 failed` sans aucun test en échec, 2142 tests passés) ; relancée deux fois, la suite passe entièrement. Même cause probable que les lenteurs du code PIN déjà vues : la machine chargée (l'APK se fabriquait en même temps).
- Compilation : `:junix-alarm:compileReleaseKotlin` réussie, puis **l'APK complet** (`BUILD SUCCESSFUL in 8m 46s`) ; le manifeste final contient le service, les trois récepteurs et les autorisations.
- **Pas vérifié** : tout ce qui sonne. L'alarme ne se teste que sur un téléphone Android : la sonnerie en boucle, le volume qui monte, le mode silencieux, les boutons, les 5 minutes, « Plus tard », le redémarrage. Rien n'est encore enregistré dans git, et l'APK n'est pas encore copié sur le Bureau.
