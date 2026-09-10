/**
 * Détail d'un événement de l'agenda.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

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
          <Ionicons name="chevron-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          accessibilityLabel="Supprimer"
        >
          <Ionicons name="trash-outline" size={20} color={ErrorColors.default} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte principale */}
        <View style={styles.card}>
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
                  { color: event.type === 'BUSY' ? Primary.onContainer : Tertiary.default },
                ]}
              >
                {event.type === 'BUSY' ? 'Occupé' : 'Libre'}
              </Text>
            </View>
          </View>

          {/* Date & Horaires */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Primary.default} />
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
              <Ionicons name="car-outline" size={20} color={Tertiary.default} />
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
              <Ionicons name="location-outline" size={20} color={Primary.default} />
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
                  onPress={() => router.push(`/people/${p.id}` as any)}
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
                  <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  headerBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.titleMedium, color: OnSurface.primary, flex: 1, textAlign: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  card: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  eventTitle: { ...Typography.headlineMedium, color: OnSurface.primary, flex: 1 },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  typeBadgeBusy: { backgroundColor: Primary.container },
  typeBadgeFree: { backgroundColor: Surface.high },
  typeText: { ...Typography.labelSmall },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Surface.high,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  infoTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  infoSub: { ...Typography.labelSmall, color: OnSurface.variant, marginTop: 2 },
  linkSub: { ...Typography.labelSmall, color: Primary.default, marginTop: 2 },
  notesBox: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  notesTitle: { ...Typography.labelMedium, color: OnSurface.variant, marginBottom: 2 },
  notesText: { ...Typography.bodySmall, color: OnSurface.primary },
  section: { gap: Spacing.md },
  sectionTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Primary.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: { ...Typography.titleMedium, color: Primary.onContainer },
  personName: { ...Typography.bodyMedium, color: OnSurface.primary },
  personRelation: { ...Typography.labelSmall, color: OnSurface.variant },
});
