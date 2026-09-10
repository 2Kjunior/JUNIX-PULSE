/**
 * Détail d'un Objectif.
 * Affiche la progression, la liste des tâches associées et permet d'en lier de nouvelles.
 * BR-012 : progression calculée en temps réel d'après les tâches associées.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { GoalUseCases, GoalDetails } from '@/use-cases/goal-use-cases';
import { TaskRepository } from '@/repositories/task-repository';
import { Task } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<GoalDetails | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await GoalUseCases.getGoalWithDetails(id);
      if (!data) {
        setError('Objectif introuvable.');
        return;
      }
      setDetails(data);

      // Charger toutes les tâches actives pour la liaison
      const allTasks = await TaskRepository.findAllActive();
      const linkedIds = new Set(data.associatedTasks.map(t => t.id));
      setAvailableTasks(allTasks.filter(t => !linkedIds.has(t.id)));
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la récupération.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLinkTask = async (taskId: string) => {
    if (!id) return;
    try {
      await GoalUseCases.linkTask(id, taskId);
      showSnackbar({ message: 'Tâche associée à l\'objectif !' });
      setShowTaskPicker(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleUnlinkTask = async (taskId: string, title: string) => {
    if (!id) return;
    try {
      await GoalUseCases.unlinkTask(id, taskId);
      showSnackbar({ message: `Tâche "${title}" dissociée.` });
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleDelete = () => {
    if (!id || !details) return;
    Alert.alert(
      'Supprimer l\'objectif',
      `Êtes-vous sûr de vouloir supprimer "${details.goal.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await GoalUseCases.deleteGoal(id);
            showSnackbar({ message: 'Objectif supprimé' });
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingState message="Chargement de l'objectif..." />;
  }

  if (error || !details) {
    return <ErrorState message={error || 'Introuvable'} onRetry={loadData} />;
  }

  const { goal, associatedTasks, progress, isOverdue, daysLeft } = details;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {goal.title}
        </Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={ErrorColors.default} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Top Card */}
        <View style={styles.topCard}>
          <Text style={styles.title}>{goal.title}</Text>
          {goal.description ? (
            <Text style={styles.desc}>{goal.description}</Text>
          ) : null}

          {/* Statut & Deadline */}
          <View style={styles.metaRow}>
            {goal.deadline && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={OnSurface.variant} />
                <Text style={styles.metaText}>
                  {format(new Date(goal.deadline), 'd MMMM yyyy', { locale: fr })}
                </Text>
              </View>
            )}
            {daysLeft !== null && (
              <Text
                style={[
                  styles.daysBadge,
                  isOverdue && { color: ErrorColors.default },
                ]}
              >
                {isOverdue
                  ? `Overdue (${Math.abs(daysLeft)} j)`
                  : `${daysLeft} jours restants`}
              </Text>
            )}
          </View>
        </View>

        {/* Progression */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progression globale</Text>
            <Text style={styles.progressPercent}>
              {progress !== null ? `${progress}%` : '—'}
            </Text>
          </View>

          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${progress ?? 0}%`, backgroundColor: Primary.default },
              ]}
            />
          </View>

          <Text style={styles.progressSub}>
            {associatedTasks.length > 0
              ? `${associatedTasks.filter(t => t.status === 'COMPLETED').length} / ${associatedTasks.length} tâches terminées`
              : 'Aucune tâche associée. Associez des tâches pour calculer la progression.'}
          </Text>
        </View>

        {/* Section Tâches Associées */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Tâches associées ({associatedTasks.length})
            </Text>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => setShowTaskPicker(!showTaskPicker)}
            >
              <Ionicons name="add" size={18} color={Primary.default} />
              <Text style={styles.linkBtnText}>Lier une tâche</Text>
            </TouchableOpacity>
          </View>

          {/* Picker de tâches à lier */}
          {showTaskPicker && (
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>Sélectionnez une tâche à lier :</Text>
              {availableTasks.length === 0 ? (
                <Text style={styles.pickerEmpty}>
                  Toutes vos tâches sont déjà liées ou aucune tâche disponible.
                </Text>
              ) : (
                availableTasks.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.pickerItem}
                    onPress={() => handleLinkTask(t.id)}
                  >
                    <Text style={styles.pickerItemText}>{t.title}</Text>
                    <Ionicons name="link" size={18} color={Primary.default} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Liste des tâches liées */}
          {associatedTasks.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucune tâche liée pour le moment. Cliquez sur "Lier une tâche" pour lier une tâche existante à cet objectif.
            </Text>
          ) : (
            associatedTasks.map(t => (
              <View key={t.id} style={styles.taskCard}>
                <Ionicons
                  name={
                    t.status === 'COMPLETED'
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={22}
                  color={t.status === 'COMPLETED' ? '#4CAF50' : OnSurface.disabled}
                />
                <Text
                  style={[
                    styles.taskTitle,
                    t.status === 'COMPLETED' && { textDecorationLine: 'line-through', opacity: 0.7 },
                  ]}
                >
                  {t.title}
                </Text>
                <TouchableOpacity onPress={() => handleUnlinkTask(t.id, t.title)}>
                  <Ionicons name="unlink-outline" size={20} color={OnSurface.disabled} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Surface.container,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  deleteBtn: { padding: Spacing.xs },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  topCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.headlineMedium, color: OnSurface.primary },
  desc: { ...Typography.bodyMedium, color: OnSurface.variant, marginTop: Spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.bodySmall, color: OnSurface.variant },
  daysBadge: { ...Typography.labelMedium, color: Primary.default, fontWeight: '600' },
  progressCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  progressPercent: { ...Typography.titleLarge, color: Primary.default },
  track: { height: 10, backgroundColor: Surface.elevated, borderRadius: Radius.full, overflow: 'hidden', marginVertical: Spacing.xs },
  fill: { height: '100%', borderRadius: Radius.full },
  progressSub: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: Spacing.xs },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkBtnText: { ...Typography.labelMedium, color: Primary.default, fontWeight: '600' },
  pickerBox: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Primary.default + '40',
  },
  pickerTitle: { ...Typography.labelMedium, color: OnSurface.primary, marginBottom: Spacing.xs },
  pickerEmpty: { ...Typography.bodySmall, color: OnSurface.variant },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  pickerItemText: { ...Typography.bodyMedium, color: OnSurface.primary },
  emptyText: { ...Typography.bodySmall, color: OnSurface.variant, fontStyle: 'italic' },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  taskTitle: { flex: 1, ...Typography.bodyMedium, color: OnSurface.primary },
});
