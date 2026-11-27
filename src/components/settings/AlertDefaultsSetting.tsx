/**
 * The default level of each family in the settings (study 001, 12.8; sheets 023 and 038): reminders,
 * deadlines, moments and habits. Since sheet 032 the priority decides (Urgente is an alarm, Faible is
 * discreet): this level is the one of Normale and Haute, and of the habits, which have no priority.
 *
 * Sheet 038, after your look at the screen: four rows with their level instead of twelve chips, as
 * the sounds (sheet 032); a touch opens a glass window with the three levels and what each one does.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassDialog } from '@/components/feedback/GlassDialog';
import { Button } from '@/components/ui/Button';
import type { ThemePalette } from '@/constants/palettes';
import { Spacing, Typography } from '@/constants/theme';
import type { AlertLevel } from '@/domain/entities';
import { ALERT_FAMILIES, type AlertDefaults, type AlertFamily } from '@/domain/rules/notification-level-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT, type MessageKey } from '@/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

const FAMILIES: Readonly<Record<AlertFamily, { labelKey: MessageKey; icon: IconName }>> = {
  reminder: { labelKey: 'alertDefaults.reminder', icon: 'notifications-outline' },
  deadline: { labelKey: 'alertDefaults.deadline', icon: 'flag-outline' },
  moment: { labelKey: 'alertDefaults.moment', icon: 'calendar-outline' },
  habit: { labelKey: 'alertDefaults.habit', icon: 'repeat-outline' },
};

const LEVELS: readonly { value: AlertLevel; labelKey: MessageKey; hintKey: MessageKey }[] = [
  { value: 'discreet', labelKey: 'alertLevel.discreet', hintKey: 'alertDefaults.discreetHint' },
  { value: 'normal', labelKey: 'alertLevel.normal', hintKey: 'alertDefaults.normalHint' },
  { value: 'alarm', labelKey: 'alertLevel.alarm', hintKey: 'alertDefaults.alarmHint' },
];

export function AlertDefaultsSetting({
  value,
  onChange,
}: {
  value: AlertDefaults;
  onChange: (family: AlertFamily, level: AlertLevel) => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [picking, setPicking] = useState<AlertFamily | null>(null);
  const [ticked, setTicked] = useState<AlertLevel>('normal');
  const levelName = (level: AlertLevel) => t(`alertLevel.${level}`);

  const open = (family: AlertFamily) => {
    setTicked(value[family]);
    setPicking(family);
  };
  const choose = () => {
    if (picking && ticked !== value[picking]) onChange(picking, ticked);
    setPicking(null);
  };

  return (
    <View>
      {ALERT_FAMILIES.map((family, index) => {
        const alarm = value[family] === 'alarm';
        return (
          <TouchableOpacity
            key={family}
            style={[styles.row, index > 0 && styles.line]}
            onPress={() => open(family)}
            accessibilityRole="button"
            accessibilityLabel={`${t(FAMILIES[family].labelKey)}, ${levelName(value[family])}`}
            testID={`alert-default-row-${family}`}
          >
            <Ionicons name={FAMILIES[family].icon} size={18} color={palette.onSurface.variant} />
            <Text style={styles.label}>{t(FAMILIES[family].labelKey)}</Text>
            <Text style={[styles.value, alarm && { color: palette.error.default }]}>{levelName(value[family])}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
          </TouchableOpacity>
        );
      })}

      <GlassDialog visible={picking !== null} onDismiss={() => setPicking(null)} testID="alert-default-picker">
        {picking ? (
          <>
            <Text style={styles.title}>{t(FAMILIES[picking].labelKey)}</Text>
            <View style={styles.list} accessibilityRole="radiogroup">
              {LEVELS.map((level, index) => {
                const on = level.value === ticked;
                return (
                  <TouchableOpacity
                    key={level.value}
                    style={[styles.choice, index > 0 && styles.line]}
                    onPress={() => setTicked(level.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    testID={`alert-default-choice-${level.value}`}
                  >
                    <Ionicons
                      name={on ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={on ? palette.primary.default : palette.onSurface.disabled}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceLabel, on && { color: palette.primary.default }]}>{t(level.labelKey)}</Text>
                      <Text style={styles.choiceHint}>{t(level.hintKey)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* The type of a moment still moves its level (sheet 023) */}
            {picking === 'moment' ? <Text style={styles.note}>{t('alertDefaults.momentNote')}</Text> : null}
            <View style={styles.actions}>
              <Button label={t('common.cancel')} onPress={() => setPicking(null)} variant="secondary" style={styles.action} />
              <Button label={t('soundSettings.choose')} onPress={choose} style={styles.action} testID="alert-default-choose" />
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
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.outline.variant },
    label: { ...Typography.bodyLarge, flex: 1, color: theme.onSurface.primary },
    value: { ...Typography.bodyMedium, color: theme.onSurface.variant },
    title: { ...Typography.titleMedium, color: theme.onSurface.primary, marginBottom: Spacing.sm },
    list: { marginBottom: Spacing.md },
    choice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 60, paddingVertical: Spacing.xs },
    choiceLabel: { ...Typography.bodyLarge, color: theme.onSurface.primary },
    choiceHint: { ...Typography.bodyMedium, color: theme.onSurface.variant },
    note: { ...Typography.bodyMedium, color: theme.onSurface.variant, marginBottom: Spacing.md },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    action: { flex: 1 },
  });
}
