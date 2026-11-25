/**
 * Alert windows in the glass style of the app, in place of the native Android and iOS alerts.
 * Same call as React Native: GlassAlert.alert(title, message, buttons). Alerts wait in line, so
 * one opened from a button of another shows once the first is closed.
 *
 * The window (sheet 030) is a GlowCard: the glass, the lit border and the violet glow of the app
 * (opaque when "Effet verre" is off). Two buttons share their row, "Annuler" on the left; three or
 * more take the whole width one under the other, a destructive one just above "Annuler" at the
 * bottom. Touching outside the window, or the Android back button, acts as "Annuler".
 */

import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button, type ButtonVariant } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

export interface GlassAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface GlassAlertOptions {
  /**
   * Touching outside the window or the Android back button closes it, as its cancel button would
   * (true unless said otherwise, sheet 030). False keeps it open until a button is touched.
   */
  cancelable?: boolean;
}

interface AlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: GlassAlertButton[];
  options?: GlassAlertOptions;
}

let nextId = 1;
let queue: AlertRequest[] = [];
const listeners = new Set<(current: AlertRequest | null) => void>();

function publish(): void {
  const current = queue[0] ?? null;
  listeners.forEach(listener => listener(current));
}

function close(id: number): void {
  queue = queue.filter(request => request.id !== id);
  publish();
}

export const GlassAlert = {
  alert(title: string, message?: string, buttons?: GlassAlertButton[], options?: GlassAlertOptions): void {
    queue = [...queue, { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{}], options }];
    publish();
  },

  /** For the tests: the alert shown right now. */
  _current(): { title: string; message?: string; buttons: GlassAlertButton[] } | null {
    return queue[0] ?? null;
  },

  /** For the tests: forget every waiting alert. */
  _reset(): void {
    queue = [];
    publish();
  },
};

/** Presses a button: the window closes first, so the button may open another alert. */
export function pressGlassAlertButton(id: number, button: GlassAlertButton): void {
  close(id);
  void button.onPress?.();
}

/**
 * The order the buttons are drawn in, by their index (sheet 030), and whether they stack. Two
 * buttons share a row, "Annuler" first (on the left). From three, one under the other: the
 * actions as given, then the destructive ones, then "Annuler" at the bottom.
 */
export function alertButtonOrder(buttons: readonly GlassAlertButton[]): { order: number[]; stacked: boolean } {
  const indexes = buttons.map((_, index) => index);
  const cancel = indexes.filter(index => buttons[index].style === 'cancel');
  const destructive = indexes.filter(index => buttons[index].style === 'destructive');
  const others = indexes.filter(index => buttons[index].style !== 'cancel' && buttons[index].style !== 'destructive');
  if (buttons.length <= 2) return { order: [...cancel, ...others, ...destructive], stacked: false };
  return { order: [...others, ...destructive, ...cancel], stacked: true };
}

/** What touching outside does: the cancel button, or closing; nothing when the alert says so. */
export function dismissGlassAlert(id: number, buttons: readonly GlassAlertButton[], options?: GlassAlertOptions): void {
  if (options?.cancelable === false) return;
  const cancel = buttons.find(button => button.style === 'cancel');
  if (cancel) pressGlassAlertButton(id, cancel);
  else close(id);
}

function variantOf(button: GlassAlertButton, isMain: boolean): ButtonVariant {
  if (button.style === 'cancel') return 'secondary';
  if (button.style === 'destructive') return 'destructive';
  return isMain ? 'primary' : 'secondary';
}

/** Mounted once at the root of the app. While `paused` (app locked), alerts wait in line. */
export function GlassAlertHost({ paused = false }: { paused?: boolean }) {
  const styles = useThemedStyles(makeGlassAlertStyles);
  const t = useT();
  const reduceMotion = useSafeReducedMotion();
  const [current, setCurrent] = useState<AlertRequest | null>(queue[0] ?? null);
  // The last alert stays drawn while the window fades out
  const [lastShown, setLastShown] = useState<AlertRequest | null>(queue[0] ?? null);

  useEffect(() => {
    const show = (next: AlertRequest | null) => {
      setCurrent(next);
      if (next) setLastShown(next);
    };
    listeners.add(show);
    show(queue[0] ?? null);
    return () => {
      listeners.delete(show);
    };
  }, []);

  // Each alert rises a little and grows from 94 % as the dark background fades in
  const entrance = useSharedValue(1);
  const currentId = current?.id;
  useEffect(() => {
    if (currentId === undefined || paused) return;
    if (reduceMotion) {
      entrance.value = 1;
      return;
    }
    entrance.value = 0;
    entrance.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [currentId, paused, reduceMotion, entrance]);
  const dialogMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - entrance.value) * 10 }, { scale: 0.94 + 0.06 * entrance.value }],
  }));

  const shown = current ?? lastShown;
  if (!shown) return null;

  // The last button that is not a cancel one is the main action, as on the native alerts
  const mainIndex = shown.buttons.map(button => button.style !== 'cancel').lastIndexOf(true);
  const { order, stacked } = alertButtonOrder(shown.buttons);
  const dismiss = () => dismissGlassAlert(shown.id, shown.buttons, shown.options);

  return (
    <Modal
      visible={current !== null && !paused}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        {/* Touching outside the window acts as "Annuler" (sheet 030) */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          importantForAccessibility="no"
          testID="glass-alert-backdrop"
        />
        <Animated.View style={[styles.dialogBox, dialogMotion]} accessibilityViewIsModal accessibilityRole="alert">
          <GlowCard tone="primary" size="hero" disableEntranceAnimation style={styles.backing} contentStyle={styles.dialogContent}>
            <Text style={styles.title}>{shown.title}</Text>
            {!!shown.message && (
              <ScrollView style={styles.messageScroll}>
                <Text style={styles.message}>{shown.message}</Text>
              </ScrollView>
            )}
            <View style={[styles.actions, stacked && styles.actionsStacked]}>
              {order.map(index => {
                const button = shown.buttons[index];
                return (
                  <Button
                    key={`${shown.id}-${index}`}
                    label={button.text ?? t('common.close')}
                    variant={variantOf(button, index === mainIndex)}
                    size="md"
                    onPress={() => pressGlassAlertButton(shown.id, button)}
                    style={stacked ? styles.actionStacked : styles.action}
                    testID={`glass-alert-button-${index}`}
                  />
                );
              })}
            </View>
          </GlowCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeGlassAlertStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      padding: Spacing.lg,
      backgroundColor: theme.mode === 'light' ? 'rgba(20, 16, 40, 0.42)' : 'rgba(0, 0, 0, 0.62)',
    },
    dialogBox: {
      // Phone width; on a tablet or the web, a readable window rather than a band
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      maxHeight: '80%',
    },
    // Under the glass, a nearly solid backing: what is behind never shows through the words
    backing: {
      borderRadius: Radius.xl,
      backgroundColor: theme.mode === 'light' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(22, 20, 34, 0.94)',
    },
    dialogContent: {
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    messageScroll: {
      flexGrow: 0,
    },
    message: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    actionsStacked: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    // Two buttons share the row equally
    action: {
      flex: 1,
    },
    // Stacked, each takes the whole width
    actionStacked: {
      width: '100%',
    },
  });
