/**
 * OnboardingFrame: the frame shared by the 5 onboarding screens (study 001, 16.13; sheet 044).
 *
 * The progress bar and « Passer » at the top, the content in the middle, and the button to go
 * on always at the bottom, at the same place on every screen (it used to move up and down).
 */

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

/** The room kept above the title for Pulse and a bubble of two lines. */
export const GUIDE_ROOM = 96;

/** The number of onboarding screens: five at most (the user's rule). */
export const ONBOARDING_SCREEN_COUNT = 5;

interface OnboardingFrameProps {
  /** 1 to 5. */
  step: number;
  /** « Passer » (or another word); absent: no button at the top right. */
  onSkip?: () => void;
  skipLabel?: string;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  cta: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; testID?: string };
  /** A small line under the button (« J'ai une sauvegarde »). */
  below?: ReactNode;
  /** Centre the content vertically (Bonjour, the permission). */
  centered?: boolean;
  /** Room above the title for Pulse and its bubble, on the screens where it sits at the top. */
  guideRoom?: number;
  testID?: string;
}

export function OnboardingFrame({ step, onSkip, skipLabel, title, subtitle, children, cta, below, centered = false, guideRoom = 0, testID }: OnboardingFrameProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeOnboardingFrameStyles);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID={testID}>
      <View style={[styles.top, { paddingTop: insets.top + Spacing.md }]}>
        <View
          style={styles.bar}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('step.a11y', { current: step, total: ONBOARDING_SCREEN_COUNT })}
        >
          {Array.from({ length: ONBOARDING_SCREEN_COUNT }, (_, index) => (
            <View key={index} style={[styles.segment, index < step && styles.segmentOn]} />
          ))}
        </View>
        {onSkip ? (
          <TouchableOpacity onPress={onSkip} style={styles.skip} accessibilityRole="button" testID="onboarding-skip">
            <Text style={styles.skipText}>{skipLabel ?? t('common.skip')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, centered && styles.contentCentered]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {guideRoom > 0 ? <View style={{ height: guideRoom }} /> : null}
        {title ? <Text style={[styles.title, centered && styles.textCentered]}>{title}</Text> : null}
        {subtitle ? <Text style={[styles.subtitle, centered && styles.textCentered]}>{subtitle}</Text> : null}
        {children}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button
          label={cta.label}
          onPress={cta.onPress}
          loading={cta.loading}
          disabled={cta.disabled}
          variant="primary"
          size="lg"
          style={styles.cta}
          testID={cta.testID}
        />
        {below ? <View style={styles.below}>{below}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function makeOnboardingFrameStyles(theme: ThemePalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.md,
    },
    bar: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
    },
    segment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.outline.variant,
    },
    segmentOn: {
      backgroundColor: theme.primary.default,
    },
    skip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingLeft: Spacing.sm,
    },
    skipText: {
      ...Typography.labelLarge,
      color: theme.onSurface.variant,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.lg,
      gap: Spacing.md,
    },
    contentCentered: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    title: {
      ...Typography.displayMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    subtitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.variant,
    },
    textCentered: {
      textAlign: 'center',
    },
    bottom: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
    },
    cta: {
      borderRadius: Radius.full,
    },
    below: {
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
  });
}
