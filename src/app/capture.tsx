/**
 * Écran R-11 — Quick Capture (Saisie en langage naturel).
 * Permet de saisir librement une intention ("Appeler Sophie demain à 18h"),
 * présente l'interprétation sous forme de chips interactifs avant confirmation.
 * Règle d'or : JAMAIS de création silencieuse, validation explicite obligatoire.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { createReminder } from '@/use-cases/reminder-use-cases';
import { PersonRepository } from '@/repositories/person-repository';
import { Person, ActionType, ReminderPriority } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';

import { parseQuickCapture } from '@/domain/rules/capture-rules';

export default function QuickCaptureScreen() {
  const insets = useSafeAreaInsets();
  const { userTimezone, showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeQuickCaptureStyles);

  const [input, setInput] = useState('');
  const [persons, setPersons] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);

  // Valeurs interprétées / ajustables
  const [actionType, setActionType] = useState<ActionType>('NONE');
  const [targetPerson, setTargetPerson] = useState<Person | null>(null);
  const [targetDate, setTargetDate] = useState<Date>(() => addDays(new Date(), 1));
  const [targetTime, setTargetTime] = useState<string>('09:00');
  const [priority, setPriority] = useState<ReminderPriority>('NORMAL');
  const [cleanTitle, setCleanTitle] = useState('');

  // Charger les contacts pour la reconnaissance
  useEffect(() => {
    async function loadContacts() {
      try {
        const list = await PersonRepository.findAll();
        setPersons(list);
      } catch {
        // Ignorer
      }
    }
    loadContacts();
  }, []);

  // Analyseur en langage naturel (local, déterministe et testé — DEF-10)
  useEffect(() => {
    const parsed = parseQuickCapture(input, persons);
    setCleanTitle(parsed.cleanTitle);
    setActionType(parsed.actionType);
    setTargetPerson(parsed.targetPerson ?? null);
    setTargetDate(parsed.targetDate);
    setTargetTime(parsed.targetTime);
    setPriority(parsed.priority);
  }, [input, persons]);

  // Construire la date finale combinée
  const computedDateTime = useMemo(() => {
    const [h, m] = targetTime.split(':').map(Number);
    const d = new Date(targetDate);
    d.setHours(h, m, 0, 0);
    return d;
  }, [targetDate, targetTime]);

  const isDateTimePast = computedDateTime <= new Date();

  const handleCreate = async () => {
    if (!cleanTitle.trim()) return;
    if (computedDateTime <= new Date()) {
      showSnackbar("L'échéance doit être dans le futur. Modifiez la date ou l'heure.");
      return;
    }
    setSaving(true);
    try {
      await createReminder({
        title: cleanTitle.trim(),
        scheduledAt: computedDateTime,
        timezone: userTimezone,
        priority,
        actionType,
        personId: targetPerson?.id,
        notificationsEnabled: true,
      });

      showSnackbar('Rappel créé via Quick Capture');
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const cycleAction = () => {
    const actions: ActionType[] = ['NONE', 'CALL', 'MESSAGE', 'EMAIL', 'MEET', 'TASK'];
    const nextIdx = (actions.indexOf(actionType) + 1) % actions.length;
    setActionType(actions[nextIdx]);
  };

  const cyclePriority = () => {
    const priorities: ReminderPriority[] = ['LOW', 'NORMAL', 'URGENT'];
    const nextIdx = (priorities.indexOf(priority) + 1) % priorities.length;
    setPriority(priorities[nextIdx]);
  };

  const cycleDate = () => {
    setTargetDate(prev => addDays(prev, 1));
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Capture</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Tapez librement ce que vous voulez faire ou retenir.
        </Text>

        {/* Champ de saisie libre */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ex : Appeler Thomas demain à 18h..."
            placeholderTextColor={palette.onSurface.disabled}
            autoFocus
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Interprétation en temps réel */}
        {cleanTitle.length > 0 && (
          <View style={styles.interpretationSection}>
            <View style={styles.interpretationHeader}>
              <Ionicons name="sparkles-outline" size={16} color={palette.primary.default} />
              <Text style={styles.interpretationTitle}>Voici ce que j'ai compris</Text>
            </View>

            <View style={styles.chipsWrap}>
              {/* Chip Action */}
              <TouchableOpacity
                style={[styles.chip, actionType !== 'NONE' && styles.chipActiveAction]}
                onPress={cycleAction}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    actionType === 'CALL'
                      ? 'call-outline'
                      : actionType === 'MESSAGE'
                      ? 'chatbubble-outline'
                      : actionType === 'EMAIL'
                      ? 'mail-outline'
                      : actionType === 'MEET'
                      ? 'people-outline'
                      : actionType === 'TASK'
                      ? 'checkbox-outline'
                      : 'ellipse-outline'
                  }
                  size={15}
                  color={palette.primary.default}
                />
                <Text style={styles.chipText}>
                  {actionType === 'CALL'
                    ? 'Appel'
                    : actionType === 'MESSAGE'
                    ? 'SMS'
                    : actionType === 'EMAIL'
                    ? 'Email'
                    : actionType === 'MEET'
                    ? 'Rencontre'
                    : actionType === 'TASK'
                    ? 'Tâche'
                    : 'Action libre'}
                </Text>
              </TouchableOpacity>

              {/* Chip Personne */}
              {targetPerson && (
                <View style={styles.chipPerson}>
                  <Ionicons name="person-outline" size={14} color={palette.tertiary.default} />
                  <Text style={styles.chipPersonText}>{targetPerson.displayName}</Text>
                </View>
              )}

              {/* Chip Date */}
              <TouchableOpacity style={styles.chip} onPress={cycleDate} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={14} color={palette.tertiary.default} />
                <Text style={styles.chipText}>
                  {format(targetDate, 'EEEE d MMM', { locale: fr })}
                </Text>
              </TouchableOpacity>

              {/* Chip Heure */}
              <View style={styles.chip}>
                <Ionicons name="time-outline" size={14} color={palette.onSurface.variant} />
                <Text style={styles.chipText}>{targetTime}</Text>
              </View>

              {/* Chip Priorité */}
              <TouchableOpacity
                style={[
                  styles.chip,
                  priority === 'URGENT' && styles.chipUrgent,
                ]}
                onPress={cyclePriority}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="flag-outline"
                  size={14}
                  color={priority === 'URGENT' ? palette.error.default : palette.onSurface.variant}
                />
                <Text
                  style={[
                    styles.chipText,
                    priority === 'URGENT' && { color: palette.error.default, fontWeight: '700' },
                  ]}
                >
                  {priority === 'URGENT' ? 'Urgent' : priority === 'LOW' ? 'Doux' : 'Normal'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Astuce : Touchez un badge pour changer l'action ou la priorité.
            </Text>

            {isDateTimePast && (
              <Text style={[styles.hint, { color: palette.error.default, marginTop: 8 }]}>
                ⚠️ Cette heure est déjà passée aujourd'hui. Touchez la date pour choisir demain ou un autre jour.
              </Text>
            )}
          </View>
        )}

        {/* Bouton de confirmation unique avec dégradé */}
        <View style={styles.actionBlock}>
          <Button
            label="Confirmer et créer le rappel"
            onPress={handleCreate}
            variant="primary"
            size="lg"
            loading={saving}
            disabled={!cleanTitle.trim()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeQuickCaptureStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline.variant,
    },
    closeBtn: {
      padding: Spacing.xs,
    },
    headerTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    subtitle: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    inputContainer: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    textInput: {
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    interpretationSection: {
      backgroundColor: theme.surface.container,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: Spacing.md,
    },
    interpretationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    interpretationTitle: {
      ...Typography.titleMedium,
      color: theme.primary.default,
      fontWeight: '600',
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface.high,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.outline.variant,
      gap: 6,
    },
    chipActiveAction: {
      borderColor: theme.primary.default,
      backgroundColor: theme.primary.container,
    },
    chipPerson: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.tertiary.container,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.tertiary.default,
      gap: 6,
    },
    chipPersonText: {
      ...Typography.labelMedium,
      color: theme.tertiary.default,
      fontWeight: '600',
    },
    chipUrgent: {
      borderColor: theme.error.default,
      backgroundColor: theme.error.container,
    },
    chipText: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
    },
    hint: {
      ...Typography.labelSmall,
      color: theme.onSurface.disabled,
      fontSize: 11,
    },
    actionBlock: {
      marginTop: Spacing.md,
    },
  });
