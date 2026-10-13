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
  TouchableOpacity,
  RefreshControl,
  Linking,
  GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { PersonRepository } from '@/repositories/person-repository';
import { Person } from '@/domain/entities';
import { daysSinceLastInteraction, isPersonForgotten } from '@/domain/rules/person-rules';
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
  TAB_BAR_TOTAL_HEIGHT,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { GlowCard } from '@/components/ui/GlowCard';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { styles } from '@/styles/tabs/people-styles';

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
      <PillTopBar
        tabs={[
          { key: 'all', label: 'Toutes', count: totalCount, icon: 'people-outline' },
          { key: 'forgotten', label: 'À recontacter', count: forgottenCount, icon: 'time-outline' },
        ]}
        activeTab={activeTab}
        onTabChange={(k) => setActiveTab(k as FilterTab)}
      />

      {/* ─── Liste principale ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_TOTAL_HEIGHT + 104 }]}
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

      {/* ─── Bouton Flottant 3D (Unique CTA R-09) ─────────────────────────── */}
      <GlassFloatingActionButton
        label="Nouveau contact"
        icon="person-add"
        onPress={() => router.push('/people/new')}
      />
    </View>
  );
}

// ─── Composants locaux ─────────────────────────────────────────────────────────

function PersonCardR09({ person }: { person: Person }) {
  const daysSinceLast = daysSinceLastInteraction(person.lastInteractionAt);
  const isForgotten = isPersonForgotten(person);

  const initials = person.displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleCall = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (person.phone) Linking.openURL(`tel:${person.phone}`);
  };

  const handleMessage = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (person.phone) Linking.openURL(`sms:${person.phone}`);
  };

  return (
    <GlowCard
      tone={isForgotten ? 'attention' : 'neutral'}
      intensity="soft"
      onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.id } })}
      accessibilityLabel={`${person.displayName}${isForgotten ? ', relance conseillée' : ''}`}
    >
      <View style={styles.cardRow}>
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
      </View>
    </GlowCard>
  );
}
