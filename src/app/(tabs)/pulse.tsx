/**
 * Onglet Pulse — Tableau de bord central : Habitudes, Objectifs et Suggestions proactives.
 * BR-001 : Affiche les suggestions intelligentes avec explications et validation humaine.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  Surface, Primary, Tertiary, OnSurface, Outline, Spacing, Radius, Typography,
} from '@/constants/theme';
import { HabitUseCases } from '@/use-cases/habit-use-cases';
import { GoalUseCases } from '@/use-cases/goal-use-cases';
import { SuggestionUseCases } from '@/use-cases/suggestion-use-cases';
import { Suggestion } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);
  const [habitCount, setHabitCount] = useState<number | null>(null);
  const [goalCount, setGoalCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [habits, goals, suggs] = await Promise.all([
        HabitUseCases.getAllHabitsWithStats(),
        GoalUseCases.getAllGoalsWithDetails(),
        SuggestionUseCases.generateSuggestions(),
      ]);
      setHabitCount(habits.filter(h => h.habit.status === 'ACTIVE').length);
      setGoalCount(goals.filter(g => g.goal.status === 'ACTIVE').length);
      setSuggestions(suggs);
    } catch {
      // Ignorer silencieusement en cas d'erreur temporaire
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAcceptSuggestion = async (id: string, title: string) => {
    try {
      await SuggestionUseCases.acceptSuggestion(id);
      showSnackbar(`Suggestion "${title}" acceptée !`);
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleRefuseSuggestion = async (id: string) => {
    try {
      await SuggestionUseCases.refuseSuggestion(id);
      showSnackbar('Suggestion ignorée.');
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const SECTIONS = [
    {
      icon: 'repeat-outline' as const,
      label: 'Habitudes & Streaks',
      desc: habitCount !== null ? `${habitCount} habitudes actives` : 'Suivez vos pratiques quotidiennes.',
      color: Tertiary.default,
      route: '/habits/index',
    },
    {
      icon: 'flag-outline' as const,
      label: 'Objectifs & Progression',
      desc: goalCount !== null ? `${goalCount} objectifs en cours` : 'Progression liée à vos tâches.',
      color: '#6DD58C',
      route: '/goals/index',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          tintColor={Primary.default}
        />
      }
    >
      <Text style={styles.title}>Pulse</Text>
      <Text style={styles.subtitle}>
        Votre centre de croissance et de suivi personnel.
      </Text>

      {/* Raccourcis Modules */}
      {SECTIONS.map(s => (
        <TouchableOpacity
          key={s.label}
          style={styles.sectionCard}
          onPress={() => router.push(s.route as never)}
          activeOpacity={0.8}
        >
          <View style={[styles.sectionIcon, { backgroundColor: s.color + '20' }]}>
            <Ionicons name={s.icon} size={24} color={s.color} />
          </View>
          <View style={styles.sectionBody}>
            <Text style={styles.sectionLabel}>{s.label}</Text>
            <Text style={styles.sectionDesc}>{s.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={OnSurface.disabled} />
        </TouchableOpacity>
      ))}

      {/* Suggestions Proactives */}
      <View style={styles.suggestionsSection}>
        <View style={styles.suggHeader}>
          <Ionicons name="bulb" size={20} color={Primary.default} />
          <Text style={styles.suggTitle}>
            Suggestions intelligentes ({suggestions.length})
          </Text>
        </View>

        {suggestions.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>✦ Tout est sous contrôle</Text>
            <Text style={styles.placeholderDesc}>
              Aucune suggestion urgente pour le moment. Junix Pulse continuera d'analyser vos
              rappels, tâches et contacts pour vous proposer des actions pertinentes.
            </Text>
          </View>
        ) : (
          suggestions.map(s => (
            <View key={s.id} style={styles.suggCard}>
              <View style={styles.suggBody}>
                <Text style={styles.suggCardTitle}>{s.title}</Text>
                <Text style={styles.suggCardDesc}>{s.explanation}</Text>
              </View>

              <View style={styles.suggActions}>
                <TouchableOpacity
                  style={styles.refuseBtn}
                  onPress={() => handleRefuseSuggestion(s.id)}
                >
                  <Text style={styles.refuseText}>Ignorer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptSuggestion(s.id, s.title)}
                >
                  <Ionicons name="checkmark" size={16} color={Surface.base} />
                  <Text style={styles.acceptText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  title: { ...Typography.headlineLarge, color: OnSurface.primary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.bodyMedium, color: OnSurface.variant, marginBottom: Spacing.xl },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: { flex: 1 },
  sectionLabel: { ...Typography.titleMedium, color: OnSurface.primary },
  sectionDesc: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  suggestionsSection: { marginTop: Spacing.lg },
  suggHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  suggTitle: { ...Typography.titleLarge, color: OnSurface.primary },
  placeholder: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Primary.default + '20',
  },
  placeholderTitle: {
    ...Typography.titleMedium,
    color: Primary.default,
    marginBottom: Spacing.sm,
  },
  placeholderDesc: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    lineHeight: 20,
  },
  suggCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Primary.default + '40',
  },
  suggBody: { marginBottom: Spacing.md },
  suggCardTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  suggCardDesc: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 4, lineHeight: 18 },
  suggActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  refuseBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  refuseText: { ...Typography.labelMedium, color: OnSurface.variant },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Primary.default,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  acceptText: { ...Typography.labelMedium, color: Surface.base, fontWeight: '700' },
});
