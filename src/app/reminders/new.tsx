/**
 * Formulaire de création d'un rappel — Référence R-05 du Master Prompt Junix Pulse.
 * Présenté comme une modale (presentation: 'modal' dans _layout.tsx).
 *
 * Champs : titre, date/heure, priorité, action vectorielle, note, récurrence.
 * Règle A.1 : Zéro emoji (icônes vectorielles exclusives).
 * Règle A.2 : 1 seul bouton dégradé par écran (CTA Créer le rappel).
 *
 * Migration P5 : Entièrement thématisé avec contrastes parfaits en mode clair/sombre.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

import { createReminder } from '@/use-cases/reminder-use-cases';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';
import { Reminder } from '@/domain/entities';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { makeNewReminderStyles } from '@/styles/reminders/new-reminder-styles';

type PriorityKey = Reminder['priority'];
type ActionType = Reminder['actionType'];

const PRIORITY_OPTIONS: { key: PriorityKey; label: string }[] = [
  { key: 'LOW', label: 'Faible' },
  { key: 'NORMAL', label: 'Normal' },
  { key: 'HIGH', label: 'Haute' },
  { key: 'URGENT', label: 'Urgent' },
];

const ACTION_OPTIONS: { key: ActionType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'NONE', label: 'Aucune', icon: 'remove-outline' },
  { key: 'CALL', label: 'Appeler', icon: 'call-outline' },
  { key: 'MESSAGE', label: 'Message', icon: 'chatbubble-outline' },
  { key: 'EMAIL', label: 'Email', icon: 'mail-outline' },
  { key: 'MEET', label: 'Rencontrer', icon: 'people-outline' },
  { key: 'TASK', label: 'Faire', icon: 'checkmark-outline' },
];

export default function NewReminderScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNewReminderStyles);

  const { defaultHour, defaultDate } = useLocalSearchParams<{
    defaultHour?: string;
    defaultDate?: string;
  }>();

  // Champs du formulaire
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(() => {
    let d = new Date();
    if (defaultDate) {
      try {
        const parsed = new Date(defaultDate);
        if (!isNaN(parsed.getTime())) d = parsed;
      } catch {}
    }
    const h = defaultHour !== undefined ? Number(defaultHour) : d.getHours() + 1;
    d = setHours(d, h);
    d = setMinutes(d, 0);
    return d;
  });
  const [priority, setPriority] = useState<PriorityKey>('NORMAL');
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // États UI
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  // Raccourcis rapides d'échéance
  const setQuickTime = (type: 'now_10s' | 'tonight' | 'tomorrow') => {
    const now = new Date();
    if (type === 'now_10s') {
      setScheduledAt(new Date(now.getTime() + 10 * 1000));
    } else if (type === 'tonight') {
      const tonight = new Date();
      tonight.setHours(20, 0, 0, 0);
      setScheduledAt(tonight > now ? tonight : addHours(now, 2));
    } else if (type === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledAt(tomorrow);
    }
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      setTitleError('Le titre est requis');
      return false;
    }
    if (scheduledAt <= new Date()) {
      showSnackbar("L'échéance doit être dans le futur");
      return false;
    }
    setTitleError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const settings = await SettingsRepository.get();

      await createReminder({
        title: title.trim(),
        notes: notes.trim() || undefined,
        scheduledAt,
        timezone: settings.timezone,
        priority,
        actionType,
        recurrenceRule: hasRecurrence
          ? {
              type: recurrenceType,
              interval: 1,
              dayOfMonth: recurrenceType === 'MONTHLY' ? scheduledAt.getDate() : undefined,
            }
          : undefined,
        notificationsEnabled: settings.notificationsEnabled,
      });

      showSnackbar('Rappel créé');
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = format(scheduledAt, "EEEE d MMMM 'à' HH:mm", { locale: fr });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.surface.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ─── Barre d'outils modale ───────────────────────────────────────────── */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => router.back()}
            accessibilityLabel="Annuler"
          >
            <Text style={styles.toolbarCancel}>Annuler</Text>
          </TouchableOpacity>
          <View style={styles.toolbarCenter}>
            <Text style={styles.toolbarTitle}>Nouveau rappel</Text>
            <Text style={styles.toolbarSubtitle}>Intention & Moment</Text>
          </View>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="Créer"
          >
            <Text style={[styles.toolbarSave, saving && styles.toolbarSaveDisabled]}>
              {saving ? 'Création...' : 'Créer'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Carte 1 : Titre & Notes (Midnight Glass) ────────────────────────── */}
          <View style={styles.cardGroup}>
            <TextInput
              style={[styles.titleInput, !!titleError && styles.inputError]}
              value={title}
              onChangeText={t => {
                setTitle(t);
                if (titleError) setTitleError('');
              }}
              placeholder="Que devez-vous garder en tête ?"
              placeholderTextColor={palette.onSurface.disabled}
              autoFocus
              maxLength={120}
            />
            {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}

            <View style={styles.notesRow}>
              <Ionicons name="menu-outline" size={18} color={palette.onSurface.variant} style={styles.notesIcon} />
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Précisions, liens, contexte (optionnel)"
                placeholderTextColor={palette.onSurface.disabled}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>
          </View>

          {/* ─── Échéance & Moment (Groupe 2 - R-05) ──────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="moon-outline" size={16} color={palette.tertiary.default} />
            <Text style={styles.sectionHeaderTitle}>Échéance & Moment</Text>
          </View>

          <View style={styles.cardGroup}>
            {/* Chips rapides */}
            <View style={styles.quickTimesRow}>
              {__DEV__ && (
                <TouchableOpacity
                  style={[styles.quickTimeChip, { borderColor: palette.primary.default }]}
                  onPress={() => setQuickTime('now_10s')}
                >
                  <Ionicons name="flash-outline" size={12} color={palette.primary.default} />
                  <Text style={[styles.quickTimeText, { color: palette.primary.default, fontWeight: '600' }]}>
                    Dans 10s (Test)
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.quickTimeChip}
                onPress={() => setQuickTime('tonight')}
              >
                <Ionicons name="time-outline" size={12} color={palette.onSurface.variant} />
                <Text style={styles.quickTimeText}>Ce soir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickTimeChip}
                onPress={() => setQuickTime('tomorrow')}
              >
                <Ionicons name="sunny-outline" size={12} color={palette.onSurface.variant} />
                <Text style={styles.quickTimeText}>Demain</Text>
              </TouchableOpacity>
            </View>

            {/* Sélecteur complet de date/heure */}
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateSelectorLeft}>
                <Ionicons name="calendar-outline" size={18} color={palette.primary.default} />
                <Text style={styles.dateValue}>{dateLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.onSurface.disabled} />
            </TouchableOpacity>
          </View>

          {/* ─── Sphère d'Intention / Action (Groupe 3 - R-05) ────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shapes-outline" size={16} color={palette.onSurface.variant} />
            <Text style={styles.sectionHeaderTitle}>Sphère d'Intention & Action</Text>
          </View>

          <View style={styles.actionGrid}>
            {ACTION_OPTIONS.map(opt => {
              const isSelected = actionType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.actionTile,
                    isSelected && styles.actionTileSelected,
                  ]}
                  onPress={() => setActionType(opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={isSelected ? palette.primary.default : palette.onSurface.variant}
                  />
                  <Text
                    style={[
                      styles.actionTileLabel,
                      isSelected && styles.actionTileLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ─── Priorité (Groupe 4 - R-05) ───────────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flash-outline" size={16} color={palette.primary.default} />
            <Text style={styles.sectionHeaderTitle}>Exigence & Priorité</Text>
          </View>

          <View style={styles.priorityRow}>
            {PRIORITY_OPTIONS.map(opt => {
              const isSelected = priority === opt.key;
              const chipColor = palette.priority[opt.key];
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.priorityTile,
                    isSelected && {
                      backgroundColor: palette.surface.high,
                      borderColor: chipColor,
                    },
                  ]}
                  onPress={() => setPriority(opt.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityDot, { backgroundColor: chipColor }]} />
                  <Text
                    style={[
                      styles.priorityLabel,
                      isSelected && { color: chipColor, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ─── Récurrence & Cadence (Groupe 5) ──────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="repeat-outline" size={16} color={palette.tertiary.default} />
            <Text style={styles.sectionHeaderTitle}>Fréquence & Cadence</Text>
          </View>

          <View style={styles.cardGroup}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.fieldLabel}>Répéter ce rappel</Text>
                <Text style={styles.fieldHelper}>Recréé automatiquement à la complétion</Text>
              </View>
              <Switch
                value={hasRecurrence}
                onValueChange={setHasRecurrence}
                trackColor={{ false: palette.outline.variant, true: palette.primary.default }}
                thumbColor={hasRecurrence ? '#FFFFFF' : palette.onSurface.disabled}
              />
            </View>

            {hasRecurrence && (
              <View style={styles.recurrenceOptionsRow}>
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(type => {
                  const labels = { DAILY: 'Tous les jours', WEEKLY: 'Chaque semaine', MONTHLY: 'Chaque mois' };
                  const isSel = recurrenceType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.recurrenceChip, isSel && styles.recurrenceChipSelected]}
                      onPress={() => setRecurrenceType(type)}
                    >
                      <Text style={[styles.recurrenceText, isSel && styles.recurrenceTextSelected]}>
                        {labels[type]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* ─── CTA Principal Dégradé (Unique dégradé R-05) ───────────────────────── */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={palette.gradient.primary as unknown as readonly [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.gradientBtnText}>
                  {saving ? 'Création en cours...' : 'Créer le rappel'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerNoteRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color={palette.onSurface.disabled} />
              <Text style={styles.footerNote}>Rappel stocké localement • Hors-ligne</Text>
            </View>
          </View>
        </ScrollView>

        {/* Modal sélecteur de date/heure natif */}
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          date={scheduledAt}
          onConfirm={d => {
            setShowDatePicker(false);
            setScheduledAt(d);
          }}
          onCancel={() => setShowDatePicker(false)}
          locale="fr-FR"
          confirmTextIOS="Confirmer"
          cancelTextIOS="Annuler"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
