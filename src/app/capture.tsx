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
import { format, addDays, nextDay, Day } from 'date-fns';
import { fr } from 'date-fns/locale';

import { createReminder } from '@/use-cases/reminder-use-cases';
import { PersonRepository } from '@/repositories/person-repository';
import { Person, ActionType, ReminderPriority } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const DAY_MAP: Record<string, Day> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

export default function QuickCaptureScreen() {
  const insets = useSafeAreaInsets();
  const { userTimezone, showSnackbar } = useAppStore();

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

  // Analyseur en langage naturel (local & déterministe)
  useEffect(() => {
    const raw = input.trim();
    if (!raw) {
      setCleanTitle('');
      return;
    }

    const lower = raw.toLowerCase();

    // 1. Détecter l'action
    let detectedAction: ActionType = 'NONE';
    if (/\b(appeler|téléphoner|coup de fil)\b/i.test(lower)) {
      detectedAction = 'CALL';
    } else if (/\b(sms|message|écrire un message|whatsapp)\b/i.test(lower)) {
      detectedAction = 'MESSAGE';
    } else if (/\b(mail|email|courriel|envoyer un mail)\b/i.test(lower)) {
      detectedAction = 'EMAIL';
    } else if (/\b(café|déjeuner|dîner|voir|rencontrer|rdv)\b/i.test(lower)) {
      detectedAction = 'MEET';
    } else if (/\b(faire|acheter|préparer|payer|ranger)\b/i.test(lower)) {
      detectedAction = 'TASK';
    }
    setActionType(detectedAction);

    // 2. Détecter la personne
    let matchedPerson: Person | null = null;
    for (const p of persons) {
      const pName = p.displayName.toLowerCase();
      const firstName = pName.split(' ')[0];
      if (lower.includes(pName) || (firstName.length >= 3 && lower.includes(firstName))) {
        matchedPerson = p;
        break;
      }
    }
    setTargetPerson(matchedPerson);

    // 3. Détecter la date
    let newDate = new Date();
    if (lower.includes('aujourd') || lower.includes('ce soir')) {
      newDate = new Date();
    } else if (lower.includes('demain')) {
      newDate = addDays(new Date(), 1);
    } else if (lower.includes('après-demain')) {
      newDate = addDays(new Date(), 2);
    } else {
      for (const [dayName, dayIndex] of Object.entries(DAY_MAP)) {
        if (lower.includes(dayName)) {
          newDate = nextDay(new Date(), dayIndex);
          break;
        }
      }
    }
    setTargetDate(newDate);

    // 4. Détecter l'heure
    let newTime = '09:00';
    if (lower.includes('ce soir') || lower.includes('soir')) {
      newTime = '20:30';
    } else if (lower.includes('midi')) {
      newTime = '12:00';
    } else if (lower.includes('matin')) {
      newTime = '08:30';
    } else {
      const timeMatch = lower.match(/\b([0-2]?[0-9])(?:h|:)?([0-5][0-9])?\b/);
      if (timeMatch && lower.includes('h')) {
        const hours = timeMatch[1].padStart(2, '0');
        const mins = (timeMatch[2] || '00').padStart(2, '0');
        newTime = `${hours}:${mins}`;
      }
    }
    setTargetTime(newTime);

    // 5. Priorité
    if (/\b(urgent|important|critique|asap)\b/i.test(lower)) {
      setPriority('URGENT');
    } else {
      setPriority('NORMAL');
    }

    setCleanTitle(raw);
  }, [input, persons]);

  // Construire la date finale combinée
  const computedDateTime = useMemo(() => {
    const [h, m] = targetTime.split(':').map(Number);
    const d = new Date(targetDate);
    d.setHours(h, m, 0, 0);
    return d;
  }, [targetDate, targetTime]);

  const handleCreate = async () => {
    if (!cleanTitle.trim()) return;
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
    } catch (e: any) {
      showSnackbar(e.message || 'Erreur lors de la création');
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
          <Ionicons name="close" size={24} color={OnSurface.primary} />
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
            placeholderTextColor={OnSurface.disabled}
            autoFocus
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Interprétation en temps réel */}
        {cleanTitle.length > 0 && (
          <View style={styles.interpretationSection}>
            <View style={styles.interpretationHeader}>
              <Ionicons name="sparkles-outline" size={16} color={Primary.default} />
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
                  color={Primary.default}
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
                  <Ionicons name="person-outline" size={14} color="#7BD0FF" />
                  <Text style={styles.chipPersonText}>{targetPerson.displayName}</Text>
                </View>
              )}

              {/* Chip Date */}
              <TouchableOpacity style={styles.chip} onPress={cycleDate} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={14} color={Tertiary.default} />
                <Text style={styles.chipText}>
                  {format(targetDate, 'EEEE d MMM', { locale: fr })}
                </Text>
              </TouchableOpacity>

              {/* Chip Heure */}
              <View style={styles.chip}>
                <Ionicons name="time-outline" size={14} color={OnSurface.variant} />
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
                  color={priority === 'URGENT' ? '#FF5252' : OnSurface.variant}
                />
                <Text
                  style={[
                    styles.chipText,
                    priority === 'URGENT' && { color: '#FF5252', fontWeight: '700' },
                  ]}
                >
                  {priority === 'URGENT' ? 'Urgent' : priority === 'LOW' ? 'Doux' : 'Normal'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Astuce : Touchez un badge pour changer l'action ou la priorité.
            </Text>
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
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  inputContainer: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  textInput: {
    ...Typography.bodyLarge,
    color: OnSurface.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  interpretationSection: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.md,
  },
  interpretationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  interpretationTitle: {
    ...Typography.titleMedium,
    color: Primary.default,
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
    backgroundColor: Surface.high,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: 6,
  },
  chipActiveAction: {
    borderColor: Primary.default,
    backgroundColor: Primary.container,
  },
  chipPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 208, 255, 0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#7BD0FF',
    gap: 6,
  },
  chipPersonText: {
    ...Typography.labelMedium,
    color: '#7BD0FF',
    fontWeight: '600',
  },
  chipUrgent: {
    borderColor: '#FF5252',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
  },
  chipText: {
    ...Typography.labelMedium,
    color: OnSurface.primary,
  },
  hint: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
    fontSize: 11,
  },
  actionBlock: {
    marginTop: Spacing.md,
  },
});
