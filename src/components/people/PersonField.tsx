/**
 * "Avec qui ?" in the forms of reminders, tasks and events: the chosen people as chips with a
 * cross, and a chip that opens the picker. One card, the same in the three forms.
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { Person } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { PersonRepository } from '@/repositories/person-repository';
import { makeFormStyles } from '@/styles/common/form-styles';
import { makeNewReminderStyles } from '@/styles/reminders/new-reminder-styles';

import { PersonAvatar } from './PersonAvatar';
import { PersonPicker } from './PersonPicker';

interface PersonFieldProps {
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  /** Several people (an event), or one (a reminder, a task). */
  multiple?: boolean;
  /**
   * The reminder form draws its section headers with a plain icon: the field follows it.
   * 'bare' draws the chips only, under the label of a screen that has its own.
   */
  look?: 'form' | 'reminder' | 'bare';
}

export function PersonField({ selectedIds, onChange, multiple = false, look = 'form' }: PersonFieldProps) {
  const t = useT();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const reminderStyles = useThemedStyles(makeNewReminderStyles);
  const [persons, setPersons] = useState<Person[]>([]);
  const [picking, setPicking] = useState(false);

  // Read again when the form comes back into view: a person may just have been created
  useFocusEffect(
    useCallback(() => {
      let active = true;
      PersonRepository.findAll()
        .then(list => {
          if (active) setPersons(list);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [])
  );

  const selected = selectedIds
    .map(id => persons.find(person => person.id === id))
    .filter((person): person is Person => person !== undefined);
  const canAdd = multiple || selected.length === 0;

  return (
    <>
      {look === 'bare' ? null : look === 'reminder' ? (
        <View style={reminderStyles.sectionHeaderRow}>
          <Ionicons name="people-outline" size={16} color={palette.onSurface.variant} />
          <Text style={reminderStyles.sectionHeaderTitle}>{t('personField.header')}</Text>
        </View>
      ) : (
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="people-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>{t('personField.header')}</Text>
        </View>
      )}

      <View style={look === 'bare' ? undefined : look === 'reminder' ? reminderStyles.cardGroup : formStyles.cardGroup}>
        <View style={formStyles.chipsRow}>
          {selected.map(person => (
            <TouchableOpacity
              key={person.id}
              style={[formStyles.chip, formStyles.chipActive]}
              onPress={() => onChange(selectedIds.filter(id => id !== person.id))}
              accessibilityRole="button"
              accessibilityLabel={t('personField.remove', { name: person.displayName })}
              testID={`person-field-remove-${person.id}`}
            >
              <PersonAvatar name={person.displayName} size={20} />
              <Text style={[formStyles.chipText, formStyles.chipTextActive]}>{person.displayName}</Text>
              <Ionicons name="close" size={14} color={palette.primary.default} />
            </TouchableOpacity>
          ))}
          {canAdd && (
            <TouchableOpacity
              style={formStyles.chip}
              onPress={() => setPicking(true)}
              accessibilityRole="button"
              accessibilityLabel={t('personField.add')}
              testID="person-field-add"
            >
              <Ionicons name="add" size={14} color={palette.onSurface.variant} />
              <Text style={formStyles.chipText}>{t(selected.length > 0 ? 'personField.addMore' : 'personField.add')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <PersonPicker
        visible={picking}
        persons={persons}
        selectedIds={selectedIds}
        multiple={multiple}
        onChange={onChange}
        onClose={() => setPicking(false)}
      />
    </>
  );
}
