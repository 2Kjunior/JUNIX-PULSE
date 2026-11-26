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
import { SOUNDS, SOUND_CHOICES, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
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
      {LEVELS.map((level, index) => {
        const urgent = level === 'alarm';
        return (
          <TouchableOpacity
            key={level}
            style={[styles.row, index > 0 && styles.rowLine]}
            onPress={() => open(level)}
            accessibilityRole="button"
            accessibilityLabel={`${t(ROW_LABELS[level])}, ${nameOf(value[level])}`}
            testID={`sound-row-${level}`}
          >
            <Ionicons
              name={urgent ? 'alarm-outline' : level === 'discreet' ? 'notifications-off-outline' : 'notifications-outline'}
              size={18}
              color={urgent ? palette.error.default : palette.onSurface.variant}
            />
            <Text style={[styles.rowLabel, urgent && { color: palette.error.default }]}>{t(ROW_LABELS[level])}</Text>
            <Text style={styles.rowValue}>{nameOf(value[level])}</Text>
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
    choice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52 },
    choiceMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
    choiceLabel: { ...Typography.bodyLarge, color: theme.onSurface.primary },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    action: { flex: 1 },
  });
}
