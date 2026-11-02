/**
 * Barre d'actions fixes en bas de l'écran de détail d'un rappel — Référence R-06.
 * Extrait de reminders/[id].tsx.
 */
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { GlassActionButton } from '@/components/ui/GlassActionButton';
import { GlowCardTokens, Spacing } from '@/constants/theme';
import { useReduceTransparency } from '@/hooks/use-reduce-transparency';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { makeReminderDetailStyles } from '@/styles/reminders/reminder-detail-styles';
import { useT } from '@/i18n';

interface ReminderBottomBarProps {
  insetsBottom: number;
  onSnooze: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function ReminderBottomBar({
  insetsBottom,
  onSnooze,
  onComplete,
  onDelete,
}: ReminderBottomBarProps) {
  const t = useT();
  const { theme, isDark } = useTheme();
  const styles = useThemedStyles(makeReminderDetailStyles);
  const reduceTransparency = useReduceTransparency();

  return (
    <View
      style={[
        styles.bottomBar,
        reduceTransparency && styles.bottomBarOpaque,
        { bottom: insetsBottom + Spacing.sm },
      ]}
    >
      {/* Android affiche un simple voile sans BlurTargetView : la barre y reste translucide sans flou */}
      {!reduceTransparency && Platform.OS !== 'android' && (
        <BlurView
          intensity={GlowCardTokens.glass.blurIntensity}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      <GlassActionButton
        icon="alarm-outline"
        label={t('bottomBar.snooze')}
        color={theme.tertiary.default}
        onPress={onSnooze}
        accessibilityLabel={t('bottomBar.snoozeA11y')}
        style={styles.bottomBtn}
      />
      <GlassActionButton
        icon="checkmark-circle-outline"
        label={t('tasks.complete')}
        color={theme.success.default}
        onPress={onComplete}
        accessibilityLabel={t('reminders.markDoneA11y')}
        style={styles.bottomBtn}
      />
      <GlassActionButton
        icon="trash-outline"
        label={t('common.delete')}
        color={theme.error.default}
        onPress={onDelete}
        accessibilityLabel={t('bottomBar.deleteA11y')}
        style={styles.bottomBtn}
      />
    </View>
  );
}
