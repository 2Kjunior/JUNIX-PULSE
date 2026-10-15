/**
 * Barre d'actions fixes en bas de l'écran de détail d'un rappel — Référence R-06.
 * Extrait de reminders/[id].tsx.
 */
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { makeReminderDetailStyles } from '@/styles/reminders/reminder-detail-styles';

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
  const { theme } = useTheme();
  const styles = useThemedStyles(makeReminderDetailStyles);
  const isLight = theme.mode === 'light';

  return (
    <View style={[styles.bottomBar, { paddingBottom: insetsBottom + Spacing.md }]}>
      <TouchableOpacity
        style={[styles.bottomBtn, styles.snoozeBtn]}
        onPress={onSnooze}
        accessibilityLabel="Reporter ce rappel"
      >
        <Ionicons name="alarm-outline" size={18} color={isLight ? theme.tertiary.onContainer : theme.tertiary.default} />
        <Text style={styles.snoozeBtnText}>Reporter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.bottomBtn, styles.completeBtn]}
        onPress={onComplete}
        accessibilityLabel="Marquer le rappel comme terminé"
      >
        <Ionicons name="checkmark-circle-outline" size={18} color={isLight ? theme.success.onContainer : theme.success.default} />
        <Text style={styles.completeBtnText}>Terminer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.bottomBtn, styles.deleteBtn]}
        onPress={onDelete}
        accessibilityLabel="Supprimer ce rappel"
      >
        <Ionicons name="trash-outline" size={18} color={isLight ? theme.error.onContainer : theme.error.default} />
        <Text style={styles.deleteBtnText}>Supprimer</Text>
      </TouchableOpacity>
    </View>
  );
}
