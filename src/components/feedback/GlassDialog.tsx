/**
 * A window with its own content (a field, a choice…), in the same style as GlassAlert (sheet 030):
 * a GlowCard (glass, lit border, violet glow; opaque when "Effet verre" is off) over a dimmed
 * screen, lifted above the keyboard. Touching outside it, or the Android back button, acts as
 * "Annuler"; while `busy` (a save in progress) it stays open.
 *
 * Usage: <GlassDialog visible={open} onDismiss={() => setOpen(false)}>…</GlassDialog>
 */
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet } from 'react-native';

import { GlowCard } from '@/components/ui/GlowCard';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export interface GlassDialogProps {
  visible: boolean;
  /** Touching outside, or the back button: the same as the window's "Annuler". */
  onDismiss: () => void;
  /** While true, touching outside does nothing (a save is in progress). */
  busy?: boolean;
  children: React.ReactNode;
  testID?: string;
}

export function GlassDialog({ visible, onDismiss, busy = false, children, testID }: GlassDialogProps) {
  const styles = useThemedStyles(makeGlassDialogStyles);
  const dismiss = () => {
    if (!busy) onDismiss();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          importantForAccessibility="no"
          testID={testID ? `${testID}-backdrop` : 'glass-dialog-backdrop'}
        />
        <GlowCard tone="primary" size="hero" disableEntranceAnimation style={[styles.box, styles.backing]} contentStyle={styles.content} testID={testID}>
          {children}
        </GlowCard>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeGlassDialogStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      padding: Spacing.lg,
      backgroundColor: theme.mode === 'light' ? 'rgba(20, 16, 40, 0.42)' : 'rgba(0, 0, 0, 0.62)',
    },
    // Phone width; on a tablet or the web, a readable window rather than a band
    box: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
    },
    // Under the glass, a nearly solid backing: what is behind never shows through the words
    backing: {
      borderRadius: Radius.xl,
      backgroundColor: theme.mode === 'light' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(22, 20, 34, 0.94)',
    },
    content: {
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
  });
