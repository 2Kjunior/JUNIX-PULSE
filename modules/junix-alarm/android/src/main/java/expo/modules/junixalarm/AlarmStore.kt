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
