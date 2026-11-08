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
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
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
import { getTodayFocusMinutes } from '@/services/focus-stats-service';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { GlowCard } from '@/components/ui/GlowCard';
import { PulseLogo } from '@/components/ui/PulseLogo';
import { PulseMascot } from '@/features/mascot/PulseMascot';
import { useMascotPreferences } from '@/features/mascot/use-mascot-preferences';
import { useLanguage, useT, type TFunction } from '@/i18n';
import { suggestionTexts } from '@/i18n/suggestion-text';
import { CompanionAnchor } from '@/features/mascot/CompanionAnchor';
import { noteProposalRefused } from '@/services/mascot/mascot-budget-service';
import {
  isViewOnlySuggestion,
  suggestionDestination,
  suggestionMood,
  suggestionProposalId,
} from '@/domain/rules/mascot-suggestion-rules';
import { makePulseStyles } from '@/styles/tabs/pulse-styles';

// ─── Helpers visuels ─────────────────────────────────────────────────────────

type SuggMeta = {
  tone: GlowTone;
  label: string;
  bg: string;
  fg: string;
  icon: 'person-outline' | 'alarm-outline' | 'repeat-outline' | 'bulb-outline';
};

function getSuggMeta(type: Suggestion['type'], theme: ThemePalette, t: TFunction): SuggMeta {
  const isLight = theme.mode === 'light';

  switch (type) {
    case 'FORGOTTEN_CONTACT':
      return {
        tone: 'info',
        label: t('pulse.type.contact'),
        bg: isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.15)',
        fg: isLight ? '#0284C7' : '#38BDF8',
        icon: 'person-outline',
      };
    case 'RESCHEDULE_REMINDER':
      return {
        tone: 'attention',
        label: t('pulse.type.reminder'),
        bg: isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(251, 191, 36, 0.15)',
        fg: isLight ? '#D97706' : '#FBBF24',
        icon: 'alarm-outline',
      };
    case 'HABIT_REMINDER':
      return {
        tone: 'success',
        label: t('pulse.type.habit'),
        bg: isLight ? 'rgba(5, 150, 105, 0.15)' : 'rgba(109, 213, 140, 0.15)',
        fg: isLight ? '#059669' : '#6DD58C',
        icon: 'repeat-outline',
      };
    default:
      return {
        tone: 'primary',
        label: t('pulse.type.suggestion'),
        bg: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.15)',
        fg: theme.primary.default,
        icon: 'bulb-outline',
      };
  }
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PulseScreen() {
  const t = useT();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makePulseStyles);
  const isLight = theme.mode === 'light';
  const { settings: mascotSettings } = useMascotPreferences();
  const mascotPresent = mascotSettings.presence !== 'off';

  const [refreshing, setRefreshing] = useState(false);
  const [habitCount, setHabitCount] = useState<number | null>(null);
  const [goalCount, setGoalCount] = useState<number | null>(null);
  // Minutes of Focus finished today, kept across restarts
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Le moteur de suggestion est appelé à chaque focus — SQLite local, latence ~0.
  const loadData = useCallback(async () => {
    try {
      const [habits, goals, suggs, focusMinutes] = await Promise.all([
        HabitUseCases.getAllHabitsWithStats(),
        GoalUseCases.getAllGoalsWithDetails(),
        SuggestionUseCases.generateSuggestions(),
        getTodayFocusMinutes().catch(() => 0),
      ]);
      setTodayFocusMinutes(focusMinutes);
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

  const handleAccept = async (suggestion: Suggestion) => {
    try {
      await SuggestionUseCases.acceptSuggestion(suggestion.id);
      showSnackbar(t('pulse.accepted'));
      loadData();
      // Certaines propositions mènent à l'écran où l'utilisateur décide (planning, objectif, rappels)
      const destination = suggestionDestination(suggestion);
      if (destination) router.push(destination as never);
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('pulse.unexpected'));
    }
  };

  const handleRefuse = async (suggestion: Suggestion) => {
    try {
      await SuggestionUseCases.refuseSuggestion(suggestion.id);
      await noteProposalRefused(suggestionProposalId(suggestion.type));
      showSnackbar(t('home.suggestion.ignored'));
      loadData();
    } catch (e) {
      GlassAlert.alert(t('common.error'), e instanceof Error ? e.message : t('pulse.unexpected'));
    }
  };

  // Métriques affichées dans la bande à 3 colonnes
  const stats = [
    { value: habitCount ?? '-', label: t('pulse.statHabits') },
    { value: goalCount ?? '-', label: t('pulse.statGoals') },
    { value: suggestions.length, label: t('pulse.statSuggestions') },
  ];

  // Modules raccourcis vers les sous-écrans
  const MODULES = [
    {
      icon: 'timer-outline' as const,
      label: t('pulse.focusTitle'),
      desc:
        todayFocusMinutes > 0
          ? t('pulse.focusToday', { minutes: todayFocusMinutes })
          : t('pulse.focusDesc'),
      color: theme.primary.default,
      bg: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.12)',
      route: '/focus',
    },
    {
      icon: 'repeat-outline' as const,
      label: t('habits.title'),
      desc: habitCount !== null ? t('pulse.habitsActive', { count: habitCount }) : t('pulse.habitsDesc'),
      color: theme.tertiary.default,
      bg: isLight ? theme.tertiary.container : 'rgba(123, 208, 255, 0.12)',
      route: '/habits',
    },
    {
      icon: 'flag-outline' as const,
      label: t('pulse.goalsTitle'),
      desc: goalCount !== null ? t('pulse.goalsActive', { count: goalCount }) : t('pulse.goalsDesc'),
      color: theme.success.default,
      bg: isLight ? theme.success.container : 'rgba(109, 213, 140, 0.12)',
      route: '/goals',
    },
    {
      icon: 'stats-chart-outline' as const,
      label: t('pulse.reviewTitle'),
      desc: t('pulse.reviewDesc'),
      color: theme.primary.default,
      bg: isLight ? theme.primary.container : 'rgba(208, 188, 255, 0.12)',
      route: '/review?period=week',
    },
  ];

  const hasNoSuggestions = suggestions.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── En-tête R-09 (Modèle Personnes) ─────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pulse</Text>
          <Text style={styles.subtitle}>{t('pulse.subtitle')}</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('common.settings')}
        >
          <Ionicons name="settings-outline" size={20} color={theme.onSurface.variant} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 48 },
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
          {/* La mascotte remplace le logo : son humeur de fond suit la journée (seul élément ambiant) */}
          {mascotPresent ? <CompanionAnchor screen="pulse" size={96} /> : <PulseLogo size={96} mode="static" />}
        </View>

        <Text style={styles.heroTitle}>Pulse</Text>
        <Text style={styles.heroSubtitle}>
          {t('pulse.heroSubtitle')}
        </Text>

        {/* Puce état système */}
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {hasNoSuggestions ? t('pulse.allGood') : t('pulse.actionsSuggested', { count: suggestions.length })}
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
          <Text style={styles.sectionTitle}>{t('pulse.suggestions')}</Text>
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
          <Text style={styles.emptyTitle}>{t('pulse.emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>
            {t('pulse.emptyDesc')}
          </Text>
        </View>
      ) : (
        /* Cartes de suggestion */
        <View style={styles.suggestionsList}>
          {suggestions.map(s => {
            const meta = getSuggMeta(s.type, theme, t);
            const texts = suggestionTexts(s, language, t);
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
                    {/* Mini-mascotte dont l'humeur suit le type de la proposition */}
                    {mascotPresent && <PulseMascot mood={suggestionMood(s.type)} size={28} animated={false} />}
                  </View>

                  {/* Titre + explication */}
                  <Text style={styles.suggTitle}>{texts.title}</Text>
                  <Text style={styles.suggExplanation}>{texts.explanation}</Text>

                  {/* Actions */}
                  <View style={styles.suggActions}>
                    <TouchableOpacity
                      style={styles.refuseBtn}
                      onPress={() => handleRefuse(s)}
                      accessibilityLabel={t('pulse.ignoreA11y')}
                    >
                      <Text style={styles.refuseText}>{t('pulse.ignore')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(s)}
                      accessibilityLabel={t('pulse.acceptA11y', { title: texts.title })}
                    >
                      <Ionicons name="checkmark" size={14} color={isLight ? theme.primary.onContainer : theme.primary.default} />
                      <Text style={styles.acceptText}>{isViewOnlySuggestion(s.type) ? t('proposal.view') : t('proposal.accept')}</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.onSurface.variant }]}>{t('pulse.modules')}</Text>
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
    </View>
  );
}
