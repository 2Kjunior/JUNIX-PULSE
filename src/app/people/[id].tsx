/**
 * Détail d'une personne et journal d'interactions (Timeline) — R-10.
 * Design Midnight, dégradé unique sur le bouton d'action principal, zéro emoji.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { PersonRepository } from '@/repositories/person-repository';
import { PersonUseCases } from '@/use-cases/person-use-cases';
import { Person, Interaction, InteractionType } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
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
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

interface InteractionTypeConfig {
  type: InteractionType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const INTERACTION_TYPES: InteractionTypeConfig[] = [
  { type: 'CALL', label: 'Appel', icon: 'call-outline' },
  { type: 'SMS', label: 'SMS', icon: 'chatbubble-outline' },
  { type: 'WHATSAPP', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { type: 'IN_PERSON', label: 'Rencontre', icon: 'people-outline' },
  { type: 'EMAIL', label: 'Email', icon: 'mail-outline' },
  { type: 'OTHER', label: 'Autre', icon: 'document-text-outline' },
];

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

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
      setError('ID manquant');
      setScreenState('error');
      return;
    }
    try {
      const [p, inters] = await Promise.all([
        PersonRepository.findById(id),
        PersonRepository.findInteractions(id),
      ]);
      if (!p) {
        setError('Personne introuvable');
        setScreenState('error');
        return;
      }
      setPerson(p);
      setInteractions(inters);
      setScreenState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setScreenState('error');
    }
  }, [id]);

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
      showSnackbar('Interaction enregistrée');
      await load();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLogging(false);
    }
  }

  // ─── Supprimer une interaction ─────────────────────────────────────────────

  async function handleDeleteInteraction(interactionId: string) {
    await PersonUseCases.deleteInteraction(interactionId);
    showSnackbar('Interaction supprimée');
    await load();
  }

  // ─── Supprimer la personne ──────────────────────────────────────────────────

  async function handleDeletePerson() {
    if (!person) return;
    Alert.alert(
      'Supprimer ce contact ?',
      'Cette personne et son historique seront masqués.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await PersonUseCases.deletePerson(person.id);
            showSnackbar('Contact supprimé', {
              actionLabel: 'Annuler (30s)',
              onAction: async () => {
                await PersonUseCases.undoDelete(person.id);
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
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          {person.displayName}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleDeletePerson}
          accessibilityLabel="Supprimer"
        >
          <Ionicons name="trash-outline" size={20} color={ErrorColors.default} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Carte de Profil */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, isForgotten && styles.avatarForgotten]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{person.displayName}</Text>
              {!!person.relationship && (
                <View style={styles.relationshipBadge}>
                  <Text style={styles.relationshipText}>{person.relationship}</Text>
                </View>
              )}
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
              color={isForgotten ? '#F59E0B' : Success.default}
            />
            <Text
              style={[
                styles.statusBannerText,
                { color: isForgotten ? '#F59E0B' : Success.default },
              ]}
            >
              {daysSinceLast === null
                ? 'Aucun contact enregistré (Relance conseillée)'
                : isForgotten
                ? `Dernier contact il y a ${daysSinceLast} jours (Relance conseillée)`
                : `Dernier contact il y a ${daysSinceLast} jours (À jour)`}
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
                    <Ionicons name="call-outline" size={18} color={Primary.default} />
                    <Text style={styles.quickActionText}>Appeler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => Linking.openURL(`sms:${person.phone}`)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={Primary.default} />
                    <Text style={styles.quickActionText}>SMS</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => Linking.openURL(`https://wa.me/${person.phone?.replace(/[^0-9]/g, '')}`)}
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
                  <Ionicons name="mail-outline" size={18} color={Primary.default} />
                  <Text style={styles.quickActionText}>Email</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Détails supplémentaires (Anniversaire, Notes) */}
          {!!person.birthDate && (
            <View style={styles.detailRow}>
              <Ionicons name="gift-outline" size={16} color={Tertiary.default} />
              <Text style={styles.detailText}>
                Anniversaire :{' '}
                {format(new Date(person.birthDate + 'T12:00:00'), 'd MMMM', { locale: fr })}
              </Text>
            </View>
          )}

          {!!person.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Notes :</Text>
              <Text style={styles.notesText}>{person.notes}</Text>
            </View>
          )}
        </View>

        {/* Section : Enregistrer une nouvelle interaction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enregistrer une interaction</Text>
          <View style={styles.logCard}>
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
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={isSelected ? Primary.onContainer : OnSurface.variant}
                      />
                      <Text
                        style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}
                      >
                        {item.label}
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
              placeholder="Notes sur l'échange (ex: nouvelles prises, café ensemble...)"
              placeholderTextColor={OnSurface.disabled}
              multiline
              numberOfLines={2}
            />

            {/* Bouton avec dégradé unique */}
            <Button
              label="Enregistrer l'interaction"
              onPress={handleLogInteraction}
              variant="primary"
              size="md"
              loading={logging}
            />
          </View>
        </View>

        {/* Section : Historique / Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Historique ({interactions.length})
          </Text>

          {interactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={32} color={OnSurface.disabled} />
              <Text style={styles.emptyTitle}>Aucune interaction</Text>
              <Text style={styles.emptyText}>
                Enregistrez vos échanges pour maintenir le lien dans la durée.
              </Text>
            </View>
          ) : (
            interactions.map(item => {
              const typeConfig =
                INTERACTION_TYPES.find(t => t.type === item.type) ?? INTERACTION_TYPES[0];

              return (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineIcon}>
                    <Ionicons name={typeConfig.icon} size={18} color={Primary.default} />
                  </View>
                  <View style={styles.timelineBody}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineType}>{typeConfig.label}</Text>
                      <Text style={styles.timelineDate}>
                        {format(new Date(item.occurredAt), 'd MMM yyyy à HH:mm', { locale: fr })}
                      </Text>
                    </View>
                    {!!item.notes && <Text style={styles.timelineNotes}>{item.notes}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteInteraction(item.id)}
                    style={styles.timelineDelete}
                    accessibilityLabel="Supprimer interaction"
                  >
                    <Ionicons name="close" size={16} color={OnSurface.disabled} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  profileCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Outline.variant,
  },
  avatarForgotten: {
    borderColor: '#F59E0B',
  },
  avatarText: {
    ...Typography.headlineMedium,
    color: Primary.default,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  relationshipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Surface.high,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  relationshipText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 11,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  statusBannerOk: {
    backgroundColor: 'rgba(109, 213, 140, 0.08)',
    borderColor: 'rgba(109, 213, 140, 0.2)',
  },
  statusBannerAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusBannerText: {
    ...Typography.labelMedium,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Surface.high,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 6,
  },
  quickActionText: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  notesBox: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  notesTitle: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
    marginBottom: 2,
  },
  notesText: {
    ...Typography.bodySmall,
    color: OnSurface.primary,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  logCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  typeScroll: {
    flexGrow: 0,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: Primary.container,
    borderColor: Primary.default,
  },
  typeChipText: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
  },
  typeChipTextActive: {
    color: Primary.onContainer,
    fontWeight: '600',
  },
  logInput: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: OnSurface.primary,
    ...Typography.bodySmall,
    minHeight: 64,
  },
  emptyBox: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    marginTop: Spacing.xs,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Surface.high,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineType: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  timelineDate: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 10,
  },
  timelineNotes: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  timelineDelete: {
    padding: 4,
  },
});
