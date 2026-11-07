/**
 * Maintenant, en plein écran : une seule chose à la fois, pour ceux qui ont du mal à démarrer.
 * Fait ou Plus tard, et la suivante arrive ; Passer la laisse telle quelle pour l'instant. Quand
 * plus rien ne presse, Pulse le dit. Aucun dégradé, aucune animation imposée.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/feedback/States';
import { DeadlineBadge } from '@/components/tasks/DeadlineBadge';
import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { PulseMascot } from '@/features/mascot/PulseMascot';
import { useNowActions, useNowSubtitle } from '@/features/now/use-now-actions';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { NowUseCases, type NowState } from '@/use-cases/now-use-cases';
import { closeScreen } from '@/utils/navigation';
import { hexToRgba } from '@/utils/color';

export default function NowScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNowStyles);
  const subtitleOf = useNowSubtitle();

  const [state, setState] = useState<NowState | null>(null);
  const [failed, setFailed] = useState(false);
  // Skipped for now: left as they are, they come back once the others are seen
  const [skipped, setSkipped] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      setState(await NowUseCases.load());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const actions = useNowActions(load);

  const queue = useMemo(() => state?.queue ?? [], [state]);
  const current = useMemo(() => queue.find(item => !skipped.includes(`${item.kind}-${item.id}`)) ?? queue[0] ?? null, [queue, skipped]);
  const position = current ? queue.indexOf(current) + 1 : 0;

  const skip = () => {
    if (!current) return;
    const key = `${current.kind}-${current.id}`;
    // Everything skipped once: the round starts again from the first one
    setSkipped(previous => (previous.length + 1 >= queue.length ? [] : [...previous, key]));
  };

  if (failed) return <ErrorState message={t('now.error')} onRetry={load} />;
  if (!state) return <LoadingState />;

  const late = current?.kind === 'reminder' && current.overdue;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => closeScreen()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          testID="now-close"
        >
          <Ionicons name="close" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {t('now.title')}
        </Text>
        <Text style={styles.position}>{current ? t('now.position', { index: position, total: queue.length }) : ''}</Text>
      </View>

      {!current ? (
        <View style={styles.empty}>
          <PulseMascot mood="happy" size={96} />
          <Text style={styles.emptyTitle}>{t('now.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('now.emptyBody')}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => closeScreen()} accessibilityRole="button">
            <Text style={styles.secondaryText}>{t('now.back')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.center}>
            <GlowCard tone={current.priority === 'URGENT' || late ? 'attention' : 'primary'} testID="now-current">
              <View style={styles.cardInner}>
                <View style={styles.kindRow}>
                  <Ionicons
                    name={current.kind === 'reminder' ? 'notifications-outline' : 'checkbox-outline'}
                    size={16}
                    color={late ? palette.priority.HIGH : palette.primary.default}
                  />
                  <Text style={[styles.kind, late && { color: palette.priority.HIGH }]}>{subtitleOf(current)}</Text>
                </View>
                <Text style={styles.title} accessibilityRole="header">
                  {current.title}
                </Text>
                {current.kind === 'task' && <DeadlineBadge dueDate={current.dueDate} />}
                <TouchableOpacity
                  style={styles.openLink}
                  onPress={() =>
                    current.kind === 'reminder'
                      ? router.push({ pathname: '/reminders/[id]', params: { id: current.id } })
                      : router.push(`/tasks/${current.id}`)
                  }
                  accessibilityRole="link"
                >
                  <Text style={styles.openText}>{t('common.edit')}</Text>
                  <Ionicons name="chevron-forward" size={14} color={palette.primary.default} />
                </TouchableOpacity>
              </View>
            </GlowCard>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.bigBtn, styles.doneBtn]}
              onPress={() => actions.done(current)}
              accessibilityRole="button"
              accessibilityLabel={`${t('now.done')} : ${current.title}`}
              testID="now-full-done"
            >
              <Ionicons name="checkmark" size={22} color={palette.success.default} />
              <Text style={[styles.bigText, { color: palette.success.default }]}>{t('now.done')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bigBtn}
              onPress={() => actions.later(current)}
              accessibilityRole="button"
              accessibilityLabel={t(current.kind === 'reminder' ? 'now.laterReminderA11y' : 'now.laterTaskA11y')}
              testID="now-full-later"
            >
              <Ionicons name="time-outline" size={22} color={palette.onSurface.primary} />
              <Text style={styles.bigText}>{t('now.later')}</Text>
            </TouchableOpacity>
            {queue.length > 1 && (
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={skip}
                accessibilityRole="button"
                accessibilityLabel={t('now.skipA11y')}
                testID="now-skip"
              >
                <Text style={styles.secondaryText}>{t('now.skip')}</Text>
                <Ionicons name="play-skip-forward-outline" size={16} color={palette.onSurface.variant} />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const makeNowStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
      paddingHorizontal: Spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.glass.control.backgroundColor,
    },
    headerTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
    },
    position: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
      minWidth: 44,
      textAlign: 'right',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
    },
    cardInner: {
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    kindRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    kind: {
      ...Typography.labelLarge,
      color: theme.primary.default,
    },
    title: {
      ...Typography.displayMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    openLink: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 2,
      minHeight: 44,
    },
    openText: {
      ...Typography.labelLarge,
      color: theme.primary.default,
    },
    actions: {
      gap: Spacing.sm,
    },
    bigBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      minHeight: 56,
      borderRadius: Radius.full,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    doneBtn: {
      backgroundColor: hexToRgba(theme.success.default, theme.mode === 'light' ? 0.12 : 0.16),
      borderColor: hexToRgba(theme.success.default, 0.45),
    },
    bigText: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    skipBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      minHeight: 44,
    },
    secondaryBtn: {
      minHeight: 44,
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
      borderRadius: Radius.full,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    secondaryText: {
      ...Typography.labelLarge,
      color: theme.onSurface.variant,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
    },
    emptyTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyBody: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
      maxWidth: 300,
    },
  });
