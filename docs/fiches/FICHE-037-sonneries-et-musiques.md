# FICHE OPÉRATOIRE N° 037 — Sonneries et musiques du téléphone pour les alarmes

Projet : **Junix Pulse** · Date : 27 novembre 2026 · Suite de : [FICHE 036](FICHE-036-l-icone-des-notifications.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), 16.10

---

## 1. Objectif

Dernière étape du chantier n° 9 (9-C), proposition et maquette validées : réveiller avec **le son qu'on aime**.

| Avant | Après |
|---|---|
| les alarmes : Alarme, Réveil, Aube ou Marche (sons de Junix) | en plus, **une sonnerie du téléphone** (la liste d'Android) ou **une musique** (un fichier du téléphone) |
| — | le son choisi s'affiche : « Sonnerie · Argon », « Musique · Mon titre », avec ▶ |
| — | une musique supprimée ou illisible : le son de Junix d'Urgente sonne à sa place, jamais le silence |

**Seulement pour Urgente** (les alarmes) : les autres notifications passent par les canaux d'Android, qui n'acceptent (par Expo) que des sons rangés dans l'appli ; l'alarme de Junix joue son son elle-même, elle peut donc jouer n'importe lequel.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 036 est enregistrée | `git log --oneline -1` | `fix(notifications): a notification icon you can see` |
| Tout passe | `npx jest` | `Tests: 2153 passed` |

## 3. Matériel

Rien à installer : les pages d'Android (liste des sonneries, sélecteur de fichiers) et notre module.

## 4. Hypothèses

- La liste montre les sons d'alarme et les sonneries d'Android ; pas « Silencieux », pas « Par défaut » (une alarme doit sonner).
- Une musique choisie dans une appli qui ne donne pas de droit durable (rare) : à l'heure, l'alarme ne pourra pas la lire, et le son de Junix sonnera.
- Le son du téléphone n'est pas sauvegardé hors du téléphone : une sauvegarde restaurée sur un autre téléphone garde son adresse, illisible là-bas, donc le filet (le son de Junix) sonne.

## 5. Carte de l'intervention

| Fichier | Action |
|---|---|
| `…/junixalarm/AlarmStore.kt`, `AlarmService.kt` | l'adresse du son du téléphone, jouée d'abord, avec le filet |
| `…/junixalarm/DeviceSounds.kt` | **nouveau** : les noms des sons, l'écoute |
| `…/junixalarm/JunixAlarmModule.kt`, `modules/junix-alarm/index.ts`, `services/alarm-bridge.ts` | ouvrir les pages d'Android, recevoir le choix |
| `sound-rules.ts` (+ test), `alarm-handover-rules.ts`, les trois synchronisations | garder le choix, le donner aux alarmes |
| `SoundSetting.tsx`, `app/settings/index.tsx`, `PriorityField.tsx`, i18n | « Du téléphone », la liste, « Sonnera » |

## 6. Sauvegarde

`git status` propre (hors `docs/motion/`). Aucune migration : le choix entre dans la colonne des sons (fiche 031).

## 7. Pas à pas

Le plus simple : `node docs/fiches/outils/appliquer-fiche-037.js .` fait toutes les étapes ci-dessous ; puis l'APK (fiche 003), sans `prebuild`.

### Étape 1 — Le service : le son du téléphone d'abord, celui de Junix en filet

**Pourquoi** : Chaque alarme peut porter l'adresse d'un son du téléphone (`soundUri`, une adresse `content://`). Le service essaie de la jouer ; s'il ne peut pas la lire (musique supprimée, accès perdu), il joue le son de Junix choisi pour Urgente. **Une alarme ne reste jamais muette.** La boucle, le volume qui monte et les 5 minutes ne changent pas.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-037.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmStore.kt`


Changement 1 sur 4. Chercher :

<!-- bloc: mod-alarmstore-1-avant -->

```kotlin
  /** What it is, for the page of the alarm: "Rappel · Urgente" (sheet 035). */
  val kindLabel: String = "",
  /** "Ouvrir dans Junix", on the page of the alarm (sheet 035). */
  val openLabel: String = ""
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
```

Remplacer par :

<!-- bloc: mod-alarmstore-1-apres -->

```kotlin
  /** What it is, for the page of the alarm: "Rappel · Urgente" (sheet 035). */
  val kindLabel: String = "",
  /** "Ouvrir dans Junix", on the page of the alarm (sheet 035). */
  val openLabel: String = "",
  /** A sound of the phone (content://…), rung first; `sound` is the safety net (sheet 037). */
  val soundUri: String = ""
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
```

Changement 2 sur 4. Chercher :

<!-- bloc: mod-alarmstore-2-avant -->

```kotlin
    .put("channelName", channelName)
    .put("kindLabel", kindLabel)
    .put("openLabel", openLabel)

  companion object {
    fun fromJson(json: JSONObject): AlarmItem = AlarmItem(
```

Remplacer par :

<!-- bloc: mod-alarmstore-2-apres -->

```kotlin
    .put("channelName", channelName)
    .put("kindLabel", kindLabel)
    .put("openLabel", openLabel)
    .put("soundUri", soundUri)

  companion object {
    fun fromJson(json: JSONObject): AlarmItem = AlarmItem(
```

Changement 3 sur 4. Chercher :

<!-- bloc: mod-alarmstore-3-avant -->

```kotlin
      missedTitle = json.optString("missedTitle", "Missed alarm"),
      channelName = json.optString("channelName", "Alarms"),
      kindLabel = json.optString("kindLabel", ""),
      openLabel = json.optString("openLabel", "")
    )

    /** From what the app sends (a map of the JS object); null when something essential is missing. */
```

Remplacer par :

<!-- bloc: mod-alarmstore-3-apres -->

```kotlin
      missedTitle = json.optString("missedTitle", "Missed alarm"),
      channelName = json.optString("channelName", "Alarms"),
      kindLabel = json.optString("kindLabel", ""),
      openLabel = json.optString("openLabel", ""),
      soundUri = json.optString("soundUri", "")
    )

    /** From what the app sends (a map of the JS object); null when something essential is missing. */
```

Changement 4 sur 4. Chercher :

<!-- bloc: mod-alarmstore-4-avant -->

```kotlin
        missedTitle = map["missedTitle"] as? String ?: "Missed alarm",
        channelName = map["channelName"] as? String ?: "Alarms",
        kindLabel = map["kindLabel"] as? String ?: "",
        openLabel = map["openLabel"] as? String ?: ""
      )
    }
  }
```

Remplacer par :

<!-- bloc: mod-alarmstore-4-apres -->

```kotlin
        missedTitle = map["missedTitle"] as? String ?: "Missed alarm",
        channelName = map["channelName"] as? String ?: "Alarms",
        kindLabel = map["kindLabel"] as? String ?: "",
        openLabel = map["openLabel"] as? String ?: "",
        soundUri = map["soundUri"] as? String ?: ""
      )
    }
  }
```

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmService.kt`


Changement 1 sur 3. Chercher :

<!-- bloc: mod-alarmservice-1-avant -->

```kotlin
    // The app open on the screen: the page of the alarm shows at once (sheet 035); otherwise the
    // full-screen intent of the notification lights the screen, when Android allows it
    if (appInForeground()) showPage(alarm)
    playSound(alarm.sound)
    vibrate()
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({ missed(alarm) }, RING_LIMIT_MS)
```

Remplacer par :

<!-- bloc: mod-alarmservice-1-apres -->

```kotlin
    // The app open on the screen: the page of the alarm shows at once (sheet 035); otherwise the
    // full-screen intent of the notification lights the screen, when Android allows it
    if (appInForeground()) showPage(alarm)
    playSound(alarm.sound, alarm.soundUri)
    vibrate()
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({ missed(alarm) }, RING_LIMIT_MS)
```

Changement 2 sur 3. Chercher :

<!-- bloc: mod-alarmservice-2-avant -->

```kotlin
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
```

Remplacer par :

<!-- bloc: mod-alarmservice-2-apres -->

```kotlin
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
```

Changement 3 sur 3. Chercher :

<!-- bloc: mod-alarmservice-3-avant -->

```kotlin
          if (progress < 1f) handler.postDelayed(this, 1_000L)
        }
      })
    } catch (error: Exception) {
      // A sound that cannot play: the vibration and the notification still warn
      player = null
    }
  }

  private fun vibrate() {
```

Remplacer par :

<!-- bloc: mod-alarmservice-3-apres -->

```kotlin
          if (progress < 1f) handler.postDelayed(this, 1_000L)
        }
      })
    }
    return true
  }

  private fun vibrate() {
```


### Étape 2 — Choisir et écouter un son du téléphone

**Pourquoi** : Le module ouvre les pages d'Android et attend leur réponse (comme le fait `expo-document-picker`) : la **liste des sonneries** (`ACTION_RINGTONE_PICKER`, alarmes et sonneries) et le **sélecteur de fichiers** (`ACTION_OPEN_DOCUMENT`, musique). Pour une musique, Junix **garde le droit de la lire** (`takePersistableUriPermission`) : elle sonnera longtemps après, appli fermée. `DeviceSounds` donne leur nom et les fait entendre quelques secondes sur le volume alarme. Rien n'est ajouté au projet.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-037.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/DeviceSounds.kt`

Fichier nouveau, en entier :

<!-- bloc: new-mod-devicesounds -->

```kotlin
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
```

#### `modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/JunixAlarmModule.kt`


Changement 1 sur 3. Chercher :

<!-- bloc: mod-junixalarmmodule-1-avant -->

```kotlin
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
```

Remplacer par :

<!-- bloc: mod-junixalarmmodule-1-apres -->

```kotlin
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.app.Activity
import android.media.RingtoneManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
```

Changement 2 sur 3. Chercher :

<!-- bloc: mod-junixalarmmodule-2-avant -->

```kotlin
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("JunixAlarm")

```

Remplacer par :

<!-- bloc: mod-junixalarmmodule-2-apres -->

```kotlin
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  // ─── A sound of the phone (sheet 037): a page of Android answers later ─────────
  private companion object {
    const val PICK_RINGTONE = 4_211
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
    val name = if (kind == "ringtone") DeviceSounds.ringtoneTitle(context, uri) else DeviceSounds.fileTitle(context, uri)
    return mapOf("uri" to uri.toString(), "name" to name, "kind" to kind)
  }

  override fun definition() = ModuleDefinition {
    Name("JunixAlarm")

```

Changement 3 sur 3. Chercher :

<!-- bloc: mod-junixalarmmodule-3-avant -->

```kotlin
      }
    }

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
```

Remplacer par :

<!-- bloc: mod-junixalarmmodule-3-apres -->

```kotlin
      }
    }

    /** The list of the ringtones of Android (alarms and ringtones); null when nothing is chosen. */
    AsyncFunction("pickRingtone") { current: String?, promise: Promise ->
      val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM or RingtoneManager.TYPE_RINGTONE)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
        .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, false)
      if (!current.isNullOrEmpty()) intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(current))
      open(intent, PICK_RINGTONE, promise)
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
      if (payload.requestCode != PICK_RINGTONE && payload.requestCode != PICK_MUSIC) return@OnActivityResult
      pending = null
      if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
        promise.resolve(null)
        return@OnActivityResult
      }
      val data = payload.data!!
      if (payload.requestCode == PICK_RINGTONE) {
        @Suppress("DEPRECATION")
        val uri = data.getParcelableExtra<Uri>(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
        promise.resolve(uri?.let { picked(it, "ringtone") })
      } else {
        val uri = data.data
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
    }

    /** Stops the alarm ringing now (the app opened it, for instance). */
    Function("stopRinging") {
      if (AlarmService.current != null) {
```

#### `modules/junix-alarm/index.ts`


Changement 1 sur 3. Chercher :

<!-- bloc: mod-index-1-avant -->

```ts
  kindLabel: string;
  /** "Ouvrir dans Junix" (sheet 035). */
  openLabel: string;
}

interface JunixAlarmNative {
```

Remplacer par :

<!-- bloc: mod-index-1-apres -->

```ts
  kindLabel: string;
  /** "Ouvrir dans Junix" (sheet 035). */
  openLabel: string;
  /** A sound of the phone (content://…), rung first; `sound` is the safety net (sheet 037). */
  soundUri: string;
}

/** A sound of the phone chosen for the alarms (sheet 037). */
export interface PickedSound {
  uri: string;
  name: string;
  kind: 'ringtone' | 'music';
}

interface JunixAlarmNative {
```

Changement 2 sur 3. Chercher :

<!-- bloc: mod-index-2-avant -->

```ts
  stopRinging(): void;
  canUseFullScreen(): boolean;
  openFullScreenSettings(): boolean;
}

const native = requireOptionalNativeModule<JunixAlarmNative>('JunixAlarm');
```

Remplacer par :

<!-- bloc: mod-index-2-apres -->

```ts
  stopRinging(): void;
  canUseFullScreen(): boolean;
  openFullScreenSettings(): boolean;
  pickRingtone(current: string | null): Promise<PickedSound | null>;
  pickMusic(): Promise<PickedSound | null>;
  previewUri(uri: string, durationMs: number): boolean;
  stopPreview(): void;
}

const native = requireOptionalNativeModule<JunixAlarmNative>('JunixAlarm');
```

Changement 3 sur 3. Chercher :

<!-- bloc: mod-index-3-avant -->

```ts
    return native ? native.canUseFullScreen() : null;
  },

  /** Opens the page of Android to allow it; false when it could not be opened. */
  openFullScreenSettings(): boolean {
    return native ? native.openFullScreenSettings() : false;
```

Remplacer par :

<!-- bloc: mod-index-3-apres -->

```ts
    return native ? native.canUseFullScreen() : null;
  },

  /** The list of the ringtones of Android; null when nothing is chosen or without the module (sheet 037). */
  async pickRingtone(current: string | null): Promise<PickedSound | null> {
    return native ? native.pickRingtone(current) : null;
  },

  /** A file of music, kept readable for the alarms; null when nothing is chosen. */
  async pickMusic(): Promise<PickedSound | null> {
    return native ? native.pickMusic() : null;
  },

  /** Plays a sound of the phone a few seconds; false when it cannot be read. */
  previewUri(uri: string, durationMs = 6000): boolean {
    return native ? native.previewUri(uri, durationMs) : false;
  },

  stopPreview(): void {
    native?.stopPreview();
  },

  /** Opens the page of Android to allow it; false when it could not be opened. */
  openFullScreenSettings(): boolean {
    return native ? native.openFullScreenSettings() : false;
```

#### `src/services/alarm-bridge.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: alarm-bridge-1-avant -->

```ts

import { JunixAlarm } from '../../modules/junix-alarm';
import type { AlarmHandover } from '../domain/rules/alarm-handover-rules';
import { logger } from '../utils/logger';

/** Whether this phone has the alarm of Junix. */
```

Remplacer par :

<!-- bloc: alarm-bridge-1-apres -->

```ts

import { JunixAlarm } from '../../modules/junix-alarm';
import type { AlarmHandover } from '../domain/rules/alarm-handover-rules';
import type { DeviceSound } from '../domain/rules/sound-rules';
import { logger } from '../utils/logger';

/** Whether this phone has the alarm of Junix. */
```

Changement 2 sur 2. Chercher :

<!-- bloc: alarm-bridge-2-avant -->

```ts
  return nativeAlarmsOn() ? JunixAlarm.openFullScreenSettings() : false;
}

/** The alarms of one group become exactly these; true when Android took them. */
export async function handOverAlarms(group: 'reminder' | 'item' | 'habit', alarms: AlarmHandover[]): Promise<boolean> {
  if (!nativeAlarmsOn()) return false;
```

Remplacer par :

<!-- bloc: alarm-bridge-2-apres -->

```ts
  return nativeAlarmsOn() ? JunixAlarm.openFullScreenSettings() : false;
}

/** A sound of the phone for the alarms (sheet 037): a ringtone of Android, or a music; null if none. */
export async function pickPhoneSound(kind: 'ringtone' | 'music', current: string | null): Promise<DeviceSound | null> {
  if (!nativeAlarmsOn()) return null;
  try {
    const picked = kind === 'ringtone' ? await JunixAlarm.pickRingtone(current) : await JunixAlarm.pickMusic();
    return picked && picked.uri.startsWith('content://') ? { kind: picked.kind, uri: picked.uri, name: picked.name } : null;
  } catch (error) {
    logger.warn('[AlarmBridge] Choix du son du téléphone impossible', error);
    return null;
  }
}

/** Hears a sound of the phone a few seconds, on the alarm volume. */
export function previewPhoneSound(uri: string): void {
  if (nativeAlarmsOn()) JunixAlarm.previewUri(uri, 6000);
}

/** The alarms of one group become exactly these; true when Android took them. */
export async function handOverAlarms(group: 'reminder' | 'item' | 'habit', alarms: AlarmHandover[]): Promise<boolean> {
  if (!nativeAlarmsOn()) return false;
```


### Étape 3 — La règle : gardé, relu, et seulement pour les alarmes

**Pourquoi** : Le son du téléphone est gardé avec les autres sons (`device=ringtone|…|Argon`, l'adresse et le nom encodés pour que « ; » et « | » n'y cassent rien) ; une adresse qui n'est pas un contenu du téléphone est ignorée. Le son de Junix d'Urgente reste à côté : c'est le filet. `deviceSoundFor` ne le donne qu'à une alarme, son allumé. Les trois synchronisations le confient au module avec chaque alarme.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-037.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/domain/rules/sound-rules.ts`


Changement 1 sur 3. Chercher :

<!-- bloc: sound-rules-1-avant -->

```ts
  alarm: ['alarm', 'wake', 'dawn', 'march'],
};

export interface SoundPrefs {
  discreet: SoundChoice;
  normal: SoundChoice;
  alarm: SoundChoice;
  /** A festive or sober moment keeps the sound of its tone. */
  momentTones: boolean;
}

export const DEFAULT_SOUND_PREFS: Readonly<SoundPrefs> = { discreet: 'soft', normal: 'pulse', alarm: 'alarm', momentTones: true };
```

Remplacer par :

<!-- bloc: sound-rules-1-apres -->

```ts
  alarm: ['alarm', 'wake', 'dawn', 'march'],
};

/** A sound of the phone for the alarms (study 16.10; sheet 037): a ringtone of Android, or a music. */
export interface DeviceSound {
  kind: 'ringtone' | 'music';
  /** Its address on the phone (content://…). */
  uri: string;
  /** Its name, as the phone gives it ("Argon", "Mon titre"). */
  name: string;
}

export interface SoundPrefs {
  discreet: SoundChoice;
  normal: SoundChoice;
  /** The sound of Junix of the alarms; with a sound of the phone, its safety net. */
  alarm: SoundChoice;
  /** A festive or sober moment keeps the sound of its tone. */
  momentTones: boolean;
  /** The sound of the phone the alarms ring with, rather than `alarm` (sheet 037). */
  alarmDevice?: DeviceSound;
}

export const DEFAULT_SOUND_PREFS: Readonly<SoundPrefs> = { discreet: 'soft', normal: 'pulse', alarm: 'alarm', momentTones: true };
```

Changement 2 sur 3. Chercher :

<!-- bloc: sound-rules-2-avant -->

```ts
  for (const pair of (text ?? '').split(';')) {
    const [key, value] = pair.split('=').map(part => part.trim());
    if (key === 'tones') prefs.momentTones = value !== '0';
    else if (key === 'discreet' || key === 'normal' || key === 'alarm') {
      if ((SOUND_CHOICES[key] as readonly string[]).includes(value)) prefs[key] = value as SoundChoice;
    }
```

Remplacer par :

<!-- bloc: sound-rules-2-apres -->

```ts
  for (const pair of (text ?? '').split(';')) {
    const [key, value] = pair.split('=').map(part => part.trim());
    if (key === 'tones') prefs.momentTones = value !== '0';
    else if (key === 'device') {
      const device = deviceSoundOf(value);
      if (device) prefs.alarmDevice = device;
    }
    else if (key === 'discreet' || key === 'normal' || key === 'alarm') {
      if ((SOUND_CHOICES[key] as readonly string[]).includes(value)) prefs[key] = value as SoundChoice;
    }
```

Changement 3 sur 3. Chercher :

<!-- bloc: sound-rules-3-avant -->

```ts
}

export function soundPrefsText(prefs: SoundPrefs): string {
  return `discreet=${prefs.discreet};normal=${prefs.normal};alarm=${prefs.alarm};tones=${prefs.momentTones ? 1 : 0}`;
}

/** The sound of one notification: its level, the tone of its moment if any, the settings. */
```

Remplacer par :

<!-- bloc: sound-rules-3-apres -->

```ts
}

export function soundPrefsText(prefs: SoundPrefs): string {
  const device = prefs.alarmDevice
    ? `;device=${prefs.alarmDevice.kind}|${encodeURIComponent(prefs.alarmDevice.uri)}|${encodeURIComponent(prefs.alarmDevice.name)}`
    : '';
  return `discreet=${prefs.discreet};normal=${prefs.normal};alarm=${prefs.alarm};tones=${prefs.momentTones ? 1 : 0}${device}`;
}

/** "ringtone|content%3A…|Argon": a sound of the phone kept in the settings; anything else, none. */
function deviceSoundOf(text: string | undefined): DeviceSound | undefined {
  const [kind, uri, name] = (text ?? '').split('|');
  if ((kind !== 'ringtone' && kind !== 'music') || !uri) return undefined;
  try {
    const address = decodeURIComponent(uri);
    if (!address.startsWith('content://')) return undefined;
    return { kind, uri: address, name: decodeURIComponent(name ?? '') };
  } catch {
    return undefined;
  }
}

/**
 * The sound of the phone a notification rings with (sheet 037): only an alarm, with the sound on;
 * otherwise none, and the sound of Junix rings.
 */
export function deviceSoundFor({
  level,
  prefs = DEFAULT_SOUND_PREFS,
  soundOn = true,
}: {
  level: NotificationLevel;
  prefs?: SoundPrefs;
  soundOn?: boolean;
}): DeviceSound | undefined {
  return level === 'alarm' && soundOn ? prefs.alarmDevice : undefined;
}

/** The sound of one notification: its level, the tone of its moment if any, the settings. */
```

#### `src/domain/rules/__tests__/sound-rules.test.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: sound-rules-test-1-avant -->

```ts
import {
  DEFAULT_SOUND_PREFS,
  SOUNDS,
  SOUND_CHOICES,
  soundChannelId,
```

Remplacer par :

<!-- bloc: sound-rules-test-1-apres -->

```ts
import {
  DEFAULT_SOUND_PREFS,
  deviceSoundFor,
  SOUNDS,
  SOUND_CHOICES,
  soundChannelId,
```

Changement 2 sur 2. Chercher :

<!-- bloc: sound-rules-test-2-avant -->

```ts
  it('names each file as Android wants it in res/raw', () => {
    for (const sound of Object.values(SOUNDS)) expect(sound.file).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});
```

Remplacer par :

<!-- bloc: sound-rules-test-2-apres -->

```ts
  it('names each file as Android wants it in res/raw', () => {
    for (const sound of Object.values(SOUNDS)) expect(sound.file).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('keeps a sound of the phone for the alarms, with the sound of Junix as safety net (sheet 037)', () => {
    const prefs = {
      ...DEFAULT_SOUND_PREFS,
      alarm: 'wake' as const,
      alarmDevice: { kind: 'music' as const, uri: 'content://media/audio/42', name: 'Mon titre; 2|bis' },
    };
    // Written and read back, even with ";" and "|" in the name
    expect(soundPrefsOf(soundPrefsText(prefs))).toEqual(prefs);
    // An address that is not a content of the phone, or an unknown kind: ignored
    expect(soundPrefsOf('device=music|file%3A%2F%2Fx|a').alarmDevice).toBeUndefined();
    expect(soundPrefsOf('device=video|content%3A%2F%2Fx|a').alarmDevice).toBeUndefined();
    // Only an alarm rings with it, and only with the sound on
    expect(deviceSoundFor({ level: 'alarm', prefs })?.name).toBe('Mon titre; 2|bis');
    expect(deviceSoundFor({ level: 'normal', prefs })).toBeUndefined();
    expect(deviceSoundFor({ level: 'alarm', prefs, soundOn: false })).toBeUndefined();
    // The sound of Junix stays the one of the ordinary notification of an alarm
    expect(soundFor({ level: 'alarm', prefs })).toBe('wake');
  });
});
```

#### `src/domain/rules/alarm-handover-rules.ts`


Changement 1 sur 3. Chercher :

<!-- bloc: alarm-handover-rules-1-avant -->

```ts
  /** What it is, on the page of the alarm (sheet 035). */
  kindLabel: string;
  openLabel: string;
}

/** What rings, for the page of the alarm. */
```

Remplacer par :

<!-- bloc: alarm-handover-rules-1-apres -->

```ts
  /** What it is, on the page of the alarm (sheet 035). */
  kindLabel: string;
  openLabel: string;
  /** A sound of the phone, rung first; `sound` is the safety net (sheet 037). */
  soundUri: string;
}

/** What rings, for the page of the alarm. */
```

Changement 2 sur 3. Chercher :

<!-- bloc: alarm-handover-rules-2-avant -->

```ts
  sound: SoundChoice,
  route: string | null,
  language: AppLanguage,
  kind: AlarmKind = 'reminder'
): AlarmHandover {
  return {
    id: item.identifier,
```

Remplacer par :

<!-- bloc: alarm-handover-rules-2-apres -->

```ts
  sound: SoundChoice,
  route: string | null,
  language: AppLanguage,
  kind: AlarmKind = 'reminder',
  soundUri = ''
): AlarmHandover {
  return {
    id: item.identifier,
```

Changement 3 sur 3. Chercher :

<!-- bloc: alarm-handover-rules-3-avant -->

```ts
    channelName: translate(language, 'alarm.channel'),
    kindLabel: translate(language, `alarm.kind.${kind}`),
    openLabel: translate(language, 'alarm.open'),
  };
}
```

Remplacer par :

<!-- bloc: alarm-handover-rules-3-apres -->

```ts
    channelName: translate(language, 'alarm.channel'),
    kindLabel: translate(language, `alarm.kind.${kind}`),
    openLabel: translate(language, 'alarm.open'),
    soundUri,
  };
}
```

#### `src/services/reminder-notification-service.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: reminder-notification-service-1-avant -->

```ts
import { syncHabitNotifications } from '@/services/habit-notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { soundFor } from '@/domain/rules/sound-rules';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';
```

Remplacer par :

<!-- bloc: reminder-notification-service-1-apres -->

```ts
import { syncHabitNotifications } from '@/services/habit-notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';
```

Changement 2 sur 2. Chercher :

<!-- bloc: reminder-notification-service-2-avant -->

```ts
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'reminder',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/reminders/${item.reminderId}`, language, 'reminder'))
    );
    const planned = handed ? split.notifications : allPlanned;

```

Remplacer par :

<!-- bloc: reminder-notification-service-2-apres -->

```ts
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    // A sound of the phone for the alarms (sheet 037); the sound of Junix stays its safety net
    const deviceUri = deviceSoundFor({ level: 'alarm', prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled })?.uri ?? '';
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'reminder',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/reminders/${item.reminderId}`, language, 'reminder', deviceUri))
    );
    const planned = handed ? split.notifications : allPlanned;

```

#### `src/services/item-notification-service.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: item-notification-service-1-avant -->

```ts
 */

import { ITEM_IDENTIFIER_PREFIX, planItemNotifications, type PlannedItemNotification } from '@/domain/rules/item-notification-rules';
import { soundFor } from '@/domain/rules/sound-rules';
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { EventRepository } from '@/repositories/event-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
```

Remplacer par :

<!-- bloc: item-notification-service-1-apres -->

```ts
 */

import { ITEM_IDENTIFIER_PREFIX, planItemNotifications, type PlannedItemNotification } from '@/domain/rules/item-notification-rules';
import { deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import { levelOf, quietHoursOf } from '@/domain/rules/notification-level-rules';
import { EventRepository } from '@/repositories/event-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
```

Changement 2 sur 2. Chercher :

<!-- bloc: item-notification-service-2-avant -->

```ts
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
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

Remplacer par :

<!-- bloc: item-notification-service-2-apres -->

```ts
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    // A sound of the phone for the alarms (sheet 037); the sound of Junix stays its safety net
    const deviceUri = deviceSoundFor({ level: 'alarm', prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled })?.uri ?? '';
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'item',
      split.alarms.map(item =>
        item.itemType === 'TASK'
          ? alarmOf(item, soundOf(item), `/tasks/${item.itemId}`, language, 'task', deviceUri)
          : alarmOf(item, soundOf(item), `/events/${item.itemId}`, language, 'moment', deviceUri)
      )
    );
    const planned = handed ? split.notifications : allPlanned;
```

#### `src/services/habit-notification-service.ts`


Changement 1 sur 2. Chercher :

<!-- bloc: habit-notification-service-1-avant -->

```ts
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { soundFor } from '@/domain/rules/sound-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';

```

Remplacer par :

<!-- bloc: habit-notification-service-1-apres -->

```ts
import { NotificationService } from '@/services/notification-service';
import { useAppStore } from '@/store/app-store';
import { logger } from '@/utils/logger';
import { deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import { alarmOf, splitAlarms } from '@/domain/rules/alarm-handover-rules';
import { handOverAlarms, nativeAlarmsOn } from '@/services/alarm-bridge';

```

Changement 2 sur 2. Chercher :

<!-- bloc: habit-notification-service-2-avant -->

```ts
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'habit',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/habits/${item.habitId}`, language, 'habit'))
    );
    const planned = handed ? split.notifications : allPlanned;

```

Remplacer par :

<!-- bloc: habit-notification-service-2-apres -->

```ts
    // The Alarm level rings until a gesture, through the alarm of Junix (sheet 034); if Android
    // does not take them, they stay notifications
    const language = useAppStore.getState().language;
    // A sound of the phone for the alarms (sheet 037); the sound of Junix stays its safety net
    const deviceUri = deviceSoundFor({ level: 'alarm', prefs: settings.soundPrefs, soundOn: settings.notificationSoundEnabled })?.uri ?? '';
    const split = splitAlarms(allPlanned, nativeAlarmsOn());
    const handed = await handOverAlarms(
      'habit',
      split.alarms.map(item => alarmOf(item, soundOf(item.level), `/habits/${item.habitId}`, language, 'habit', deviceUri))
    );
    const planned = handed ? split.notifications : allPlanned;

```


### Étape 4 — Les écrans : « Du téléphone », la liste, « Sonnera »

**Pourquoi** : Dans la fenêtre « Son des urgences », sous les sons de Junix : « **Du téléphone** », le son choisi (« Sonnerie · Argon », « Musique · Mon titre ») avec ▶, puis « Une sonnerie du téléphone… » et « Une musique… ». Choisir un son de Junix laisse le son du téléphone. La ligne Urgente des Paramètres dit « Argon · téléphone », et la ligne « Sonnera » des formulaires donne son nom (▶ le joue depuis le téléphone). Tout cela n'apparaît que là où l'alarme de Junix existe : pas sur le web.

Repère (Ctrl+F) : la première ligne de chaque bloc « Chercher ». Le script `appliquer-fiche-037.js` fait tous ces changements d'un coup, et refuse d'écrire si un bloc ne se trouve pas exactement une fois.

#### `src/components/settings/SoundSetting.tsx`


Changement 1 sur 6. Chercher :

<!-- bloc: soundsetting-1-avant -->

```tsx
import type { ThemePalette } from '@/constants/palettes';
import { Spacing, Typography } from '@/constants/theme';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { SOUNDS, SOUND_CHOICES, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT, type MessageKey } from '@/i18n';
```

Remplacer par :

<!-- bloc: soundsetting-1-apres -->

```tsx
import type { ThemePalette } from '@/constants/palettes';
import { Spacing, Typography } from '@/constants/theme';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { SOUNDS, SOUND_CHOICES, type DeviceSound, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT, type MessageKey } from '@/i18n';
```

Changement 2 sur 6. Chercher :

<!-- bloc: soundsetting-2-avant -->

```tsx
  value,
  onChange,
  onPreview,
}: {
  value: SoundPrefs;
  onChange: (prefs: SoundPrefs) => void;
  onPreview: (sound: SoundChoice) => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [picking, setPicking] = useState<NotificationLevel | null>(null);
  const [ticked, setTicked] = useState<SoundChoice>('pulse');
  const nameOf = (sound: SoundChoice) => t(sound === 'none' ? 'sound.none' : SOUNDS[sound].labelKey);

  const open = (level: NotificationLevel) => {
    setTicked(value[level]);
    setPicking(level);
  };
  const choose = () => {
    if (picking && ticked !== value[picking]) onChange({ ...value, [picking]: ticked });
    setPicking(null);
  };

  return (
    <View>
```

Remplacer par :

<!-- bloc: soundsetting-2-apres -->

```tsx
  value,
  onChange,
  onPreview,
  onPickPhone,
  onPreviewPhone,
}: {
  value: SoundPrefs;
  onChange: (prefs: SoundPrefs) => void;
  onPreview: (sound: SoundChoice) => void;
  /** A sound of the phone for the urgent ones (sheet 037); absent where the alarm of Junix is not. */
  onPickPhone?: (kind: DeviceSound['kind'], current: string | null) => Promise<DeviceSound | null>;
  onPreviewPhone?: (uri: string) => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [picking, setPicking] = useState<NotificationLevel | null>(null);
  // A sound of Junix, or "device": the sound of the phone below (sheet 037)
  const [ticked, setTicked] = useState<SoundChoice | 'device'>('pulse');
  const [draftDevice, setDraftDevice] = useState<DeviceSound | undefined>(undefined);
  const nameOf = (sound: SoundChoice) => t(sound === 'none' ? 'sound.none' : SOUNDS[sound].labelKey);
  const phoneName = (device: DeviceSound) =>
    t(device.kind === 'ringtone' ? 'soundSettings.ringtoneName' : 'soundSettings.musicName', { name: device.name || '…' });
  /** What the row of a level says: the sound of the phone for the urgent ones, when chosen. */
  const rowValue = (level: NotificationLevel) =>
    level === 'alarm' && value.alarmDevice ? t('soundSettings.phoneValue', { name: value.alarmDevice.name || '…' }) : nameOf(value[level]);

  const open = (level: NotificationLevel) => {
    const phone = level === 'alarm' ? value.alarmDevice : undefined;
    setDraftDevice(phone);
    setTicked(phone ? 'device' : value[level]);
    setPicking(level);
  };
  const choose = () => {
    if (picking === 'alarm' && ticked === 'device' && draftDevice) {
      if (draftDevice.uri !== value.alarmDevice?.uri) onChange({ ...value, alarmDevice: draftDevice });
    } else if (picking && ticked !== 'device') {
      // A sound of Junix: the sound of the phone is let go
      const leavesPhone = picking === 'alarm' && value.alarmDevice !== undefined;
      if (ticked !== value[picking] || leavesPhone) onChange({ ...value, [picking]: ticked, ...(picking === 'alarm' ? { alarmDevice: undefined } : {}) });
    }
    setPicking(null);
  };
  const pickPhone = async (kind: DeviceSound['kind']) => {
    if (!onPickPhone) return;
    const picked = await onPickPhone(kind, draftDevice?.kind === kind ? draftDevice.uri : null);
    if (!picked) return;
    setDraftDevice(picked);
    setTicked('device');
    onPreviewPhone?.(picked.uri);
  };

  return (
    <View>
```

Changement 3 sur 6. Chercher :

<!-- bloc: soundsetting-3-avant -->

```tsx
            style={[styles.row, index > 0 && styles.rowLine]}
            onPress={() => open(level)}
            accessibilityRole="button"
            accessibilityLabel={`${t(ROW_LABELS[level])}, ${nameOf(value[level])}`}
            testID={`sound-row-${level}`}
          >
            <Ionicons
```

Remplacer par :

<!-- bloc: soundsetting-3-apres -->

```tsx
            style={[styles.row, index > 0 && styles.rowLine]}
            onPress={() => open(level)}
            accessibilityRole="button"
            accessibilityLabel={`${t(ROW_LABELS[level])}, ${rowValue(level)}`}
            testID={`sound-row-${level}`}
          >
            <Ionicons
```

Changement 4 sur 6. Chercher :

<!-- bloc: soundsetting-4-avant -->

```tsx
              color={urgent ? palette.error.default : palette.onSurface.variant}
            />
            <Text style={[styles.rowLabel, urgent && { color: palette.error.default }]}>{t(ROW_LABELS[level])}</Text>
            <Text style={styles.rowValue}>{nameOf(value[level])}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
          </TouchableOpacity>
        );
```

Remplacer par :

<!-- bloc: soundsetting-4-apres -->

```tsx
              color={urgent ? palette.error.default : palette.onSurface.variant}
            />
            <Text style={[styles.rowLabel, urgent && { color: palette.error.default }]}>{t(ROW_LABELS[level])}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{rowValue(level)}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
          </TouchableOpacity>
        );
```

Changement 5 sur 6. Chercher :

<!-- bloc: soundsetting-5-avant -->

```tsx
                );
              })}
            </View>
            <View style={styles.actions}>
              <Button label={t('common.cancel')} onPress={() => setPicking(null)} variant="secondary" style={styles.action} />
              <Button label={t('soundSettings.choose')} onPress={choose} style={styles.action} testID="sound-picker-choose" />
```

Remplacer par :

<!-- bloc: soundsetting-5-apres -->

```tsx
                );
              })}
            </View>
            {/* The sounds of the phone, for the urgent ones (sheet 037) */}
            {picking === 'alarm' && onPickPhone ? (
              <>
                <Text style={styles.section}>{t('soundSettings.fromPhone')}</Text>
                <View style={styles.list}>
                  {draftDevice ? (
                    <View style={styles.choice}>
                      <TouchableOpacity
                        style={styles.choiceMain}
                        onPress={() => {
                          setTicked('device');
                          onPreviewPhone?.(draftDevice.uri);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: ticked === 'device' }}
                        testID="sound-choice-device"
                      >
                        <Ionicons
                          name={ticked === 'device' ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={ticked === 'device' ? palette.primary.default : palette.onSurface.disabled}
                        />
                        <Text style={[styles.choiceLabel, ticked === 'device' && { color: palette.primary.default }]} numberOfLines={1}>
                          {phoneName(draftDevice)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onPreviewPhone?.(draftDevice.uri)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={t('soundSettings.play', { sound: phoneName(draftDevice) })}
                      >
                        <Ionicons name="play-circle-outline" size={26} color={palette.primary.default} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {(['ringtone', 'music'] as const).map((kind, index) => (
                    <TouchableOpacity
                      key={kind}
                      style={[styles.choice, (index > 0 || draftDevice) && styles.rowLine]}
                      onPress={() => void pickPhone(kind)}
                      accessibilityRole="button"
                      testID={`sound-pick-${kind}`}
                    >
                      <Ionicons name={kind === 'ringtone' ? 'notifications-circle-outline' : 'musical-notes-outline'} size={22} color={palette.onSurface.variant} />
                      <Text style={[styles.choiceLabel, { flex: 1 }]}>
                        {t(kind === 'ringtone' ? 'soundSettings.pickRingtone' : 'soundSettings.pickMusic')}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
            <View style={styles.actions}>
              <Button label={t('common.cancel')} onPress={() => setPicking(null)} variant="secondary" style={styles.action} />
              <Button label={t('soundSettings.choose')} onPress={choose} style={styles.action} testID="sound-picker-choose" />
```

Changement 6 sur 6. Chercher :

<!-- bloc: soundsetting-6-avant -->

```tsx
    rowValue: { ...Typography.bodyMedium, color: theme.onSurface.variant },
    title: { ...Typography.titleMedium, color: theme.onSurface.primary, marginBottom: Spacing.sm },
    list: { marginBottom: Spacing.md },
    choice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52 },
    choiceMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
    choiceLabel: { ...Typography.bodyLarge, color: theme.onSurface.primary },
```

Remplacer par :

<!-- bloc: soundsetting-6-apres -->

```tsx
    rowValue: { ...Typography.bodyMedium, color: theme.onSurface.variant },
    title: { ...Typography.titleMedium, color: theme.onSurface.primary, marginBottom: Spacing.sm },
    list: { marginBottom: Spacing.md },
    section: { ...Typography.bodyMedium, color: theme.onSurface.variant, marginBottom: Spacing.xs },
    choice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52 },
    choiceMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
    choiceLabel: { ...Typography.bodyLarge, color: theme.onSurface.primary },
```

#### `src/app/settings/index.tsx`


Changement 1 sur 2. Chercher :

<!-- bloc: index-1-avant -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AlertDefaultsSetting } from '@/components/settings/AlertDefaultsSetting';
import { SoundSetting } from '@/components/settings/SoundSetting';
import { fullScreenAlarmsAllowed, openFullScreenAlarmSettings } from '@/services/alarm-bridge';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { DEFAULT_SOUND_PREFS, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { NotificationSoundService } from '@/services/sound/NotificationSoundService';
```

Remplacer par :

<!-- bloc: index-1-apres -->

```tsx
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AlertDefaultsSetting } from '@/components/settings/AlertDefaultsSetting';
import { SoundSetting } from '@/components/settings/SoundSetting';
import { fullScreenAlarmsAllowed, openFullScreenAlarmSettings, pickPhoneSound, previewPhoneSound } from '@/services/alarm-bridge';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { DEFAULT_SOUND_PREFS, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { NotificationSoundService } from '@/services/sound/NotificationSoundService';
```

Changement 2 sur 2. Chercher :

<!-- bloc: index-2-avant -->

```tsx
            value={settings.soundPrefs ?? DEFAULT_SOUND_PREFS}
            onChange={handleUpdateSounds}
            onPreview={handlePreviewSound}
          />
        </View>
      )}
```

Remplacer par :

<!-- bloc: index-2-apres -->

```tsx
            value={settings.soundPrefs ?? DEFAULT_SOUND_PREFS}
            onChange={handleUpdateSounds}
            onPreview={handlePreviewSound}
            // The sounds of the phone, where the alarm of Junix exists (sheet 037)
            onPickPhone={fullScreenAlarms !== null ? pickPhoneSound : undefined}
            onPreviewPhone={fullScreenAlarms !== null ? previewPhoneSound : undefined}
          />
        </View>
      )}
```

#### `src/components/create/form/PriorityField.tsx`


Changement 1 sur 3. Chercher :

<!-- bloc: priorityfield-1-avant -->

```tsx
import type { MomentKind, ReminderPriority, Settings } from '@/domain/entities';
import { MOMENT_KIND_TONES, momentKindOf } from '@/domain/rules/moment-kind-rules';
import { notificationLevelFor, type NotificationMoment } from '@/domain/rules/notification-level-rules';
import { SOUNDS, soundFor } from '@/domain/rules/sound-rules';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { useTheme } from '@/hooks/use-theme';
import { useT, type MessageKey } from '@/i18n';
```

Remplacer par :

<!-- bloc: priorityfield-1-apres -->

```tsx
import type { MomentKind, ReminderPriority, Settings } from '@/domain/entities';
import { MOMENT_KIND_TONES, momentKindOf } from '@/domain/rules/moment-kind-rules';
import { notificationLevelFor, type NotificationMoment } from '@/domain/rules/notification-level-rules';
import { SOUNDS, deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import { previewPhoneSound } from '@/services/alarm-bridge';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { useTheme } from '@/hooks/use-theme';
import { useT, type MessageKey } from '@/i18n';
```

Changement 2 sur 3. Chercher :

<!-- bloc: priorityfield-2-avant -->

```tsx
    ? soundFor({ level, tone, prefs: settings?.soundPrefs, soundOn: settings ? settings.notificationSoundEnabled : true })
    : null;
  const alarm = level === 'alarm';
  const lineColor = alarm ? palette.error.default : palette.onSurface.variant;

  return (
```

Remplacer par :

<!-- bloc: priorityfield-2-apres -->

```tsx
    ? soundFor({ level, tone, prefs: settings?.soundPrefs, soundOn: settings ? settings.notificationSoundEnabled : true })
    : null;
  const alarm = level === 'alarm';
  // An alarm with a sound of the phone (sheet 037): its name, and it is heard from the phone
  const phone = level ? deviceSoundFor({ level, prefs: settings?.soundPrefs, soundOn: settings ? settings.notificationSoundEnabled : true }) : undefined;
  const soundName = phone ? phone.name || '…' : sound && sound !== 'none' ? t(SOUNDS[sound].labelKey) : '';
  const lineColor = alarm ? palette.error.default : palette.onSurface.variant;

  return (
```

Changement 3 sur 3. Chercher :

<!-- bloc: priorityfield-3-avant -->

```tsx
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }} testID={testIDPrefix ? `${testIDPrefix}-rings` : undefined}>
          <Ionicons name={sound === 'none' ? 'notifications-off-outline' : alarm ? 'alarm-outline' : 'notifications-outline'} size={16} color={lineColor} />
          <Text style={{ flex: 1, fontSize: 13, color: lineColor }}>
            {sound === 'none' ? t('priorityField.silent') : t('priorityField.rings', { sound: t(SOUNDS[sound].labelKey) })}
          </Text>
          {sound !== 'none' && (
            <TouchableOpacity
              onPress={() => void NotificationSoundService.preview(sound, 6000)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('soundSettings.play', { sound: t(SOUNDS[sound].labelKey) })}
            >
              <Ionicons name="play-circle-outline" size={24} color={alarm ? palette.error.default : accent} />
            </TouchableOpacity>
```

Remplacer par :

<!-- bloc: priorityfield-3-apres -->

```tsx
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }} testID={testIDPrefix ? `${testIDPrefix}-rings` : undefined}>
          <Ionicons name={sound === 'none' ? 'notifications-off-outline' : alarm ? 'alarm-outline' : 'notifications-outline'} size={16} color={lineColor} />
          <Text style={{ flex: 1, fontSize: 13, color: lineColor }}>
            {sound === 'none' ? t('priorityField.silent') : t('priorityField.rings', { sound: soundName })}
          </Text>
          {sound !== 'none' && (
            <TouchableOpacity
              onPress={() => (phone ? previewPhoneSound(phone.uri) : void NotificationSoundService.preview(sound, 6000))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('soundSettings.play', { sound: soundName })}
            >
              <Ionicons name="play-circle-outline" size={24} color={alarm ? palette.error.default : accent} />
            </TouchableOpacity>
```

#### `src/i18n/messages-rest-fr.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-fr-1-avant -->

```ts
  'soundSettings.pickLow': "Son de la priorité faible",
  'soundSettings.pickNormal': "Son des priorités normale et haute",
  'soundSettings.pickUrgent': "Son des urgences",
  'soundSettings.choose': "Choisir",
  'soundSettings.discreet': 'Notifications discrètes',
  'soundSettings.normal': 'Notifications normales',
```

Remplacer par :

<!-- bloc: messages-rest-fr-1-apres -->

```ts
  'soundSettings.pickLow': "Son de la priorité faible",
  'soundSettings.pickNormal': "Son des priorités normale et haute",
  'soundSettings.pickUrgent': "Son des urgences",
  'soundSettings.fromPhone': "Du téléphone",
  'soundSettings.pickRingtone': "Une sonnerie du téléphone…",
  'soundSettings.pickMusic': "Une musique…",
  'soundSettings.ringtoneName': "Sonnerie · {name}",
  'soundSettings.musicName': "Musique · {name}",
  'soundSettings.phoneValue': "{name} · téléphone",
  'soundSettings.choose': "Choisir",
  'soundSettings.discreet': 'Notifications discrètes',
  'soundSettings.normal': 'Notifications normales',
```

#### `src/i18n/messages-rest-en.ts`


Changement 1 sur 1. Chercher :

<!-- bloc: messages-rest-en-1-avant -->

```ts
  'soundSettings.pickLow': "Sound of low priority",
  'soundSettings.pickNormal': "Sound of normal and high priority",
  'soundSettings.pickUrgent': "Sound of urgent ones",
  'soundSettings.choose': "Choose",
  'soundSettings.discreet': 'Quiet notifications',
  'soundSettings.normal': 'Normal notifications',
```

Remplacer par :

<!-- bloc: messages-rest-en-1-apres -->

```ts
  'soundSettings.pickLow': "Sound of low priority",
  'soundSettings.pickNormal': "Sound of normal and high priority",
  'soundSettings.pickUrgent': "Sound of urgent ones",
  'soundSettings.fromPhone': "From the phone",
  'soundSettings.pickRingtone': "A ringtone of the phone…",
  'soundSettings.pickMusic': "A music…",
  'soundSettings.ringtoneName': "Ringtone · {name}",
  'soundSettings.musicName': "Music · {name}",
  'soundSettings.phoneValue': "{name} · phone",
  'soundSettings.choose': "Choose",
  'soundSettings.discreet': 'Quiet notifications',
  'soundSettings.normal': 'Normal notifications',
```


## 8. Test final

| Contrôle | Résultat attendu |
|---|---|
| `npx jest` | tout passe, dont « keeps a sound of the phone for the alarms, with the sound of Junix as safety net » |
| `./gradlew :junix-alarm:compileReleaseKotlin`, puis l'APK | `BUILD SUCCESSFUL` |
| Web : Paramètres → Sons → Urgente | la fenêtre des sons de Junix, sans « Du téléphone » ; aucune erreur |
| **Téléphone** : Sons → Urgente → « Une sonnerie du téléphone… » | la liste d'Android ; en choisir une : elle s'entend, s'affiche « Sonnerie · … » cochée ; « Choisir » |
| La ligne Urgente | « … · téléphone » |
| « Une musique… » | le sélecteur de fichiers ; une musique : « Musique · … » |
| Un rappel Urgente dans 2 minutes | il sonne avec ce son, en boucle, de plus en plus fort |
| Supprimer la musique, puis une alarme | le son de Junix sonne à sa place |
| Choisir de nouveau « Alarme » | le son du téléphone est laissé |

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| « Du téléphone » n'apparaît pas | pas d'alarme Junix ici (web, ancien APK) | refaire l'APK |
| L'alarme sonne avec le son de Junix, pas la musique | la musique a été supprimée, ou l'appli qui l'a donnée ne laisse pas d'accès durable | la choisir de nouveau, depuis « Fichiers » ou « Musique » |

## 10. Retour en arrière

`git checkout -- <fichiers de la section 5>`, supprimer `DeviceSounds.kt`, refaire l'APK. Un son du téléphone déjà choisi reste écrit dans les réglages mais n'est plus lu : les alarmes reprennent le son de Junix.

## 11. Lexique

| Mot | En une phrase |
|---|---|
| Adresse `content://` | la façon d'Android de désigner un fichier ou un son, sans donner son chemin |
| Droit durable | la permission, gardée par Android, de relire un fichier choisi même après la fermeture de l'appli |
| Filet | le son de Junix qui sonne quand celui du téléphone ne peut pas être lu |

## 12. Et après

1. Commit, APK, essai sur le téléphone.
2. Le chantier n° 9 est terminé. Selon la feuille de route : **n° 10**, un compte facultatif et la synchronisation ; puis **n° 11**, personnaliser le design ; **n° 12**, l'onboarding.

## Compte rendu d'exécution (27 novembre 2026)

- Lu avant d'écrire : comment `expo-document-picker` (installé) ouvre une page d'Android et reçoit sa réponse (`startActivityForResult`, `OnActivityResult`) ; nous faisons pareil, avec le sélecteur d'Android qui garde l'accès au fichier.
- Appliquée à partir des blocs de cette fiche (`appliquer-fiche-037.js`), puis rejouée sur une copie propre : `src` et le module sont identiques.
- Tests : `Test Suites: 106 passed`, `Tests: 2154 passed` ; `tsc` et `eslint` sans erreur. Compilation du module réussie.
- **Vérifié sur le web** : la fenêtre « Son des urgences » s'ouvre avec les sons de Junix, sans « Du téléphone » ; la console est vide.
- **Pas vérifié** : tout ce qui touche au téléphone (la liste des sonneries, le sélecteur, l'écoute, l'alarme avec ce son, le filet). Rien n'est encore enregistré dans git.
