/**
 * Onglet Personnes — Vue principale avec filtres Toutes et À recontacter.
 * Permet de suivre ses relations d'un coup d'œil et d'éviter d'oublier des proches.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { PersonRepository } from '@/repositories/person-repository';
import { Person } from '@/domain/entities';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Success,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

type FilterTab = 'all' | 'forgotten';
type ScreenState = 'loading' | 'content' | 'error';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [persons, setPersons] = useState<Person[]>([]);
  const [forgottenCount, setForgottenCount] = useState(0);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [allPersons, forgotten] = await Promise.all([
        PersonRepository.findAll(),
        PersonRepository.findForgotten(),
      ]);

      setForgottenCount(forgotten.length);
      setPersons(activeTab === 'all' ? allPersons : forgotten);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setScreenState('error');
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Personnes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/people/new')}
          accessibilityLabel="Ajouter une personne"
        >
          <Ionicons name="person-add-outline" size={20} color={Primary.on} />
        </TouchableOpacity>
      </View>

      {/* Tabs Toutes / À recontacter */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabLabel, activeTab === 'all' && styles.tabLabelActive]}>
            Toutes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'forgotten' && styles.tabItemActive]}
          onPress={() => setActiveTab('forgotten')}
        >
          <Text style={[styles.tabLabel, activeTab === 'forgotten' && styles.tabLabelActive]}>
            À recontacter ({forgottenCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste principale */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Primary.default} />
        }
        showsVerticalScrollIndicator={false}
      >
        {persons.length === 0 ? (
          <EmptyState
            icon={activeTab === 'all' ? '👥' : '🎉'}
            title={
              activeTab === 'all'
                ? 'Aucun contact enregistré'
                : 'Tous vos proches sont à jour !'
            }
            description={
              activeTab === 'all'
                ? 'Ajoutez des amis, membres de la famille ou collègues pour garder le fil de vos échanges.'
                : 'Aucune personne n’a dépassé le délai de relance conseillé.'
            }
            actionLabel="+ Ajouter une personne"
            onAction={() => router.push('/people/new')}
          />
        ) : (
          persons.map(person => <PersonCard key={person.id} person={person} />)
        )}
      </ScrollView>
    </View>
  );
}

function PersonCard({ person }: { person: Person }) {
  const daysSinceLast = person.lastInteractionAt
    ? differenceInDays(new Date(), new Date(person.lastInteractionAt))
    : null;

  const isForgotten =
    daysSinceLast === null || daysSinceLast >= (person.forgottenThresholdDays || 30);

  const initials = person.displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/people/${person.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.displayName}>{person.displayName}</Text>
          {!!person.relationship && (
            <View style={styles.relationshipBadge}>
              <Text style={styles.relationshipText}>{person.relationship}</Text>
            </View>
          )}
        </View>

        <Text style={styles.lastContactText}>
          {daysSinceLast === null
            ? 'Jamais contacté'
            : daysSinceLast === 0
            ? 'Dernier contact : aujourd’hui'
            : `Dernier contact : il y a ${daysSinceLast}j`}
        </Text>

        {isForgotten && (
          <View style={styles.forgottenBadge}>
            <Ionicons name="alert-circle" size={12} color={ErrorColors.default} />
            <Text style={styles.forgottenText}>Relance conseillée</Text>
          </View>
        )}
      </View>

      {/* Bouton d'action rapide si numéro de téléphone */}
      {!!person.phone && (
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${person.phone}`)}
          accessibilityLabel="Appeler"
        >
          <Ionicons name="call-outline" size={18} color={Primary.default} />
        </TouchableOpacity>
      )}

      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} style={styles.chevron} />
    </TouchableOpacity>
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tabItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
  },
  tabItemActive: { backgroundColor: Primary.container },
  tabLabel: { ...Typography.labelMedium, color: OnSurface.variant },
  tabLabelActive: { color: Primary.onContainer },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Primary.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.titleMedium, color: Primary.onContainer },
  cardContent: { flex: 1, gap: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  displayName: { ...Typography.bodyMedium, color: OnSurface.primary },
  relationshipBadge: {
    backgroundColor: Surface.high,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  relationshipText: { ...Typography.labelSmall, color: OnSurface.variant, fontSize: 10 },
  lastContactText: { ...Typography.labelSmall, color: OnSurface.variant },
  forgottenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  forgottenText: { ...Typography.labelSmall, color: ErrorColors.default, fontSize: 10 },
  callBtn: {
    padding: Spacing.xs,
    backgroundColor: Surface.high,
    borderRadius: Radius.full,
  },
  chevron: { marginLeft: 2 },
});
