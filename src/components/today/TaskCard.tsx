/**
 * TaskCard — Carte de tâche avec checkbox et navigation.
 * Utilisé dans l'écran Aujourd'hui.
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/domain/entities';
import { OnSurface, Success } from '@/constants/theme';
import { GlowCard } from '@/components/ui/GlowCard';
import { styles } from '@/styles/tabs/today-styles';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const isCompleted = task.status === 'COMPLETED';

  // tone="neutral" : aucune priorité n'est affichée sur cette carte (pas de
  // chip visible), donc pas de couleur sémantique — règle d'accessibilité
  // du spec. Les tâches terminées restent neutres, texte atténué, sans lueur.
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
            color={isCompleted ? Success.default : OnSurface.variant}
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
              <Ionicons name="time-outline" size={12} color={OnSurface.variant} />
              <Text style={styles.cardSubtitle}>{task.estimatedMinutes} min</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
      </View>
    </GlowCard>
  );
}
