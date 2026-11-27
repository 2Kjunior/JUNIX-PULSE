/**
 * "Priorité" in the forms (study 001, 16.8; sheet 032): Faible · Normale · Haute · Urgente, the
 * only choice about how it rings. Under it, one line says what will ring, with ▶ to hear it: the
 * priority chooses the level (Urgente is an alarm, Faible is discreet), and the settings the sound.
 * Shared by the "To do" form (a task, a reminder) and the "Moment" form.
 */
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import { Spacing } from '@/constants/theme';
import type { MomentKind, ReminderPriority, Settings } from '@/domain/entities';
import { MOMENT_KIND_TONES, momentKindOf } from '@/domain/rules/moment-kind-rules';
import { notificationLevelFor, type NotificationMoment } from '@/domain/rules/notification-level-rules';
import { SOUNDS, deviceSoundFor, soundFor } from '@/domain/rules/sound-rules';
import { previewPhoneSound } from '@/services/alarm-bridge';
import { offerExactAlarmsForAlarmLevel } from '@/features/reminders/offer-exact-alarms';
import { useTheme } from '@/hooks/use-theme';
import { useT, type MessageKey } from '@/i18n';
import { SettingsRepository } from '@/repositories/settings-repository';
import { NotificationSoundService } from '@/services/sound/NotificationSoundService';

export const PRIORITY_CHOICES: readonly { value: ReminderPriority; labelKey: MessageKey }[] = [
  { value: 'LOW', labelKey: 'form.priority.low' },
  { value: 'NORMAL', labelKey: 'priority.normal' },
  { value: 'HIGH', labelKey: 'priority.high' },
  { value: 'URGENT', labelKey: 'form.priority.urgentF' },
];

/** A daytime hour, for the line: the night lowers the level later, at the time it rings. */
const MIDDAY = new Date(2026, 0, 15, 12, 0);

export function PriorityField({
  value,
  onChange,
  accent,
  rings,
  testIDPrefix,
}: {
  value: ReminderPriority;
  onChange: (priority: ReminderPriority) => void;
  accent: string;
  /** What rings (a reminder, a deadline, a moment); without it, no line under the choice. */
  rings?: { moment: NotificationMoment; momentKind?: MomentKind };
  testIDPrefix?: string;
}) {
  const t = useT();
  const { palette } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let alive = true;
    SettingsRepository.get()
      .then(read => alive && setSettings(read))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const options: Choice<ReminderPriority>[] = PRIORITY_CHOICES.map(option => ({ value: option.value, label: t(option.labelKey) }));
  const level = rings
    ? notificationLevelFor({ moment: rings.moment, priority: value, at: MIDDAY, momentKind: rings.momentKind, defaults: settings?.alertLevels })
    : null;
  const tone = rings?.momentKind ? MOMENT_KIND_TONES[momentKindOf(rings.momentKind)] : undefined;
  const sound = level
    ? soundFor({ level, tone, prefs: settings?.soundPrefs, soundOn: settings ? settings.notificationSoundEnabled : true })
    : null;
  const alarm = level === 'alarm';
  // An alarm with a sound of the phone (sheet 037): its name, and it is heard from the phone
  const phone = level ? deviceSoundFor({ level, prefs: settings?.soundPrefs, soundOn: settings ? settings.notificationSoundEnabled : true }) : undefined;
  const soundName = phone ? phone.name || '…' : sound && sound !== 'none' ? t(SOUNDS[sound].labelKey) : '';
  const lineColor = alarm ? palette.error.default : palette.onSurface.variant;

  return (
    <View style={{ gap: Spacing.xs }}>
      <FieldLabel label={t('itemForm.priority')} />
      <ChoiceChips
        options={options}
        value={value}
        onChange={next => {
          onChange(next);
          // An alarm needs exact alarms to ring at the minute (sheet 031)
          if (next === 'URGENT' && value !== 'URGENT' && rings) void offerExactAlarmsForAlarmLevel();
        }}
        accent={accent}
        testIDPrefix={testIDPrefix}
      />
      {sound ? (
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
          )}
        </View>
      ) : null}
    </View>
  );
}
