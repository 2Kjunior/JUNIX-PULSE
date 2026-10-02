/**
 * Bottom sheet de snooze d'un rappel — Référence R-06.
 * Extrait de reminders/[id].tsx : 6 options (4 raccourcis rapides,
 * "demain même heure", date personnalisée via DateTimePicker).
 */
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

import { SnoozeInput } from '@/use-cases/reminder-use-cases';
import { Primary, Tertiary, OnSurface, Spacing } from '@/constants/theme';
import { SNOOZE_OPTIONS_MINUTES } from '@/domain/rules/reminder-rules';
import { styles } from '@/styles/reminders/reminder-detail-styles';

type SnoozeSheetMode = 'hidden' | 'picker';

interface ReminderSnoozeSheetProps {
  scheduledAt: string;
  insetsBottom: number;
  snoozeSheet: SnoozeSheetMode;
  customDate: Date;
  onSnoozeSheetChange: (mode: SnoozeSheetMode) => void;
  onCustomDateChange: (date: Date) => void;
  onClose: () => void;
  onSnooze: (input: SnoozeInput) => void;
}

export function ReminderSnoozeSheet({
  scheduledAt,
  insetsBottom,
  snoozeSheet,
  customDate,
  onSnoozeSheetChange,
  onCustomDateChange,
  onClose,
  onSnooze,
}: ReminderSnoozeSheetProps) {
  return (
    <View style={styles.snoozeOverlay}>
      <TouchableOpacity style={styles.snoozeBackdrop} onPress={onClose} />
      <View style={[styles.snoozeSheet, { paddingBottom: insetsBottom + Spacing.lg }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.snoozeTitle}>Reporter ce rappel</Text>

        {/* 4 durées rapides en grille de chips (R-06) */}
        <Text style={styles.snoozeSubtitle}>Raccourcis rapides</Text>
        <View style={styles.snoozeGrid}>
          {SNOOZE_OPTIONS_MINUTES.map(minutes => (
            <TouchableOpacity
              key={minutes}
              style={styles.snoozeTile}
              onPress={() => onSnooze({ kind: 'quick', minutes })}
              activeOpacity={0.7}
            >
              <Ionicons name="timer-outline" size={16} color={Tertiary.default} />
              <Text style={styles.snoozeTileText}>
                {minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2 options pleine largeur (R-06) */}
        <View style={styles.snoozeFullOptions}>
          {/* Demain même heure */}
          <TouchableOpacity
            style={styles.snoozeFullOption}
            onPress={() => onSnooze({ kind: 'tomorrow' })}
            activeOpacity={0.7}
          >
            <View style={styles.snoozeOptionLeft}>
              <Ionicons name="sunny-outline" size={18} color="#F59E0B" />
              <View>
                <Text style={styles.snoozeOptionLabel}>Demain même heure</Text>
                <Text style={styles.snoozeOptionHint}>
                  {format(addDays(new Date(scheduledAt), 1), "EEEE d MMM 'à' HH:mm", {
                    locale: fr,
                  })}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
          </TouchableOpacity>

          {/* Date personnalisée */}
          <TouchableOpacity
            style={styles.snoozeFullOption}
            onPress={() => {
              onSnoozeSheetChange('picker');
              onCustomDateChange(new Date());
            }}
            activeOpacity={0.7}
          >
            <View style={styles.snoozeOptionLeft}>
              <Ionicons name="calendar-outline" size={18} color={Primary.default} />
              <Text style={styles.snoozeOptionLabel}>Choisir une date & heure</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
          </TouchableOpacity>
        </View>

        {/* DateTimePicker sélecteur */}
        {snoozeSheet === 'picker' && (
          <DateTimePicker
            value={customDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_event, date) => {
              if (!date) {
                onSnoozeSheetChange('hidden');
                return;
              }
              onCustomDateChange(date);
              if (Platform.OS === 'android') {
                onSnoozeSheetChange('hidden');
                onSnooze({ kind: 'custom', until: date });
              }
            }}
          />
        )}

        {/* Bouton de confirmation sur iOS */}
        {snoozeSheet === 'picker' && Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.snoozeConfirmBtn}
            onPress={() => {
              onSnoozeSheetChange('hidden');
              onSnooze({ kind: 'custom', until: customDate });
            }}
          >
            <Text style={styles.snoozeConfirmLabel}>Confirmer la date</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
