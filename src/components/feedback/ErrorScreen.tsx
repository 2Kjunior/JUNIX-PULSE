/**
 * Full-screen message when the app cannot go on: a screen crashed, or the startup failed.
 * The technical detail only shows in development.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

export interface ErrorScreenProps {
  title: string;
  body: string;
  detail?: string;
  onRetry: () => void;
}

export function ErrorScreen({ title, body, detail, onRetry }: ErrorScreenProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeErrorScreenStyles);
  const t = useT();

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={40} color={palette.error.default} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {__DEV__ && !!detail && <Text style={styles.detail}>{detail}</Text>}
      <Button label={t('error.retry')} onPress={onRetry} variant="primary" size="md" testID="error-retry" />
    </View>
  );
}

const makeErrorScreenStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
      gap: Spacing.md,
      backgroundColor: theme.surface.base,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      textAlign: 'center',
    },
    body: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
    detail: {
      ...Typography.bodySmall,
      color: theme.error.default,
      textAlign: 'center',
    },
  });
