/**
 * TaskCard — Carte de tâche avec checkbox et navigation.
 * Utilisé dans l'écran Aujourd'hui. Thématisé dynamiquement.
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/domain/entities';
import { GlowCard } from '@/components/ui/GlowCard';
import { styles } from '@/styles/tabs/today-styles';
import { useTheme } from '@/hooks/use-theme';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const { palette } = useTheme();
  const isCompleted = task.status === 'COMPLETED';

  // tone="neutral" : aucune priorité n'est affichée sur cette carte.
  // Les tâches terminées restent neutres, texte atténué, sans lueur.
  return (
    <GlowCard tone="neutral">
      <View style={[styles.taskRow, isCompleted && { opacity: 0.6 }]}>
        <TouchableOpacity
          onPress={onComplete}
          style={styles.checkBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.65}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={isCompleted ? 'Marquer tâche non terminée' : 'Marquer tâche terminée'}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isCompleted ? palette.success.default : palette.onSurface.variant}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardBody}
          activeOpacity={0.82}
          onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
        >
          <Text
            style={[
              styles.cardTitle,
              isCompleted && styles.cardTitleStrikethrough,
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          {task.estimatedMinutes ? (
            <View style={styles.inlineMeta}>
              <Ionicons name="time-outline" size={12} color={palette.onSurface.variant} />
              <Text style={styles.cardSubtitle}>{task.estimatedMinutes} min</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </GlowCard>
  );
}
