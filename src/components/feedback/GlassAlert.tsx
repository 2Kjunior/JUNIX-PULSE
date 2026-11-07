/**
 * Alert windows in the glass style of the app, in place of the native Android and iOS alerts.
 * Same call as React Native: GlassAlert.alert(title, message, buttons). Alerts wait in line, so
 * one opened from a button of another shows once the first is closed.
 */

import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button, type ButtonVariant } from '@/components/ui/Button';
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
  /** Android back button closes the window, as its cancel button would. */
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

function variantOf(button: GlassAlertButton, isMain: boolean): ButtonVariant {
  if (button.style === 'cancel') return 'ghost';
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

  const cancelButton = shown.buttons.find(button => button.style === 'cancel');
  // The last button that is not a cancel one is the main action, as on the native alerts
  const mainIndex = shown.buttons.map(button => button.style !== 'cancel').lastIndexOf(true);
  const stacked = shown.buttons.length > 2;

  return (
    <Modal
      visible={current !== null && !paused}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (cancelButton) pressGlassAlertButton(shown.id, cancelButton);
        else if (shown.options?.cancelable) close(shown.id);
      }}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.dialog, dialogMotion]} accessibilityViewIsModal accessibilityRole="alert">
          <Text style={styles.title}>{shown.title}</Text>
          {!!shown.message && (
            <ScrollView style={styles.messageScroll}>
              <Text style={styles.message}>{shown.message}</Text>
            </ScrollView>
          )}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {shown.buttons.map((button, index) => (
              <Button
                key={`${shown.id}-${index}`}
                label={button.text ?? t('common.close')}
                variant={variantOf(button, index === mainIndex)}
                size="sm"
                onPress={() => pressGlassAlertButton(shown.id, button)}
                style={stacked ? styles.actionStacked : styles.action}
                testID={`glass-alert-button-${index}`}
              />
            ))}
          </View>
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
      padding: Spacing.xl,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    dialog: {
      // Phone width; on a tablet or the web, a readable window rather than a band
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      gap: Spacing.md,
      padding: Spacing.xl,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
      backgroundColor: theme.glass.nav.backgroundColor,
      maxHeight: '80%',
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
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
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    actionsStacked: {
      flexDirection: 'column-reverse',
      alignItems: 'stretch',
    },
    action: {
      minWidth: 96,
    },
    actionStacked: {
      alignSelf: 'stretch',
    },
  });
