/**
 * Écran de Recherche globale (R-13) — Junix Pulse.
 *
 * Spécifications :
 * - Champ de recherche transversal avec debounce (~250ms)
 * - Filtres rapides : Tous, Rappels, Tâches, Personnes, Événements, Objectifs
 * - Recherches récentes avec possibilité de les effacer
 * - Résultats groupés par type d'entité avec icônes vectorielles dédiées
 * - Navigation directe 1-tap vers l'écran de détail de l'entité
 * - Zéro emoji, respect strict de la palette dynamique Midnight / Crème
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputInstance,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Keyboard,
  Platform,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/utils/logger';

import { MessageKey, useT } from '@/i18n';
import { getDatabase } from '@/database/sqlite';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { GlowCard } from '@/components/ui/GlowCard';
import { makeSearchStyles } from '@/styles/search-styles';

type SearchFilter = 'ALL' | 'REMINDERS' | 'TASKS' | 'PERSONS' | 'EVENTS' | 'GOALS';

interface SearchResultItem {
  id: string;
  type: 'REMINDER' | 'TASK' | 'PERSON' | 'EVENT' | 'GOAL';
  title: string;
  subtitle?: string;
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  typeLabel: string;
}

const FILTER_ITEMS: { key: SearchFilter; labelKey: MessageKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL', labelKey: 'search.filter.all', icon: 'apps-outline' },
  { key: 'REMINDERS', labelKey: 'tab.reminders', icon: 'notifications-outline' },
  { key: 'TASKS', labelKey: 'tab.tasks', icon: 'checkmark-circle-outline' },
  { key: 'PERSONS', labelKey: 'people.title', icon: 'person-outline' },
  { key: 'EVENTS', labelKey: 'search.filter.events', icon: 'calendar-outline' },
  { key: 'GOALS', labelKey: 'search.filter.goals', icon: 'flag-outline' },
];

export default function SearchScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInputInstance>(null);
  const { theme } = useTheme();
  const styles = useThemedStyles(makeSearchStyles);
  const isLight = theme.mode === 'light';

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('ALL');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [_loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    t('search.sample1'),
    t('search.sample2'),
    t('search.sample3'),
  ]);

  // Focus automatique du champ au montage
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Recherche dans la base SQLite locale avec debounce 250ms
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const db = await getDatabase();
        const searchPattern = `%${trimmed}%`;
        const found: SearchResultItem[] = [];

        // 1. Rappels
        const reminders = await db.getAllAsync<{
          id: string;
          title: string;
          notes: string | null;
          scheduled_at: string;
          priority: string;
        }>(
          `SELECT id, title, notes, scheduled_at, priority
           FROM reminders 
           WHERE deleted_at IS NULL AND (title LIKE ? OR notes LIKE ?)
            ORDER BY scheduled_at ASC LIMIT 10`,
          [searchPattern, searchPattern]
        );
        reminders.forEach((r) => {
          found.push({
            id: r.id,
            type: 'REMINDER',
            title: r.title,
            subtitle: t('search.due', { date: r.scheduled_at.substring(0, 10) }),
            route: `/reminders/${r.id}`,
            icon: 'notifications-outline',
            color: theme.primary.default,
            typeLabel: t('search.type.reminder'),
          });
        });

        // 2. Tâches
        const tasks = await db.getAllAsync<{
          id: string;
          title: string;
          description: string | null;
          status: string;
        }>(
          `SELECT id, title, description, status 
           FROM tasks 
           WHERE deleted_at IS NULL AND (title LIKE ? OR description LIKE ?)
           ORDER BY created_at DESC LIMIT 10`,
          [searchPattern, searchPattern]
        );
        tasks.forEach((task) => {
          found.push({
            id: task.id,
            type: 'TASK',
            title: task.title,
            subtitle: task.status === 'COMPLETED' ? t('taskDetail.status.COMPLETED') : t('search.todo'),
            route: `/tasks/${task.id}`,
            icon: 'checkmark-circle-outline',
            color: theme.tertiary.default,
            typeLabel: t('search.type.task'),
          });
        });

        // 3. Personnes
        const persons = await db.getAllAsync<{
          id: string;
          displayName: string;
          relationship: string | null;
        }>(
          `SELECT id, display_name AS displayName, relationship 
           FROM persons 
           WHERE deleted_at IS NULL AND (display_name LIKE ? OR relationship LIKE ?)
           ORDER BY display_name ASC LIMIT 10`,
          [searchPattern, searchPattern]
        );
        persons.forEach((p) => {
          found.push({
            id: p.id,
            type: 'PERSON',
            title: p.displayName,
            subtitle: p.relationship ?? t('pulse.type.contact'),
            route: `/people/${p.id}`,
            icon: 'person-outline',
            color: isLight ? '#0284C7' : '#38BDF8',
            typeLabel: t('pulse.type.contact'),
          });
        });

        // 4. Événements
        const events = await db.getAllAsync<{
          id: string;
          title: string;
          location: string | null;
          start_at: string;
        }>(
          `SELECT id, title, location, start_at 
           FROM events 
           WHERE deleted_at IS NULL AND (title LIKE ? OR location LIKE ?)
           ORDER BY start_at ASC LIMIT 10`,
          [searchPattern, searchPattern]
        );
        events.forEach((e) => {
          found.push({
            id: e.id,
            type: 'EVENT',
            title: e.title,
            subtitle: e.start_at ? e.start_at.substring(0, 16).replace('T', ' ') : undefined,
            route: `/events/${e.id}`,
            icon: 'calendar-outline',
            color: theme.primary.default,
            typeLabel: t('search.type.event'),
          });
        });

        // 5. Objectifs
        const goals = await db.getAllAsync<{
          id: string;
          title: string;
          description: string | null;
          status: string;
          deadline: string | null;
        }>(
          `SELECT id, title, description, status, deadline
           FROM goals 
            WHERE deleted_at IS NULL AND (title LIKE ? OR description LIKE ?)
           ORDER BY created_at DESC LIMIT 10`,
          [searchPattern, searchPattern]
        );
        goals.forEach((g) => {
          found.push({
            id: g.id,
            type: 'GOAL',
            title: g.title,
            subtitle: g.deadline
              ? t('search.due', { date: g.deadline.substring(0, 10) })
              : g.status === 'COMPLETED'
                ? t('search.goalDone')
                : t('search.goalActive'),
            route: `/goals/${g.id}`,
            icon: 'flag-outline',
            color: theme.success.default,
            typeLabel: t('goals.fab'),
          });
        });

        setResults(found);
      } catch (err) {
        logger.error('Erreur recherche globale :', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query, theme, isLight, t]);

  // Filtrage selon le filtre sélectionné
  const filteredResults = results.filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'REMINDERS') return item.type === 'REMINDER';
    if (activeFilter === 'TASKS') return item.type === 'TASK';
    if (activeFilter === 'PERSONS') return item.type === 'PERSON';
    if (activeFilter === 'EVENTS') return item.type === 'EVENT';
    if (activeFilter === 'GOALS') return item.type === 'GOAL';
    return true;
  });

  const handleSelectResult = (item: SearchResultItem) => {
    Keyboard.dismiss();
    const trimmed = query.trim();
    if (trimmed && !recentSearches.includes(trimmed)) {
      setRecentSearches((prev) => [trimmed, ...prev.slice(0, 5)]);
    }
    router.push(item.route);
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Barre supérieure avec champ de recherche ──────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={theme.onSurface.primary} />
        </TouchableOpacity>

        {/* L'unique gradient discret de l'écran en contour subtil de la barre de recherche */}
        <LinearGradient
          colors={
            isLight
              ? ['rgba(107, 70, 193, 0.35)', 'rgba(14, 116, 144, 0.2)']
              : ['rgba(208, 188, 255, 0.35)', 'rgba(123, 208, 255, 0.2)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.searchBarBorder}
        >
          <View style={styles.searchBarInner}>
            <Ionicons name="search-outline" size={20} color={theme.onSurface.variant} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.onSurface.disabled}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={theme.onSurface.disabled} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* ─── Filtres rapides (Chips) ────────────────────────────────────────── */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersList}>
          {FILTER_ITEMS.map((filter) => {
            const isSelected = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Ionicons
                  name={filter.icon}
                  size={14}
                  color={isSelected ? (isLight ? theme.primary.onContainer : theme.onSurface.primary) : theme.onSurface.variant}
                />
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {t(filter.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Contenu principal ─────────────────────────────────────────────── */}
      {query.trim().length === 0 ? (
        /* Écran d'accueil de la recherche / Recherches récentes */
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {recentSearches.length > 0 ? (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('search.recent')}</Text>
                <TouchableOpacity onPress={handleClearRecent}>
                  <Text style={styles.clearText}>{t('search.clear')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentChipsRow}>
                {recentSearches.map((term, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentChip}
                    onPress={() => handleSelectRecent(term)}
                  >
                    <Ionicons name="time-outline" size={14} color={theme.onSurface.disabled} />
                    <Text style={styles.recentChipText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Guide de recherche transversal */}
          <GlowCard tone="neutral">
            <View style={styles.infoCardInner}>
              <Ionicons name="sparkles-outline" size={24} color={theme.primary.default} />
              <Text style={styles.infoCardTitle}>{t('search.infoTitle')}</Text>
              <Text style={styles.infoCardText}>
                {t('search.infoText')}
              </Text>
            </View>
          </GlowCard>
        </ScrollView>
      ) : filteredResults.length > 0 ? (
        /* Liste des résultats trouvés */
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <GlowCard
              tone={
                item.type === 'REMINDER' ? 'attention' : item.type === 'EVENT' ? 'primary' : 'neutral'
              }
              intensity="soft"
              onPress={() => handleSelectResult(item)}
              accessibilityLabel={`${item.title}, ${item.typeLabel}`}
            >
              <View style={styles.resultRow}>
                <View style={[styles.typeIconContainer, { backgroundColor: `${item.color}1F` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>

                <View style={styles.resultInfo}>
                  <View style={styles.resultMetaRow}>
                    <Text style={[styles.typeBadge, { color: item.color }]}>{item.typeLabel}</Text>
                    {item.subtitle ? <Text style={styles.resultSubtitle}>{item.subtitle}</Text> : null}
                  </View>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.onSurface.disabled} />
              </View>
            </GlowCard>
          )}
        />
      ) : (
        /* État vide si aucun résultat */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="search-outline" size={36} color={theme.onSurface.disabled} />
          </View>
          <Text style={styles.emptyTitle}>{t('search.noResult')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('search.noMatch', { query: query.trim() })}
          </Text>
        </View>
      )}
    </View>
  );
}
