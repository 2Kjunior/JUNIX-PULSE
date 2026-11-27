/**
 * The sounds of Junix in the settings (study 001, 16.7 and 16.8; sheets 031 and 032): a short list,
 * like the ringtones of the phone. One row for each priority (Faible, Normale et haute, Urgente)
 * with the sound chosen; a touch opens a glass window with the sounds of that row, a round to tick
 * and ▶ to hear each one. "Choisir" keeps the ticked one; touching outside changes nothing.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassDialog } from '@/components/feedback/GlassDialog';
import { Button } from '@/components/ui/Button';
import type { ThemePalette } from '@/constants/palettes';
import { Spacing, Typography } from '@/constants/theme';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { SOUNDS, SOUND_CHOICES, type DeviceSound, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT, type MessageKey } from '@/i18n';

const LEVELS: readonly NotificationLevel[] = ['discreet', 'normal', 'alarm'];
/** Each level is named by the priorities that ring with it (sheet 032). */
const ROW_LABELS: Readonly<Record<NotificationLevel, MessageKey>> = {
  discreet: 'soundSettings.rowLow',
  normal: 'soundSettings.rowNormal',
  alarm: 'soundSettings.rowUrgent',
};
const PICKER_TITLES: Readonly<Record<NotificationLevel, MessageKey>> = {
  discreet: 'soundSettings.pickLow',
  normal: 'soundSettings.pickNormal',
  alarm: 'soundSettings.pickUrgent',
};

export function SoundSetting({
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
      {LEVELS.map((level, index) => {
        const urgent = level === 'alarm';
        return (
          <TouchableOpacity
            key={level}
            style={[styles.row, index > 0 && styles.rowLine]}
            onPress={() => open(level)}
            accessibilityRole="button"
            accessibilityLabel={`${t(ROW_LABELS[level])}, ${rowValue(level)}`}
            testID={`sound-row-${level}`}
          >
            <Ionicons
              name={urgent ? 'alarm-outline' : level === 'discreet' ? 'notifications-off-outline' : 'notifications-outline'}
              size={18}
              color={urgent ? palette.error.default : palette.onSurface.variant}
            />
            <Text style={[styles.rowLabel, urgent && { color: palette.error.default }]}>{t(ROW_LABELS[level])}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{rowValue(level)}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
          </TouchableOpacity>
        );
      })}

      <GlassDialog visible={picking !== null} onDismiss={() => setPicking(null)} testID="sound-picker">
        {picking ? (
          <>
            <Text style={styles.title}>{t(PICKER_TITLES[picking])}</Text>
            <View style={styles.list} accessibilityRole="radiogroup">
              {SOUND_CHOICES[picking].map((sound, index) => {
                const on = sound === ticked;
                return (
                  <View key={sound} style={[styles.choice, index > 0 && styles.rowLine]}>
                    <TouchableOpacity
                      style={styles.choiceMain}
                      onPress={() => {
                        setTicked(sound);
                        if (sound !== 'none') onPreview(sound);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      testID={`sound-choice-${sound}`}
                    >
                      <Ionicons
                        name={on ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={on ? palette.primary.default : palette.onSurface.disabled}
                      />
                      <Text style={[styles.choiceLabel, on && { color: palette.primary.default }]}>{nameOf(sound)}</Text>
                    </TouchableOpacity>
                    {sound !== 'none' && (
                      <TouchableOpacity
                        onPress={() => onPreview(sound)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={t('soundSettings.play', { sound: nameOf(sound) })}
                      >
                        <Ionicons name="play-circle-outline" size={26} color={palette.primary.default} />
                      </TouchableOpacity>
                    )}
                  </View>
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
            </View>
          </>
        ) : null}
      </GlassDialog>
    </View>
  );
}

function makeStyles(theme: ThemePalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52, paddingVertical: Spacing.sm },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.outline.variant },
    rowLabel: { ...Typography.bodyLarge, flex: 1, color: theme.onSurface.primary },
    rowValue: { ...Typography.bodyMedium, color: theme.onSurface.variant },
    title: { ...Typography.titleMedium, color: theme.onSurface.primary, marginBottom: Spacing.sm },
    list: { marginBottom: Spacing.md },
    section: { ...Typography.bodyMedium, color: theme.onSurface.variant, marginBottom: Spacing.xs },
    choice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52 },
    choiceMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
    choiceLabel: { ...Typography.bodyLarge, color: theme.onSurface.primary },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    action: { flex: 1 },
  });
}
