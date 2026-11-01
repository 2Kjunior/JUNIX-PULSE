/**
 * LanguagePicker: Automatic, Français or English, applied at once.
 *
 * Used in the settings and on the last step of the onboarding. "Automatic" follows the language
 * of the phone. The choice is shown in the new language the moment it is made.
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { LanguageSetting } from '@/domain/rules/language-rules';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { changeLanguage } from '@/services/language-service';
import { useAppStore } from '@/store/app-store';
import { useThemedStyles } from '@/hooks/use-themed-styles';

const CHOICES: readonly { value: LanguageSetting; labelKey: MessageKey; hintKey: MessageKey }[] = [
  { value: 'auto', labelKey: 'language.auto', hintKey: 'language.hint.auto' },
  { value: 'fr', labelKey: 'language.fr', hintKey: 'language.hint.fr' },
  { value: 'en', labelKey: 'language.en', hintKey: 'language.hint.en' },
];

interface LanguagePickerProps {
  /** Shown when the choice could not be kept. */
  onError?: (message: string) => void;
  testIDPrefix?: string;
}

export function LanguagePicker({ onError, testIDPrefix = 'language' }: LanguagePickerProps) {
  const t = useT();
  const styles = useThemedStyles(makeLanguagePickerStyles);
  const setting = useAppStore(state => state.languageSetting);

  const select = (value: LanguageSetting) => {
    if (value === setting) return;
    changeLanguage(value).catch(() => onError?.(t('language.error')));
  };

  const current = CHOICES.find(choice => choice.value === setting) ?? CHOICES[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {CHOICES.map(choice => {
          const selected = choice.value === setting;
          return (
            <TouchableOpacity
              key={choice.value}
              style={[styles.pill, selected && styles.pillActive]}
              onPress={() => select(choice.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`${testIDPrefix}-${choice.value}`}
            >
              <Text style={[styles.pillText, selected && styles.pillTextActive]}>{t(choice.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>{t(current.hintKey)}</Text>
    </View>
  );
}

const makeLanguagePickerStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    wrap: { gap: Spacing.sm },
    row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    pill: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      minHeight: 40,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.container,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    pillActive: { backgroundColor: theme.primary.container, borderColor: theme.primary.default },
    pillText: { ...Typography.labelMedium, color: theme.onSurface.variant },
    pillTextActive: { color: theme.primary.onContainer, fontWeight: '700' },
    hint: { ...Typography.labelSmall, color: theme.onSurface.variant },
  });
