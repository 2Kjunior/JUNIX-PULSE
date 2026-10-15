/**
 * Détail d'un événement de l'agenda.
 * Support dynamique des modes sombre et clair.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

import { EventRepository } from '@/repositories/event-repository';
import { EventUseCases } from '@/use-cases/event-use-cases';
import { Event, Person } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { makeEventDetailStyles } from '@/styles/events/event-detail-styles';

type ScreenState = 'loading' | 'content' | 'error';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeEventDetailStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [event, setEvent] = useState<Event | null>(null);
  const [associatedPersons, setAssociatedPersons] = useState<Person[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      setError('ID manquant');
      setScreenState('error');
      return;
    }
    try {
      const [e, persons] = await Promise.all([
        EventRepository.findById(id),
        EventRepository.findEventPersons(id),
      ]);
      if (!e) {
        setError('Événement introuvable');
        setScreenState('error');
        return;
      }
      setEvent(e);
      setAssociatedPersons(persons);
      setScreenState('content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setScreenState('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!event) return;
    Alert.alert(
      'Supprimer cet événement ?',
      'Vous pourrez annuler cette action pendant 30 secondes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await EventUseCases.deleteEvent(event.id);
            showSnackbar('Événement supprimé', {
              actionLabel: 'Annuler (30s)',
              onAction: async () => {
                await EventUseCases.undoDelete(event.id);
                load();
              },
            });
            router.back();
          },
        },
      ]
    );
  }

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error' || !event)
    return <ErrorState message={error} onRetry={load} />;

  const startD = new Date(event.startAt);
  const endD = new Date(event.endAt);
  const durationMins = differenceInMinutes(endD, startD);

  const durationLabel =
    durationMins >= 60
      ? `${Math.floor(durationMins / 60)}h${durationMins % 60 > 0 ? ` ${durationMins % 60}m` : ''}`
      : `${durationMins} min`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={24} color={theme.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          accessibilityLabel="Supprimer"
        >
          <Ionicons name="trash-outline" size={20} color={theme.error.default} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte principale */}
        <GlowCard tone="primary" size="hero">
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View
              style={[
                styles.typeBadge,
                event.type === 'BUSY' ? styles.typeBadgeBusy : styles.typeBadgeFree,
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: event.type === 'BUSY' ? theme.primary.onContainer : theme.tertiary.default },
                ]}
              >
                {event.type === 'BUSY' ? 'Occupé' : 'Libre'}
              </Text>
            </View>
          </View>

          {/* Date & Horaires */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.primary.default} />
            <View>
              <Text style={styles.infoTitle}>
                {format(startD, 'EEEE d MMMM yyyy', { locale: fr })}
              </Text>
              <Text style={styles.infoSub}>
                {format(startD, 'HH:mm', { locale: fr })} ➔ {format(endD, 'HH:mm', { locale: fr })}{' '}
                ({durationLabel})
              </Text>
            </View>
          </View>

          {/* Marge de trajet */}
          {!!event.travelBufferMinutes && event.travelBufferMinutes > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="car-outline" size={20} color={theme.tertiary.default} />
              <Text style={styles.infoTitle}>
                Marge de trajet : {event.travelBufferMinutes} min avant
              </Text>
            </View>
          )}

          {/* Lieu / Adresse */}
          {!!event.location && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    event.location!
                  )}`
                )
              }
            >
              <Ionicons name="location-outline" size={20} color={theme.primary.default} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{event.location}</Text>
                <Text style={styles.linkSub}>Ouvrir dans Maps ↗</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Notes */}
          {!!event.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Notes :</Text>
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          )}
        </View>
        </GlowCard>

        {/* Personnes associées */}
        {associatedPersons.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Personnes associées ({associatedPersons.length})
            </Text>
            {associatedPersons.map(p => {
              const initials = p.displayName
                .split(' ')
                .map(w => w[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();

              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.personRow}
                  onPress={() => router.push({ pathname: '/people/[id]', params: { id: p.id } })}
                >
                  <View style={styles.personAvatar}>
                    <Text style={styles.personAvatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{p.displayName}</Text>
                    {!!p.relationship && (
                      <Text style={styles.personRelation}>{p.relationship}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.onSurface.disabled} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
