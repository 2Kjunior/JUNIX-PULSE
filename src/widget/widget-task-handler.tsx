/**
 * Draws the home screen widget, when Android asks (added, every 30 minutes, resized) and when
 * the app asks after a change. It reads the database like the app does, in the language and
 * the theme chosen in the app (the phone's when the app follows it).
 */

import { addDays, format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { Appearance, Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { AppearanceMode } from '@/domain/entities';
import { resolveLanguage } from '@/domain/rules/language-rules';
import {
  buildTodayWidgetData,
  TODAY_WIDGET_NAME,
  TodayWidgetData,
  todayWidgetMood,
  todayWidgetProgress,
} from '@/domain/rules/widget-rules';
import { translate } from '@/i18n/translate';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { deviceLanguageTags } from '@/services/language-service';
import { logger } from '@/utils/logger';

import { TodayWidget, TodayWidgetTexts, WidgetTheme } from './TodayWidget';
import type { MascotMood } from '@/domain/rules/mascot-mood-rules';

function themeOf(mode: AppearanceMode): WidgetTheme {
  if (mode === 'light' || mode === 'dark') return mode;
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

function messageKey(data: TodayWidgetData, mood: MascotMood) {
  if (mood === 'sleepy') return translateKey('widget.msg.night');
  if (mood === 'happy') return translateKey('widget.msg.done');
  if (mood === 'worried') return translateKey('widget.msg.busy');
  if (data.tasksLeft === 1) return translateKey('widget.msg.oneTask');
  if (data.tasksLeft > 1) return translateKey('widget.msg.tasks');
  return translateKey('widget.msg.free');
}

// Keeps the keys checked by the compiler while choosing them in plain functions
const translateKey = <K extends Parameters<typeof translate>[1]>(key: K) => key;

interface WidgetContent {
  texts: TodayWidgetTexts;
  theme: WidgetTheme;
  mood: MascotMood;
  progress: number;
}

export async function loadTodayWidget(now = new Date()): Promise<WidgetContent> {
  const [settings, reminders, tasks] = await Promise.all([
    SettingsRepository.get(),
    ReminderRepository.findAll(),
    TaskRepository.findAllForDate(format(now, 'yyyy-MM-dd')),
  ]);
  const language = resolveLanguage(settings.language, deviceLanguageTags());
  const locale = language === 'en' ? enUS : fr;
  const say = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(language, key, params);

  const data = buildTodayWidgetData(reminders, tasks, now);
  const mood = todayWidgetMood(data, now.getHours());
  const next = data.nextReminder;
  // "Aujourd'hui", "Demain", or the day of the week of the next reminder
  const nextDay = !next
    ? say('widget.remindersLabel')
    : next.today
      ? say('widget.nextToday')
      : next.at.toDateString() === addDays(now, 1).toDateString()
        ? say('widget.nextTomorrow')
        : say('widget.nextLater', { day: format(next.at, 'EEEE', { locale }) });

  return {
    theme: themeOf(settings.appearanceMode),
    mood,
    progress: todayWidgetProgress(data),
    texts: {
      brand: 'Junix Pulse',
      date: format(now, 'EEE d MMM', { locale }),
      message: say(messageKey(data, mood), { count: data.tasksLeft + data.remindersLeftToday, tasks: data.tasksLeft }),
      nextLabel: nextDay.toUpperCase(),
      nextTitle: next ? next.title : say('widget.noReminder'),
      nextTime: next ? next.time : '',
      progress:
        data.tasksTotal === 0
          ? say('widget.noTask')
          : say('widget.progress', { done: data.tasksDone, total: data.tasksTotal }),
      capture: say('widget.capture'),
    },
  };
}

function render(content: WidgetContent) {
  return <TodayWidget texts={content.texts} theme={content.theme} mood={content.mood} progress={content.progress} />;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== TODAY_WIDGET_NAME || props.widgetAction === 'WIDGET_DELETED') return;
  try {
    props.renderWidget(render(await loadTodayWidget()));
  } catch (error) {
    logger.warn('[Widget] Widget non dessiné', error);
  }
}

/** Draws the widget again after a change in the app; nothing happens without a widget placed. */
export async function refreshTodayWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const content = await loadTodayWidget();
    await requestWidgetUpdate({ widgetName: TODAY_WIDGET_NAME, renderWidget: () => render(content) });
  } catch (error) {
    logger.warn('[Widget] Mise à jour du widget impossible', error);
  }
}
