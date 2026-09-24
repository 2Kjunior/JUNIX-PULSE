/**
 * Écran de Détail d'une Habitude.
 * Affiche le streak courant, le meilleur streak, l'historique récent (14 jours),
 * permet de mettre l'habitude en pause ou d'annuler une pause, et de la supprimer.
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
import { format, subDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

import { HabitUseCases, HabitStats } from '@/use-cases/habit-use-cases';
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

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<HabitStats | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await HabitUseCases.getHabitWithStats(id);
      if (!data) {
        setError('Habitude introuvable.');
        return;
      }
      setStats(data);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la récupération de l\'habitude.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleDay = async (dateStr: string) => {
    if (!id) return;
    try {
      await HabitUseCases.toggleHabitCompletion(id, dateStr);
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handlePause = async () => {
    if (!id || !stats) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    Alert.alert(
      'Mettre en pause',
      'Une habitude en pause conserve son streak actif. Les jours de pause ne comptent ni comme succès ni comme échec.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Mettre en pause',
          style: 'default',
          onPress: async () => {
            await HabitUseCases.pauseHabit(id, todayStr, undefined, 'Pause utilisateur');
            showSnackbar('Habitude mise en pause');
            loadData();
          },
        },
      ]
    );
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      await HabitUseCases.resumeHabit(id);
      showSnackbar('Habitude reprise avec succès !');
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleDelete = () => {
    if (!id || !stats) return;
    Alert.alert(
      'Supprimer l\'habitude',
      `Êtes-vous sûr de vouloir supprimer "${stats.habit.title}" ? L'historique sera supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await HabitUseCases.deleteHabit(id);
            showSnackbar('Habitude supprimée');
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingState message="Chargement du détail..." />;
  }

  if (error || !stats) {
    return <ErrorState message={error || 'Introuvable'} onRetry={loadData} />;
  }

  // Générer les 14 derniers jours pour le calendrier
  const last14Days = Array.from({ length: 14 }).map((_, idx) => {
    const day = subDays(new Date(), 13 - idx);
    const dateStr = format(day, 'yyyy-MM-dd');
    const isCompleted = stats.completions.some(c => c.completedDate === dateStr);
    return {
      date: day,
      dateStr,
      dayLabel: format(day, 'dd', { locale: fr }),
      weekDayLabel: format(day, 'EEEEEE', { locale: fr }),
      isToday: isSameDay(day, new Date()),
      isCompleted,
    };
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {stats.habit.title}
        </Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={ErrorColors.default} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* En-tête statut */}
        <View style={styles.topCard}>
          <Text style={styles.title}>{stats.habit.title}</Text>
          {stats.habit.description ? (
            <Text style={styles.desc}>{stats.habit.description}</Text>
          ) : null}

          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {stats.habit.status === 'PAUSED' ? 'En pause' : 'Active'}
              </Text>
            </View>
            <Text style={styles.freqTag}>
              {stats.habit.frequency === 'DAILY' ? 'Quotidienne' : 'Hebdomadaire'}
            </Text>
          </View>
        </View>

        {/* Statistiques Streaks */}
        <View style={styles.streakGrid}>
          <View style={styles.streakBox}>
            <Ionicons name="flame" size={28} color="#FF9800" />
            <Text style={styles.streakVal}>{stats.currentStreak}</Text>
            <Text style={styles.streakLabel}>Série actuelle (jours)</Text>
          </View>

          <View style={styles.streakBox}>
            <Ionicons name="trophy" size={28} color={Primary.default} />
            <Text style={styles.streakVal}>{stats.bestStreak}</Text>
            <Text style={styles.streakLabel}>Meilleure série</Text>
          </View>
        </View>

        {/* Historique 14 derniers jours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique des 14 derniers jours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyRow}>
            {last14Days.map(d => (
              <TouchableOpacity
                key={d.dateStr}
                style={[
                  styles.dayCard,
                  d.isToday && styles.dayCardToday,
                  d.isCompleted && styles.dayCardCompleted,
                ]}
                onPress={() => handleToggleDay(d.dateStr)}
              >
                <Text style={[styles.dayWeek, d.isCompleted && { color: Surface.base }]}>
                  {d.weekDayLabel}
                </Text>
                <Text style={[styles.dayNum, d.isCompleted && { color: Surface.base }]}>
                  {d.dayLabel}
                </Text>
                <Ionicons
                  name={d.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={d.isCompleted ? Surface.base : OnSurface.disabled}
                  style={{ marginTop: 4 }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Actions (Pause / Reprise) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestion de la routine</Text>
          {stats.habit.status === 'PAUSED' ? (
            <TouchableOpacity style={styles.actionRow} onPress={handleResume}>
              <Ionicons name="play" size={22} color={Primary.default} />
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Reprendre l'habitude</Text>
                <Text style={styles.actionDesc}>Réactiver la validation quotidienne.</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionRow} onPress={handlePause}>
              <Ionicons name="pause" size={22} color="#FF9800" />
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Mettre en pause</Text>
                <Text style={styles.actionDesc}>Garder votre streak intact pendant les vacances.</Text>
              </View>
            </TouchableOpacity>
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
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statusBadge: {
    backgroundColor: Surface.high,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: { ...Typography.labelMedium, color: OnSurface.primary },
  freqTag: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  streakGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  streakBox: {
    flex: 1,
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  streakVal: { ...Typography.headlineLarge, color: OnSurface.primary, marginTop: 4 },
  streakLabel: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2, textAlign: 'center' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.titleMedium, color: OnSurface.primary, marginBottom: Spacing.md },
  historyRow: { flexDirection: 'row', paddingVertical: Spacing.xs },
  dayCard: {
    width: 48,
    height: 76,
    borderRadius: Radius.md,
    backgroundColor: Surface.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  dayCardToday: { borderColor: Primary.default, borderWidth: 2 },
  dayCardCompleted: { backgroundColor: Primary.default, borderColor: Primary.default },
  dayWeek: { ...Typography.labelSmall, color: OnSurface.variant, textTransform: 'uppercase' },
  dayNum: { ...Typography.titleMedium, color: OnSurface.primary, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  actionTextCol: { flex: 1 },
  actionTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  actionDesc: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
});
