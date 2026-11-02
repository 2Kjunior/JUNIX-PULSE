/**
 * Détail d'une personne et journal d'interactions (Timeline) — R-10.
 * Design Junix Pulse, zéro emoji, contrastes vérifiés sombre et clair.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';

import { PersonRepository } from '@/repositories/person-repository';
import { PersonUseCases } from '@/use-cases/person-use-cases';
import { Person, Interaction, InteractionType } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { PersonTimeCard } from '@/components/people/PersonTimeCard';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { GlowCard } from '@/components/ui/GlowCard';
import { makePersonDetailStyles } from '@/styles/people/person-detail-styles';
import { MessageKey, useDateLocale, useT } from '@/i18n';

type ScreenState = 'loading' | 'content' | 'error';

interface InteractionTypeConfig {
  type: InteractionType;
  labelKey: MessageKey;
  icon: keyof typeof Ionicons.glyphMap;
}

const INTERACTION_TYPES: InteractionTypeConfig[] = [
  { type: 'CALL', labelKey: 'interaction.CALL', icon: 'call-outline' },
  { type: 'SMS', labelKey: 'interaction.SMS', icon: 'chatbubble-outline' },
  { type: 'WHATSAPP', labelKey: 'interaction.WHATSAPP', icon: 'logo-whatsapp' },
  { type: 'IN_PERSON', labelKey: 'interaction.IN_PERSON', icon: 'people-outline' },
  { type: 'EMAIL', labelKey: 'interaction.EMAIL', icon: 'mail-outline' },
  { type: 'OTHER', labelKey: 'interaction.OTHER', icon: 'document-text-outline' },
];

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
  const [error, setError] = useState('');

  // Nouvelle interaction inline
  const [selectedType, setSelectedType] = useState<InteractionType>('CALL');
  const [logNotes, setLogNotes] = useState('');
  const [logging, setLogging] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError(t('person.missingId'));
      setScreenState('error');
      return;
    }
    try {
      const [p, inters] = await Promise.all([
        PersonRepository.findById(id),
        PersonRepository.findInteractions(id),
      ]);
      if (!p) {
        setError(t('person.notFound'));
        setScreenState('error');
        return;
      }
      setPerson(p);
      setInteractions(inters);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadError'));
      setScreenState('error');
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Enregistrer une interaction ───────────────────────────────────────────

  async function handleLogInteraction() {
    if (!id || !person) return;
    setLogging(true);
    try {
      await PersonUseCases.logInteraction({
        personId: id,
        type: selectedType,
        notes: logNotes.trim() || undefined,
      });

      setLogNotes('');
      showSnackbar(t('person.interactionSaved'));
      await load();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLogging(false);
    }
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

        {/* Section : Enregistrer une nouvelle interaction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('person.logTitle')}</Text>
          <GlowCard tone="neutral">
          <View style={styles.logCardInner}>
            {/* Choix du type */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              <View style={styles.typeRow}>
                {INTERACTION_TYPES.map(item => {
                  const isSelected = selectedType === item.type;
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={[styles.typeChip, isSelected && styles.typeChipActive]}
                      onPress={() => setSelectedType(item.type)}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${t(item.labelKey)}${isSelected ? ', ' + t('common.selected') : ''}`}
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={isSelected ? theme.primary.onContainer : theme.onSurface.variant}
                      />
                      <Text
                        style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}
                      >
                        {t(item.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Note sur l'interaction */}
            <TextInput
              style={styles.logInput}
              value={logNotes}
              onChangeText={setLogNotes}
              placeholder={t('person.logNotesPlaceholder')}
              placeholderTextColor={theme.onSurface.disabled}
              multiline
              numberOfLines={2}
            />

            {/* Bouton avec dégradé unique */}
            <Button
              label={t('person.logButton')}
              onPress={handleLogInteraction}
              variant="primary"
              size="md"
              loading={logging}
            />
          </View>
          </GlowCard>
        </View>

        {/* Section : Historique / Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('person.history', { count: interactions.length })}</Text>

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
    </KeyboardAvoidingView>
  );
}
