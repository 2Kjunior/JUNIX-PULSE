/**
 * Détail d'une personne et journal d'interactions (Timeline) — R-10.
 * Design Junix Pulse, zéro emoji, contrastes vérifiés sombre et clair.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';

import { PersonRepository } from '@/repositories/person-repository';
import { PersonUseCases } from '@/use-cases/person-use-cases';
import { Person, Interaction, InteractionType } from '@/domain/entities';
import { EventRepository } from '@/repositories/event-repository';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { createReminder } from '@/use-cases/reminder-use-cases';
import { followUpDate, FOLLOW_UP_DAYS, personAgenda, PersonAgendaItem } from '@/domain/rules/person-link-rules';
import { PersonAgenda } from '@/components/people/PersonAgenda';
import { INTERACTION_TYPES, LogInteractionSheet } from '@/components/people/LogInteractionSheet';
import { GlassAlert } from '@/components/feedback/GlassAlert';
import { useAppStore } from '@/store/app-store';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { PersonTimeCard } from '@/components/people/PersonTimeCard';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { makePersonDetailStyles } from '@/styles/people/person-detail-styles';
import { useDateLocale, useT } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';

function formatWhatsAppUrl(rawPhone?: string): string {
  if (!rawPhone) return '';
  let clean = rawPhone.trim().replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  } else if (clean.startsWith('00')) {
    clean = clean.substring(2);
  } else if (clean.startsWith('0') && clean.length === 10) {
    // Numéro national 10 chiffres (Côte d'Ivoire / Afrique de l'Ouest)
    clean = '225' + clean;
  }
  return `https://wa.me/${clean}`;
}

export default function PersonDetailScreen() {
  const t = useT();
  const dateLocale = useDateLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar, userTimezone } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makePersonDetailStyles);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [person, setPerson] = useState<Person | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [agenda, setAgenda] = useState<PersonAgendaItem[]>([]);
  const [error, setError] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError(t('person.missingId'));
      setScreenState('error');
      return;
    }
    try {
      const [p, inters, reminders, tasks, events] = await Promise.all([
        PersonRepository.findById(id),
        PersonRepository.findInteractions(id),
        ReminderRepository.findByPerson(id),
        TaskRepository.findByPerson(id),
        EventRepository.findByPerson(id),
      ]);
      if (!p) {
        setError(t('person.notFound'));
        setScreenState('error');
        return;
      }
      setPerson(p);
      setInteractions(inters);
      setAgenda(personAgenda(reminders, tasks, events, new Date()));
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setScreenState('error');
    }
  }, [id, t]);

  // Read again on each return: a reminder or a task may just have been planned with this person
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // ─── Enregistrer une interaction ───────────────────────────────────────────

  async function handleLogInteraction(type: InteractionType, notes: string) {
    if (!id || !person) return;
    try {
      await PersonUseCases.logInteraction({ personId: id, type, notes: notes || undefined });
      showSnackbar(t('person.interactionSaved'));
      await load();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('common.error'));
    }
  }

  // ─── Relancer : un rappel pour recontacter la personne ─────────────────────

  function handleFollowUp() {
    if (!person) return;
    const plan = (days: number) => async () => {
      try {
        await createReminder({
          title: t('personAgenda.followUpTitle', { name: person.displayName }),
          scheduledAt: followUpDate(days, new Date()),
          timezone: userTimezone,
          actionType: 'CALL',
          personId: person.id,
        });
        showSnackbar(t('personAgenda.followUpDone', { name: firstName }));
        await load();
      } catch (e) {
        showSnackbar(e instanceof Error ? e.message : t('common.error'));
      }
    };
    GlassAlert.alert(t('personAgenda.followUpAsk', { name: firstName }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      ...FOLLOW_UP_DAYS.map(days => ({ text: t(`personAgenda.in${days}` as 'personAgenda.in1'), onPress: plan(days) })),
    ]);
  }

  // ─── Supprimer une interaction ─────────────────────────────────────────────

  async function handleDeleteInteraction(interactionId: string) {
    await PersonUseCases.deleteInteraction(interactionId);
    showSnackbar(t('person.interactionDeleted'));
    await load();
  }

  // ─── Supprimer la personne ──────────────────────────────────────────────────

  async function handleDeletePerson() {
    if (!person) return;
    await PersonUseCases.deletePerson(person.id);
    showSnackbar(t('person.deleted'), {
      actionLabel: t('common.undo30'),
      onAction: async () => {
        await PersonUseCases.undoDelete(person.id);
        load();
      },
      durationMs: 30000,
    });
    router.back();
  }

  if (screenState === 'loading') return <LoadingState />;
  if (screenState === 'error' || !person)
    return <ErrorState message={error} onRetry={load} />;

  // Calcul du délai depuis le dernier contact
  const daysSinceLast = person.lastInteractionAt
    ? differenceInDays(new Date(), new Date(person.lastInteractionAt))
    : null;

  const isForgotten =
    daysSinceLast === null || daysSinceLast >= (person.forgottenThresholdDays || 30);

  const firstName = person.displayName.trim().split(/\s+/)[0] ?? person.displayName;

  const initials = person.displayName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}>
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
          {person.displayName}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDeletePerson}
          accessibilityRole="button"
          accessibilityLabel={t('person.deleteA11y')}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error.default} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Carte de Profil */}
        <GlowCard
          tone={isForgotten ? 'attention' : 'neutral'}
          size="hero"
          accessibilityLabel={`${person.displayName}${isForgotten ? t('person.followUpA11y') : ''}`}
        >
        <View style={styles.profileCardInner}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, isForgotten && styles.avatarForgotten]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{person.displayName}</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {!!person.relationship && (
                  <View style={styles.relationshipBadge}>
                    <Text style={styles.relationshipText}>{person.relationship}</Text>
                  </View>
                )}
                {person.importedFromContacts && (
                  <View style={styles.importedBadge}>
                    <Ionicons name="book-outline" size={11} color={theme.tertiary.default} />
                    <Text style={styles.importedText}>{t('person.fromContacts')}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Statut de relance */}
          <View
            style={[
              styles.statusBanner,
              isForgotten ? styles.statusBannerAlert : styles.statusBannerOk,
            ]}
          >
            <Ionicons
              name={isForgotten ? 'time-outline' : 'checkmark-circle-outline'}
              size={18}
              color={isForgotten ? theme.priority.HIGH : theme.success.default}
            />
            <Text
              style={[
                styles.statusBannerText,
                { color: isForgotten ? theme.priority.HIGH : theme.success.default },
              ]}
            >
              {daysSinceLast === null
                ? t('person.noContactYet')
                : isForgotten
                ? t('person.lastContactDue', { days: daysSinceLast })
                : t('person.lastContactOk', { days: daysSinceLast })}
            </Text>
          </View>

          {/* Boutons d'action directes */}
          {(!!person.phone || !!person.email) && (
            <View style={styles.actionRow}>
              {!!person.phone && (
                <>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => Linking.openURL(`tel:${person.phone}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={18} color={theme.primary.default} />
                    <Text style={styles.quickActionText}>{t('person.call')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => Linking.openURL(`sms:${person.phone}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={theme.primary.default} />
                    <Text style={styles.quickActionText}>SMS</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => Linking.openURL(formatWhatsAppUrl(person.phone))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    <Text style={styles.quickActionText}>WhatsApp</Text>
                  </TouchableOpacity>
                </>
              )}

              {!!person.email && (
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => Linking.openURL(`mailto:${person.email}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={18} color={theme.primary.default} />
                  <Text style={styles.quickActionText}>Email</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Détails supplémentaires (Anniversaire, Notes) */}
          {!!person.birthDate && (
            <View style={styles.detailRow}>
              <Ionicons name="gift-outline" size={16} color={theme.tertiary.default} />
              <Text style={styles.detailText}>
                {t('person.birthday')}{' '}
                {format(new Date(person.birthDate + 'T12:00:00'), 'd MMMM', { locale: dateLocale })}
              </Text>
            </View>
          )}

          {!!person.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>{t('person.notes')}</Text>
              <Text style={styles.notesText}>{person.notes}</Text>
            </View>
          )}
        </View>
        </GlowCard>

        {/* Heure chez la personne et meilleur moment pour l'appeler */}
        <View style={styles.section}>
          <PersonTimeCard
            person={person}
            userTimezone={userTimezone}
            onSaved={load}
            onError={showSnackbar}
          />
        </View>

        {/* Avec cette personne : ce qui est prévu, et de quoi prévoir plus */}
        <View style={styles.section}>
          <PersonAgenda personId={person.id} firstName={firstName} items={agenda} onFollowUp={handleFollowUp} />
        </View>

        {/* Section : Historique / Timeline */}
        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>{t('person.history', { count: interactions.length })}</Text>
            {/* Le formulaire occupait toute une section : un bouton l'ouvre maintenant */}
            <TouchableOpacity
              style={styles.historyAction}
              onPress={() => setLogOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('person.logTitle')}
              testID="person-log-open"
            >
              <Ionicons name="add" size={16} color={theme.primary.default} />
              <Text style={styles.historyActionText}>{t('person.logShort')}</Text>
            </TouchableOpacity>
          </View>

          {interactions.length === 0 ? (
            <GlowCard tone="neutral">
              <View style={styles.emptyBoxInner}>
                <Ionicons name="chatbubbles-outline" size={32} color={theme.onSurface.disabled} />
                <Text style={styles.emptyTitle}>{t('person.noInteraction')}</Text>
                <Text style={styles.emptyText}>{t('person.noInteractionHint')}</Text>
              </View>
            </GlowCard>
          ) : (
            interactions.map(item => {
              const typeConfig =
                INTERACTION_TYPES.find(t => t.type === item.type) ?? INTERACTION_TYPES[0];

              return (
                <GlowCard key={item.id} tone="neutral">
                <View style={styles.timelineRow}>
                  <View style={styles.timelineIcon}>
                    <Ionicons name={typeConfig.icon} size={18} color={theme.primary.default} />
                  </View>
                  <View style={styles.timelineBody}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineType}>{t(typeConfig.labelKey)}</Text>
                      <Text style={styles.timelineDate}>
                        {format(new Date(item.occurredAt), t('person.timelineDate'), { locale: dateLocale })}
                      </Text>
                    </View>
                    {!!item.notes && <Text style={styles.timelineNotes}>{item.notes}</Text>}
                    {/* Les échanges comptés tout seuls disent d'où ils viennent */}
                    {!item.notes && (item.reminderId || item.eventId) && (
                      <Text style={styles.timelineNotes}>
                        {t(item.eventId ? 'person.fromEvent' : 'person.fromReminder')}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteInteraction(item.id)}
                    style={styles.timelineDelete}
                    accessibilityRole="button"
                    accessibilityLabel={t('person.deleteInteractionA11y', {
                      type: t(typeConfig.labelKey),
                      date: format(new Date(item.occurredAt), 'd MMMM yyyy', { locale: dateLocale }),
                    })}
                  >
                    <Ionicons name="close" size={16} color={theme.onSurface.disabled} />
                  </TouchableOpacity>
                </View>
                </GlowCard>
              );
            })
          )}
        </View>
      </ScrollView>
      <LogInteractionSheet visible={logOpen} onClose={() => setLogOpen(false)} onSave={handleLogInteraction} />
    </KeyboardAvoidingView>
  );
}
