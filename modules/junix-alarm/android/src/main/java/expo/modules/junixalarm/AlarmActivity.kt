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
