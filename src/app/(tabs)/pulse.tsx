/**
 * Onglet Pulse — Moteur de suggestion proactif de Junix Pulse.
 *
 * Ce n'est pas un chatbot. C'est un moteur d'analyse LOCAL qui :
 *  - Lit les données SQLite (Contacts, Rappels, Habitudes)
 *  - Applique des règles métier déterministes (BR-001 à BR-014)
 *  - Génère des Suggestions jamais appliquées automatiquement
 *  - Laisse l'utilisateur décider (Accepter / Ignorer)
 *
 * Latence : zéro appel réseau — tout est SQLite local.
 *
 * Règle A.1 : zéro emoji.
 * Règle A.2 : un seul dégradé de marque par écran (bouton CTA en bas).
 * Règle A.3 : orbe en mode 'idle' = seul élément ambiant de cet écran.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Spacing,
  TAB_BAR_TOTAL_HEIGHT,
  type GlowTone,
} from '@/constants/theme';
import { ThemePalette } from '@/constants/palettes';
import { HabitUseCases } from '@/use-cases/habit-use-cases';
import { GoalUseCases } from '@/use-cases/goal-use-cases';
import { SuggestionUseCases } from '@/use-cases/suggestion-use-cases';
import { Suggestion } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { GlowCard } from '@/components/ui/GlowCard';
import { PulseLogo } from '@/components/ui/PulseLogo';
import { makePulseStyles } from '@/styles/tabs/pulse-styles';

// ─── Helpers visuels ─────────────────────────────────────────────────────────

type SuggMeta = {
  tone: GlowTone;
  label: string;
  bg: string;
  fg: string;
  icon: 'person-outline' | 'alarm-outline' | 'repeat-outline' | 'bulb-outline';
};

function getSuggMeta(type: Suggestion['type'], theme: ThemePalette): SuggMeta {
  const isLight = theme.mode === 'light';

  switch (type) {
    case 'FORGOTTEN_CONTACT':
      return {
        tone: 'info',
        label: 'Contact',
        bg: isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.15)',
        fg: isLight ? '#0284C7' : '#38BDF8',
        icon: 'person-outline',
      };
    case 'RESCHEDULE_REMINDER':
      return {
        tone: 'attention',
        label: 'Rappel',
        bg: isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(251, 191, 36, 0.15)',
        fg: isLight ? '#D97706' : '#FBBF24',
        icon: 'alarm-outline',
      };
    case 'HABIT_REMINDER':
      return {
        tone: 'success',
        label: 'Habitude',
        bg: isLight ? 'rgba(5, 150, 105, 0.15)' : 'rgba(109, 213, 140, 0.15)',
        fg: isLight ? '#059669' : '#6DD58C',
        icon: 'repeat-outline',
      };
    default:
      return {
        tone: 'primary',
        label: 'Suggestion',
        bg: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.15)',
        fg: theme.primary.default,
        icon: 'bulb-outline',
      };
  }
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makePulseStyles);
  const isLight = theme.mode === 'light';

  const [refreshing, setRefreshing] = useState(false);
  const [habitCount, setHabitCount] = useState<number | null>(null);
  const [goalCount, setGoalCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Le moteur de suggestion est appelé à chaque focus — SQLite local, latence ~0.
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
      // Échec silencieux — les données restent dans l'état précédent
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAccept = async (id: string, _title: string) => {
    try {
      await SuggestionUseCases.acceptSuggestion(id);
      showSnackbar(`Suggestion acceptée.`);
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur inattendue');
    }
  };

  const handleRefuse = async (id: string) => {
    try {
      await SuggestionUseCases.refuseSuggestion(id);
      showSnackbar('Suggestion ignorée.');
      loadData();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur inattendue');
    }
  };

  // Métriques affichées dans la bande à 3 colonnes
  const stats = [
    { value: habitCount ?? '-', label: 'Habitudes\nactives' },
    { value: goalCount ?? '-', label: 'Objectifs\nen cours' },
    { value: suggestions.length, label: 'Suggestions\nen attente' },
  ];

  // Modules raccourcis vers les sous-écrans
  const MODULES = [
    {
      icon: 'repeat-outline' as const,
      label: 'Habitudes & Streaks',
      desc: habitCount !== null ? `${habitCount} habitudes actives` : 'Suivez vos pratiques quotidiennes.',
      color: theme.tertiary.default,
      bg: isLight ? theme.tertiary.container : 'rgba(123, 208, 255, 0.12)',
      route: '/habits',
    },
    {
      icon: 'flag-outline' as const,
      label: 'Objectifs & Progression',
      desc: goalCount !== null ? `${goalCount} objectifs en cours` : 'Progression liée à vos tâches.',
      color: theme.success.default,
      bg: isLight ? theme.success.container : 'rgba(109, 213, 140, 0.12)',
      route: '/goals',
    },
  ];

  const hasNoSuggestions = suggestions.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.md, paddingBottom: TAB_BAR_TOTAL_HEIGHT + 48 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          tintColor={theme.primary.default}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero : orbe central + état système ── */}
      <View style={styles.heroSection}>
        <View style={styles.orbContainer}>
          {/* Anneaux vitrés derrière l'orbe */}
          <View style={styles.orbRingOuter} />
          <View style={styles.orbRing} />
          {/* PulseLogo en mode idle : double battement toutes les 2.4s */}
          <PulseLogo size={96} mode="idle" />
        </View>

        <Text style={styles.heroTitle}>Pulse</Text>
        <Text style={styles.heroSubtitle}>
          Votre centre d'intelligence locale — analyse, propose, ne décide jamais.
        </Text>

        {/* Puce état système */}
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {hasNoSuggestions ? 'Tout est à jour' : `${suggestions.length} actions suggérées`}
          </Text>
        </View>
      </View>

      {/* ── Bande métriques 3 colonnes ── */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCell}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Suggestions proactives ── */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles" size={16} color={theme.primary.default} />
          <Text style={styles.sectionTitle}>Suggestions</Text>
          {suggestions.length > 0 && (
            <Text style={styles.suggCount}>{suggestions.length}</Text>
          )}
        </View>
      </View>

      {hasNoSuggestions ? (
        /* État vide */
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="checkmark-circle-outline" size={26} color={theme.primary.default} />
          </View>
          <Text style={styles.emptyTitle}>Tout est sous contrôle</Text>
          <Text style={styles.emptyDesc}>
            Le moteur local analyse vos contacts, rappels et habitudes en
            continu. Aucune action urgente pour le moment.
          </Text>
        </View>
      ) : (
        /* Cartes de suggestion */
        <View style={styles.suggestionsList}>
          {suggestions.map(s => {
            const meta = getSuggMeta(s.type, theme);
            return (
              <GlowCard
                key={s.id}
                tone={meta.tone}
                intensity="soft"
                size="list"
              >
                <View style={styles.suggInner}>
                  {/* Ligne supérieure : chip + espace */}
                  <View style={styles.suggTopRow}>
                    <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={10} color={meta.fg} />
                      <Text style={[styles.typePillText, { color: meta.fg }]}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  {/* Titre + explication */}
                  <Text style={styles.suggTitle}>{s.title}</Text>
                  <Text style={styles.suggExplanation}>{s.explanation}</Text>

                  {/* Actions */}
                  <View style={styles.suggActions}>
                    <TouchableOpacity
                      style={styles.refuseBtn}
                      onPress={() => handleRefuse(s.id)}
                      accessibilityLabel="Ignorer cette suggestion"
                    >
                      <Text style={styles.refuseText}>Ignorer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(s.id, s.title)}
                      accessibilityLabel={`Accepter : ${s.title}`}
                    >
                      <Ionicons name="checkmark" size={14} color={isLight ? theme.primary.onContainer : theme.primary.default} />
                      <Text style={styles.acceptText}>Accepter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlowCard>
            );
          })}
        </View>
      )}

      {/* ── Modules raccourcis ── */}
      <View style={styles.modulesSection}>
        <View style={[styles.sectionTitleRow, { marginBottom: Spacing.md }]}>
          <Ionicons name="grid-outline" size={16} color={theme.onSurface.variant} />
          <Text style={[styles.sectionTitle, { color: theme.onSurface.variant }]}>Modules</Text>
        </View>

        {MODULES.map(m => (
          <TouchableOpacity
            key={m.label}
            style={styles.moduleCard}
            onPress={() => router.push(m.route as never)}
            activeOpacity={0.8}
            accessibilityLabel={m.label}
          >
            <View style={[styles.moduleIcon, { backgroundColor: m.bg }]}>
              <Ionicons name={m.icon} size={22} color={m.color} />
            </View>
            <View style={styles.moduleBody}>
              <Text style={styles.moduleLabel}>{m.label}</Text>
              <Text style={styles.moduleDesc}>{m.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.onSurface.disabled} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
