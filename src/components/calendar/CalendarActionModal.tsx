/**
 * Modal / Action Sheet unifié de création d'élément depuis le Calendrier.
 * Permet à l'utilisateur de choisir parmi les 3 types d'actions :
 * 1. Événement (avec date et heure optionnelle)
 * 2. Rappel (avec alerte sonore et notification)
 * 3. Tâche (action concrète à accomplir)
 */
import { memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';

import { Spacing, Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { ThemePalette } from '@/constants/palettes';

interface CalendarActionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  slotHour?: number | null;
}

export const CalendarActionModal = memo(function CalendarActionModal({
  visible,
  onClose,
  selectedDate,
  slotHour,
}: CalendarActionModalProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeActionModalStyles);
  const isLight = theme.mode === 'light';

  // Couleurs d'accent adaptées pour les types d'actions
  const eventAccentColor = isLight ? '#0284C7' : '#38BDF8';
  const reminderAccentColor = theme.primary.default;
  const taskAccentColor = isLight ? '#059669' : '#34D399';

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dateFormatted = format(selectedDate, 'EEEE d MMMM', { locale: fr });
  const hasHour = slotHour !== undefined && slotHour !== null;

  const handleSelectEvent = () => {
    onClose();
    router.push({
      pathname: '/events/new',
      params: {
        defaultDate: dateStr,
        ...(hasHour ? { defaultHour: String(slotHour) } : {}),
      },
    });
  };

  const handleSelectReminder = () => {
    onClose();
    router.push({
      pathname: '/reminders/new',
      params: {
        defaultDate: dateStr,
        ...(hasHour ? { defaultHour: String(slotHour) } : {}),
      },
    });
  };

  const handleSelectTask = () => {
    onClose();
    router.push({
      pathname: '/tasks/new',
      params: {
        defaultDate: dateStr,
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fermer la boîte de sélection"
      >
        <View style={styles.sheet}>
          {/* Poignée de feuille */}
          <View style={styles.handle} />

          {/* En-tête de la feuille */}
          <View style={styles.header}>
            <View style={styles.headerCol}>
              <Text style={styles.title}>
                {hasHour
                  ? `Créneau de ${String(slotHour).padStart(2, '0')}:00`
                  : 'Ajouter au planning'}
              </Text>
              <Text style={styles.subtitle}>
                {dateFormatted}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer la fenêtre d'ajout"
            >
              <Ionicons name="close" size={20} color={theme.onSurface.variant} />
            </TouchableOpacity>
          </View>

          <Text style={styles.question}>
            Que souhaitez-vous planifier pour cette journée ?
          </Text>

          {/* Liste des 3 options */}
          <View style={styles.optionsList}>
            {/* Option 1: Événement */}
            <TouchableOpacity
              style={[styles.optionCard, { borderColor: eventAccentColor + '55' }]}
              onPress={handleSelectEvent}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Créer un événement : rendez-vous, réunion ou bloc fixe"
            >
              <View style={[styles.optionIconBox, { backgroundColor: eventAccentColor + '20' }]}>
                <Ionicons name="calendar" size={20} color={eventAccentColor} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Événement</Text>
                <Text style={styles.optionDesc}>Rendez-vous, réunion ou bloc horaire fixe</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={eventAccentColor} />
            </TouchableOpacity>

            {/* Option 2: Rappel */}
            <TouchableOpacity
              style={[styles.optionCard, { borderColor: reminderAccentColor + '55' }]}
              onPress={handleSelectReminder}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Créer un rappel : alerte sonore et notification précise"
            >
              <View style={[styles.optionIconBox, { backgroundColor: reminderAccentColor + '20' }]}>
                <Ionicons name="notifications" size={20} color={reminderAccentColor} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Rappel</Text>
                <Text style={styles.optionDesc}>Alerte sonore et notification précise</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={reminderAccentColor} />
            </TouchableOpacity>

            {/* Option 3: Tâche */}
            <TouchableOpacity
              style={[styles.optionCard, { borderColor: taskAccentColor + '55' }]}
              onPress={handleSelectTask}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Créer une tâche : action à cocher avec durée estimée"
            >
              <View style={[styles.optionIconBox, { backgroundColor: taskAccentColor + '20' }]}>
                <Ionicons name="checkbox" size={20} color={taskAccentColor} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Tâche du jour</Text>
                <Text style={styles.optionDesc}>Action concrète avec durée estimée</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={taskAccentColor} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

function makeActionModalStyles(theme: ThemePalette) {
  const isLight = theme.mode === 'light';

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.70)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: isLight ? theme.surface.base : 'rgba(20, 24, 38, 0.96)',
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xxl + 10,
      borderWidth: 1,
      borderColor: isLight ? theme.outline.variant : 'rgba(208, 188, 255, 0.20)',
      gap: Spacing.md,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.outline.variant,
      alignSelf: 'center',
      marginBottom: Spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerCol: {
      gap: 2,
    },
    title: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    subtitle: {
      ...Typography.labelSmall,
      color: theme.primary.default,
      textTransform: 'capitalize',
      fontSize: 11,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: isLight ? theme.surface.high : 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    question: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      marginTop: -2,
    },
    optionsList: {
      gap: Spacing.sm,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isLight ? theme.surface.container : 'rgba(26, 30, 48, 0.85)',
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      gap: Spacing.md,
    },
    optionIconBox: {
      width: 42,
      height: 42,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionContent: {
      flex: 1,
      gap: 2,
    },
    optionTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    optionDesc: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      fontSize: 11,
    },
  });
}
