/**
 * Écran de Recherche globale (R-13) — Junix Pulse.
 *
 * Spécifications :
 * - Champ de recherche transversal avec debounce (~250ms)
 * - Filtres rapides : Tous, Rappels, Tâches, Personnes, Événements, Objectifs
 * - Recherches récentes avec possibilité de les effacer
 * - Résultats groupés par type d'entité avec icônes vectorielles dédiées
 * - Navigation directe 1-tap vers l'écran de détail de l'entité
 * - Zéro emoji, respect strict de la palette Midnight (Partie A & B)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Keyboard,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/utils/logger';

import { getDatabase } from '@/database/sqlite';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';

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

const FILTER_ITEMS: { key: SearchFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL', label: 'Tous', icon: 'apps-outline' },
  { key: 'REMINDERS', label: 'Rappels', icon: 'notifications-outline' },
  { key: 'TASKS', label: 'Tâches', icon: 'checkmark-circle-outline' },
  { key: 'PERSONS', label: 'Personnes', icon: 'person-outline' },
  { key: 'EVENTS', label: 'Événements', icon: 'calendar-outline' },
  { key: 'GOALS', label: 'Objectifs', icon: 'flag-outline' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('ALL');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [_loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Rendez-vous',
    'Factures',
    'Entraînement',
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
          due_at: string;
          priority: string;
        }>(
          `SELECT id, title, notes, due_at, priority 
           FROM reminders 
           WHERE deleted_at IS NULL AND (title LIKE ? OR notes LIKE ?)
           ORDER BY due_at ASC LIMIT 10`,
          [searchPattern, searchPattern]
        );
        reminders.forEach((r) => {
          found.push({
            id: r.id,
            type: 'REMINDER',
            title: r.title,
            subtitle: r.due_at ? `Échéance : ${r.due_at.substring(0, 10)}` : 'Rappel sans date',
            route: `/reminders/${r.id}`,
            icon: 'notifications-outline',
            color: Primary.default,
            typeLabel: 'Rappel',
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
        tasks.forEach((t) => {
          found.push({
            id: t.id,
            type: 'TASK',
            title: t.title,
            subtitle: t.status === 'COMPLETED' ? 'Terminée' : 'À faire',
            route: `/tasks/${t.id}`,
            icon: 'checkmark-circle-outline',
            color: Tertiary.default,
            typeLabel: 'Tâche',
          });
        });

        // 3. Personnes
        const persons = await db.getAllAsync<{
          id: string;
          display_name: string;
          relationship: string | null;
          notes: string | null;
        }>(
          `SELECT id, display_name, relationship, notes 
           FROM persons 
           WHERE deleted_at IS NULL AND (display_name LIKE ? OR notes LIKE ? OR relationship LIKE ?)
           ORDER BY display_name ASC LIMIT 10`,
          [searchPattern, searchPattern, searchPattern]
        );
        persons.forEach((p) => {
          found.push({
            id: p.id,
            type: 'PERSON',
            title: p.display_name,
            subtitle: p.relationship || 'Contact',
            route: `/people/${p.id}`,
            icon: 'person-outline',
            color: '#FBBF24',
            typeLabel: 'Personne',
          });
        });

        // 4. Événements
        const events = await db.getAllAsync<{
          id: string;
          title: string;
          start_at: string;
          location: string | null;
        }>(
          `SELECT id, title, start_at, location 
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
            subtitle: e.start_at ? `${e.start_at.substring(0, 10)}${e.location ? ` • ${e.location}` : ''}` : 'Événement',
            route: `/events/${e.id}`,
            icon: 'calendar-outline',
            color: '#38BDF8',
            typeLabel: 'Événement',
          });
        });

        // 5. Objectifs
        const goals = await db.getAllAsync<{
          id: string;
          title: string;
          deadline: string | null;
          status: string;
        }>(
          `SELECT id, title, deadline, status 
           FROM goals 
           WHERE deleted_at IS NULL AND title LIKE ?
           ORDER BY created_at DESC LIMIT 10`,
          [searchPattern]
        );
        goals.forEach((g) => {
          found.push({
            id: g.id,
            type: 'GOAL',
            title: g.title,
            subtitle: g.deadline ? `Objectif jusqu'au ${g.deadline.substring(0, 10)}` : 'Objectif en cours',
            route: `/goals/${g.id}`,
            icon: 'flag-outline',
            color: '#34D399',
            typeLabel: 'Objectif',
          });
        });

        setResults(found);
      } catch {
        logger.error('Erreur lors de la recherche SQLite');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  // Filtrage selon le chip sélectionné
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
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>

        {/* L'unique gradient discret de l'écran en contour subtil de la barre de recherche */}
        <LinearGradient
          colors={['rgba(208, 188, 255, 0.35)', 'rgba(123, 208, 255, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.searchBarBorder}
        >
          <View style={styles.searchBarInner}>
            <Ionicons name="search-outline" size={20} color={OnSurface.variant} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher rappels, tâches, contacts..."
              placeholderTextColor={OnSurface.disabled}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={OnSurface.disabled} />
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
                  color={isSelected ? OnSurface.primary : OnSurface.variant}
                />
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {filter.label}
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
                <Text style={styles.sectionTitle}>Recherches récentes</Text>
                <TouchableOpacity onPress={handleClearRecent}>
                  <Text style={styles.clearText}>Effacer</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentChipsRow}>
                {recentSearches.map((term, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentChip}
                    onPress={() => handleSelectRecent(term)}
                  >
                    <Ionicons name="time-outline" size={14} color={OnSurface.disabled} />
                    <Text style={styles.recentChipText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Guide de recherche transversal */}
          <View style={styles.infoCard}>
            <Ionicons name="sparkles-outline" size={24} color={Primary.default} />
            <Text style={styles.infoCardTitle}>Recherche unifiée locale</Text>
            <Text style={styles.infoCardText}>
              Tapez un mot-clé pour chercher simultanément dans vos rappels, vos tâches quotidiennes, vos contacts de confiance, vos rendez-vous et vos objectifs.
            </Text>
          </View>
        </ScrollView>
      ) : filteredResults.length > 0 ? (
        /* Liste des résultats trouvés */
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => handleSelectResult(item)}
              activeOpacity={0.7}
            >
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

              <Ionicons name="chevron-forward" size={18} color={OnSurface.disabled} />
            </TouchableOpacity>
          )}
        />
      ) : (
        /* État vide si aucun résultat */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="search-outline" size={36} color={OnSurface.disabled} />
          </View>
          <Text style={styles.emptyTitle}>Aucun résultat trouvé</Text>
          <Text style={styles.emptySubtitle}>
            Aucun élément ne correspond à « {query.trim()} » pour le filtre sélectionné.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarBorder: {
    flex: 1,
    borderRadius: Radius.md,
    padding: 1,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md - 1,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
    height: '100%',
  },
  clearButton: {
    padding: Spacing.xs,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
    paddingBottom: Spacing.sm,
  },
  filtersList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  filterChipActive: {
    backgroundColor: Surface.high,
    borderColor: Primary.default,
  },
  filterText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  filterTextActive: {
    color: OnSurface.primary,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.lg,
  },
  recentSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: OnSurface.variant,
  },
  clearText: {
    ...Typography.bodySmall,
    color: Primary.default,
  },
  recentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  recentChipText: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  infoCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  infoCardTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  infoCardText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsList: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultSubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
  },
  resultTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
