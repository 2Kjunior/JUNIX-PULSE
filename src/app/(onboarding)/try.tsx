/**
 * Onboarding, screen 4 of 5: try rather than read (study 001, 16.13; sheet 044).
 *
 * One real sentence, typed or dictated (« Appeler maman demain à 18 h »), is understood as in the
 * forms (todoFromSentence) and shown as its card; « Ajouter » makes it the first reminder (a task
 * when no hour is said). The next screen asks for the notifications with its title as the reason.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { DictatedInput } from '@/components/create/form/FormBricks';
import { alertMoment } from '@/constants/item-forms';
import { itemFamilyColor } from '@/constants/item-kinds';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { todoFromSentence } from '@/domain/rules/form-dictation-rules';
import { GUIDE_ROOM, OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT } from '@/i18n';
import { detectDeviceTimezone } from '@/services/device-timezone';
import { useAppStore } from '@/store/app-store';
import { createReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function OnboardingTry() {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingTryStyles);
  const showSnackbar = useAppStore(state => state.showSnackbar);
  const [sentence, setSentence] = useState('');
  const [saving, setSaving] = useState(false);
  const color = itemFamilyColor(palette, 'todo');

  // What the sentence says, as the card it will become
  const fill = useMemo(
    () => (sentence.trim() ? todoFromSentence(sentence, [], new Date(), language) : null),
    [sentence, language]
  );
  const when = useMemo(() => {
    if (!fill) return null;
    if (!fill.alert) return fill.day ? format(new Date(`${fill.day}T12:00:00`), 'EEE d MMM', { locale: dateLocale }) : null;
    return format(alertMoment(fill.day, fill.time, new Date()), 'EEE d MMM · HH:mm', { locale: dateLocale });
  }, [fill, dateLocale]);

  async function add() {
    if (!fill || !fill.title.trim()) return;
    setSaving(true);
    try {
      if (fill.alert) {
        const now = new Date();
        let at = alertMoment(fill.day, fill.time, now);
        // An hour already past today rings tomorrow
        if (at.getTime() <= now.getTime()) at = new Date(at.getTime() + DAY_MS);
        await createReminder({ title: fill.title.trim(), scheduledAt: at, timezone: detectDeviceTimezone(), priority: fill.priority });
      } else {
        await TaskUseCases.createTask({ title: fill.title.trim(), scheduledDate: fill.day, priority: fill.priority });
      }
      router.push({ pathname: '/(onboarding)/permissions', params: { first: fill.title.trim() } });
    } catch {
      showSnackbar(t('taskNew.createError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingFrame
      step={4}
      onSkip={() => router.push('/(onboarding)/permissions')}
      // Pulse sits at the top right with its bubble: room for it above the title
      guideRoom={GUIDE_ROOM}
      title={t('onb.try.title')}
      subtitle={t('onb.try.subtitle')}
      cta={{ label: t('onb.try.add'), onPress: () => void add(), loading: saving, disabled: !fill?.title.trim(), testID: 'onboarding-try-add' }}
    >
      <DictatedInput
        value={sentence}
        onChangeText={setSentence}
        accent={color}
        placeholder={t('onb.try.placeholder')}
        // Its own box here: in the forms, a card gives it one
        inputStyle={styles.input}
        multiline
        accessibilityLabel={t('onb.try.title')}
        testID="onboarding-try-input"
      />

      {fill && fill.title.trim() ? (
        <View style={styles.card} accessible accessibilityLabel={`${fill.title}${when ? `, ${when}` : ''}`}>
          <View style={styles.cardTop}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.kind, { color }]}>{t('itemFamily.todo')}</Text>
            <View style={styles.spacer} />
            {when ? <Text style={[styles.when, { color }]}>{when}</Text> : null}
            {fill.alert ? <Ionicons name="notifications" size={12} color={color} /> : null}
          </View>
          <Text style={styles.cardTitle}>{fill.title}</Text>
        </View>
      ) : null}

      {fill && fill.title.trim() ? <Text style={styles.note}>{t('onb.try.note')}</Text> : null}
    </OnboardingFrame>
  );
}

function makeOnboardingTryStyles(theme: ThemePalette) {
  return StyleSheet.create({
    input: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      backgroundColor: theme.surface.container,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      minHeight: 52,
    },
    card: {
      padding: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface.container,
      gap: 4,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    kind: {
      ...Typography.labelMedium,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    spacer: {
      flex: 1,
    },
    when: {
      ...Typography.labelMedium,
    },
    cardTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
    },
    note: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
  });
}
