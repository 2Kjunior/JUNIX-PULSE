/**
 * Onglet Personnes — Liste des contacts Junix Pulse.
 * Étape 12 construira le détail, les interactions et l'import.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '@/database/sqlite';
import { Person } from '@/domain/entities';
import {
  Surface, Primary, OnSurface, Outline, Spacing, Radius, Typography,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>('loading');
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM persons WHERE deleted_at IS NULL ORDER BY display_name ASC`
      );
      setPeople(rows.map(r => ({
        id: r.id as string,
        displayName: r.display_name as string,
        relationship: (r.relationship as string | null) ?? undefined,
        phone: (r.phone as string | null) ?? undefined,
        email: (r.email as string | null) ?? undefined,
        birthDate: (r.birth_date as string | null) ?? undefined,
        notes: (r.notes as string | null) ?? undefined,
        lastInteractionAt: (r.last_interaction_at as string | null) ?? undefined,
        forgottenThresholdDays: (r.forgotten_threshold_days as number) ?? 30,
        importedFromContacts: (r.imported_from_contacts as number) === 1,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      })));
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setState('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? people.filter(p =>
        p.displayName.toLowerCase().includes(search.toLowerCase()) ||
        p.relationship?.toLowerCase().includes(search.toLowerCase())
      )
    : people;

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Personnes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/people/new')}
          accessibilityLabel="Ajouter une personne"
        >
          <Ionicons name="add" size={22} color={Primary.on} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={OnSurface.disabled} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher..."
          placeholderTextColor={OnSurface.disabled}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={OnSurface.disabled} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Primary.default} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title={search ? 'Aucun résultat' : 'Aucune personne'}
            description={search ? 'Essayez un autre terme.' : "Ajoutez des personnes pour relier vos rappels et tâches à des contacts."}
            actionLabel={search ? undefined : '+ Ajouter une personne'}
            onAction={search ? undefined : () => router.push('/people/new')}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.personRow}
            onPress={() => router.push(`/people/${item.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.personBody}>
              <Text style={styles.personName}>{item.displayName}</Text>
              {item.relationship && (
                <Text style={styles.personRelation}>{item.relationship}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
          </TouchableOpacity>
        )}
      />
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
    paddingVertical: Spacing.lg,
  },
  title: { ...Typography.headlineLarge, color: OnSurface.primary },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, flexGrow: 1 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Primary.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.titleMedium, color: Primary.onContainer },
  personBody: { flex: 1 },
  personName: { ...Typography.bodyMedium, color: OnSurface.primary },
  personRelation: { ...Typography.labelSmall, color: OnSurface.variant, marginTop: 2 },
});
