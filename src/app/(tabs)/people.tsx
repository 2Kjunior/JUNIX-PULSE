/**
 * Onglet Personnes — Référence R-09 du Master Prompt Junix Pulse.
 * Suivi des relations personnelles, filtre « À recontacter ».
 * Actions rapides directes sur la carte (Appeler / Message).
 * Bouton flottant CTA dégradé : + Nouveau contact.
 *
 * Règle A.1 : Zéro emoji dans tout le composant.
 * Règle A.2 : Cartes rayon 16px (Radius.lg), 1 seul dégradé CTA, palette theme.ts.
 */

import { useState, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { PersonRepository } from '@/repositories/person-repository';
import { Person } from '@/domain/entities';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
  Gradient,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

type FilterTab = 'all' | 'forgotten';
type ScreenState = 'loading' | 'content' | 'error';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [persons, setPersons] = useState<Person[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [forgottenCount, setForgottenCount] = useState(0);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [allPersons, forgotten] = await Promise.all([
        PersonRepository.findAll(),
        PersonRepository.findForgotten(),
      ]);

      setTotalCount(allPersons.length);
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
      {/* ─── En-tête R-09 ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Personnes</Text>
          <Text style={styles.subtitle}>Cercle relationnel • Liens</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="options-outline" size={20} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* ─── Segmented Control R-09 ────────────────────────────────────────────── */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={activeTab === 'all' ? Primary.default : OnSurface.variant}
            />
            <Text style={[styles.tabLabel, activeTab === 'all' && styles.tabLabelActive]}>
              Toutes
            </Text>
            <View style={[styles.tabBadge, activeTab === 'all' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'all' && styles.tabBadgeTextActive]}>
                {totalCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'forgotten' && styles.tabItemActive]}
            onPress={() => setActiveTab('forgotten')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={activeTab === 'forgotten' ? '#F59E0B' : OnSurface.variant}
            />
            <Text style={[styles.tabLabel, activeTab === 'forgotten' && styles.tabLabelActive]}>
              À recontacter
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === 'forgotten' && styles.tabBadgeActive,
                forgottenCount > 0 && { borderColor: '#F59E0B' },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === 'forgotten' && { color: '#F59E0B', fontWeight: '700' },
                ]}
              >
                {forgottenCount}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Liste principale ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Primary.default} />
        }
        showsVerticalScrollIndicator={false}
      >
        {persons.length === 0 ? (
          <EmptyState
            iconName="people-outline"
            title={
              activeTab === 'all'
                ? 'Aucun contact enregistré'
                : 'Tous vos proches sont à jour'
            }
            description={
              activeTab === 'all'
                ? 'Ajoutez vos proches pour ne plus jamais perdre le fil de vos relations.'
                : 'Aucune personne n’a dépassé son délai de contact conseillé.'
            }
            actionLabel="+ Ajouter une personne"
            onAction={() => router.push('/people/new')}
          />
        ) : (
          persons.map(person => <PersonCardR09 key={person.id} person={person} />)
        )}
      </ScrollView>

      {/* ─── Bouton Flottant Dégradé (Unique CTA R-09) ─────────────────────────── */}
      <View style={[styles.floatingCtaContainer, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          onPress={() => router.push('/people/new')}
          activeOpacity={0.85}
          accessibilityLabel="Ajouter un contact"
        >
          <LinearGradient
            colors={Gradient.primary as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingCta}
          >
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.floatingCtaText}>Nouveau contact</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Composants locaux ─────────────────────────────────────────────────────────

function PersonCardR09({ person }: { person: Person }) {
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

  const handleCall = (e: any) => {
    e.stopPropagation();
    if (person.phone) Linking.openURL(`tel:${person.phone}`);
  };

  const handleMessage = (e: any) => {
    e.stopPropagation();
    if (person.phone) Linking.openURL(`sms:${person.phone}`);
  };

  return (
    <TouchableOpacity
      style={[styles.card, isForgotten && styles.cardForgotten]}
      onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.id } })}
      activeOpacity={0.8}
    >
      {/* Avatar / Initiales */}
      <View style={[styles.avatar, isForgotten && styles.avatarForgotten]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Contenu textuel */}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.displayName} numberOfLines={1}>{person.displayName}</Text>
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
            ? 'Contact : aujourd’hui'
            : `Contact : il y a ${daysSinceLast}j`}
        </Text>

        {isForgotten && (
          <View style={styles.forgottenBadge}>
            <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
            <Text style={styles.forgottenText}>Relance conseillée</Text>
          </View>
        )}
      </View>

      {/* Actions rapides inline (Appeler & Message - R-09) */}
      <View style={styles.actionsCol}>
        {person.phone ? (
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleCall}
              accessibilityLabel="Appeler"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="call-outline" size={16} color={Primary.default} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleMessage}
              accessibilityLabel="Envoyer un message"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Tertiary.default} />
            </TouchableOpacity>
          </View>
        ) : null}

        <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
      </View>
    </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.headlineLarge,
    color: OnSurface.primary,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Surface.container,
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: Surface.high,
  },
  tabLabel: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  tabLabelActive: {
    color: OnSurface.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  tabBadgeActive: {
    borderColor: Primary.default,
  },
  tabBadgeText: {
    ...Typography.labelSmall,
    fontSize: 10,
    color: OnSurface.variant,
  },
  tabBadgeTextActive: {
    color: Primary.default,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  cardForgotten: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  avatarForgotten: {
    borderColor: '#F59E0B' + '50',
  },
  avatarText: {
    ...Typography.titleMedium,
    color: Primary.default,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  displayName: {
    ...Typography.bodyLarge,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  relationshipBadge: {
    backgroundColor: Surface.base,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  relationshipText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
  },
  lastContactText: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
  },
  forgottenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  forgottenText: {
    ...Typography.labelSmall,
    color: '#F59E0B',
    fontWeight: '600',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  floatingCtaContainer: {
    position: 'absolute',
    right: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: 6,
  },
  floatingCtaText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
