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
  Linking,
} from 'react-native';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInMinutes } from 'date-fns';

import { EventRepository } from '@/repositories/event-repository';
import { EventUseCases } from '@/use-cases/event-use-cases';
import { Event, Person } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { PersonPicker } from '@/components/people/PersonPicker';
import { TagField } from '@/components/tags/TagField';
import { TagRepository } from '@/repositories/tag-repository';
import { PersonRepository } from '@/repositories/person-repository';
import { makeEventDetailStyles } from '@/styles/events/event-detail-styles';
import { useDateLocale, useT } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';

export default function EventDetailScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeEventDetailStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [event, setEvent] = useState<Event | null>(null);
  const [associatedPersons, setAssociatedPersons] = useState<Person[]>([]);
  // Events have no edit screen: their people change here, saved at once
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [pickingPersons, setPickingPersons] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      setError(t('person.missingId'));
      setScreenState('error');
      return;
    }
    try {
      const [e, persons, tags] = await Promise.all([
        EventRepository.findById(id),
        EventRepository.findEventPersons(id),
        TagRepository.findIdsFor('event', id),
      ]);
      if (!e) {
        setError(t('eventDetail.notFound'));
        setScreenState('error');
        return;
      }
      setEvent(e);
      setAssociatedPersons(persons);
      setTagIds(tags);
      setScreenState('content');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadError'));
      setScreenState('error');
    }
  }, [id, t]);

  const openPersonPicker = async () => {
    setAllPersons(await PersonRepository.findAll().catch(() => []));
    setPickingPersons(true);
  };

  const changePersons = async (ids: string[]) => {
    if (!event) return;
    setAssociatedPersons(ids.map(personId => allPersons.find(person => person.id === personId)).filter((person): person is Person => !!person));
    try {
      await EventUseCases.updateEvent({ id: event.id, personIds: ids });
    } catch {
      showSnackbar(t('common.genericError'));
      void load();
    }
  };

  const changeTags = async (ids: string[]) => {
    if (!event) return;
    setTagIds(ids);
    try {
      await EventUseCases.updateEvent({ id: event.id, tagIds: ids });
    } catch {
      showSnackbar(t('common.genericError'));
      void load();
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!event) return;
    GlassAlert.alert(
      t('eventDetail.deleteTitle'),
      t('eventDetail.deleteBody'),
      [
        { text: t('form.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await EventUseCases.deleteEvent(event.id);
            showSnackbar(t('eventDetail.deleted'), {
              actionLabel: t('common.undo30'),
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
      ? durationMins % 60 > 0
        ? t('eventDetail.hoursMinutes', { hours: Math.floor(durationMins / 60), minutes: durationMins % 60 })
        : t('eventDetail.hours', { hours: Math.floor(durationMins / 60) })
      : t('tasks.minutes', { minutes: durationMins });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={24} color={theme.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={t('eventDetail.deleteA11y')}
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
                {event.type === 'BUSY' ? t('calendar.busy') : t('calendar.free')}
              </Text>
            </View>
          </View>

          {/* Date & Horaires */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.primary.default} />
            <View>
              <Text style={styles.infoTitle}>
                {format(startD, 'EEEE d MMMM yyyy', { locale: dateLocale })}
              </Text>
              <Text style={styles.infoSub}>
                {format(startD, 'HH:mm', { locale: dateLocale })} ➔ {format(endD, 'HH:mm', { locale: dateLocale })}{' '}
                ({durationLabel})
              </Text>
            </View>
          </View>

          {/* Marge de trajet */}
          {!!event.travelBufferMinutes && event.travelBufferMinutes > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="car-outline" size={20} color={theme.tertiary.default} />
              <Text style={styles.infoTitle}>
                {t('eventDetail.travel', { minutes: event.travelBufferMinutes })}
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
              accessibilityRole="button"
              accessibilityLabel={t('eventDetail.openMapsA11y', { place: event.location })}
            >
              <Ionicons name="location-outline" size={20} color={theme.primary.default} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{event.location}</Text>
                <Text style={styles.linkSub}>{t('eventDetail.openMaps')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Notes */}
          {!!event.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>{t('eventDetail.notes')}</Text>
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          )}
        </View>
        </GlowCard>

        {/* Personnes associées, modifiables ici */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {associatedPersons.length > 0
                ? t('eventDetail.people', { count: associatedPersons.length })
                : t('personField.header')}
            </Text>
            <TouchableOpacity
              onPress={openPersonPicker}
              style={styles.sectionAction}
              accessibilityRole="button"
              accessibilityLabel={t('eventDetail.editPeople')}
              testID="event-edit-people"
            >
              <Ionicons name={associatedPersons.length > 0 ? 'create-outline' : 'add'} size={16} color={theme.primary.default} />
              <Text style={styles.sectionActionText}>
                {t(associatedPersons.length > 0 ? 'eventDetail.editPeopleShort' : 'personField.add')}
              </Text>
            </TouchableOpacity>
          </View>
          {associatedPersons.length > 0 && (
          <>
            {associatedPersons.map(p => {
              const initials = p.displayName
                .split(' ')
                .map(w => w[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.personRow}
                  onPress={() => router.push({ pathname: '/people/[id]', params: { id: p.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('eventDetail.viewContactA11y', { name: p.displayName })}${p.relationship ? t('eventDetail.relationA11y', { relation: p.relationship }) : ''}`}
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
          </>
          )}
        </View>

        {/* Étiquettes, modifiables ici */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tagField.header')}</Text>
          </View>
          <TagField selectedIds={tagIds} onChange={changeTags} look="bare" />
        </View>
      </ScrollView>
      <PersonPicker
        visible={pickingPersons}
        persons={allPersons}
        selectedIds={associatedPersons.map(person => person.id)}
        multiple
        onChange={changePersons}
        onClose={() => setPickingPersons(false)}
      />
    </View>
  );
}
