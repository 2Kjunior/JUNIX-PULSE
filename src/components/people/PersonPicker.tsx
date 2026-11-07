/**
 * Choosing the people of a reminder, a task or an event: a glass sheet from the bottom with a
 * search, the people seen most recently first. One person for a reminder or a task (a choice
 * closes the sheet), several for an event (checked in turn, then "Terminé").
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { Person } from '@/domain/entities';
import { pickerPersons } from '@/domain/rules/person-picker-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

import { PersonAvatar } from './PersonAvatar';

interface PersonPickerProps {
  visible: boolean;
  persons: readonly Person[];
  selectedIds: readonly string[];
  multiple?: boolean;
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

export function PersonPicker({ visible, persons, selectedIds, multiple = false, onChange, onClose }: PersonPickerProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useThemedStyles(makePersonPickerStyles);
  const [query, setQuery] = useState('');
  const shown = useMemo(() => pickerPersons(persons, query), [persons, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  const toggle = (id: string) => {
    if (!multiple) {
      onChange(selectedIds.includes(id) ? [] : [id]);
      close();
      return;
    }
    onChange(selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            {t(multiple ? 'personPicker.titleMany' : 'personPicker.titleOne')}
          </Text>

          {persons.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={28} color={palette.primary.default} />
              <Text style={styles.emptyText}>{t('personPicker.empty')}</Text>
              <Button
                label={t('personPicker.create')}
                variant="secondary"
                size="md"
                onPress={() => {
                  close();
                  router.push('/people/new');
                }}
              />
            </View>
          ) : (
            <>
              <View style={styles.search}>
                <Ionicons name="search-outline" size={18} color={palette.onSurface.variant} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('personPicker.search')}
                  placeholderTextColor={palette.onSurface.disabled}
                  autoCorrect={false}
                  accessibilityLabel={t('personPicker.search')}
                  testID="person-picker-search"
                />
              </View>

              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {shown.length === 0 && <Text style={styles.noMatch}>{t('personPicker.noMatch')}</Text>}
                {shown.map(person => {
                  const selected = selectedIds.includes(person.id);
                  return (
                    <TouchableOpacity
                      key={person.id}
                      style={[styles.row, selected && styles.rowSelected]}
                      onPress={() => toggle(person.id)}
                      accessibilityRole={multiple ? 'checkbox' : 'radio'}
                      accessibilityState={multiple ? { checked: selected } : { selected }}
                      accessibilityLabel={person.displayName}
                      testID={`person-picker-${person.id}`}
                    >
                      <PersonAvatar name={person.displayName} size={36} />
                      <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                          {person.displayName}
                        </Text>
                        {!!person.relationship && (
                          <Text style={styles.relation} numberOfLines={1}>
                            {person.relationship}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : multiple ? 'ellipse-outline' : 'chevron-forward'}
                        size={22}
                        color={selected ? palette.primary.default : palette.onSurface.disabled}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {multiple && <Button label={t('personPicker.done')} variant="secondary" size="md" onPress={close} />}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makePersonPickerStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    sheet: {
      maxHeight: '80%',
      // Opaque: without blur (Android, web) the screen behind would show through the list
      backgroundColor: theme.surface.container,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      gap: Spacing.md,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.onSurface.disabled,
      alignSelf: 'center',
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
      textAlign: 'center',
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      minHeight: 44,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    searchInput: {
      flex: 1,
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      paddingVertical: Spacing.sm,
    },
    list: {
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      minHeight: 56,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
    },
    rowSelected: {
      backgroundColor: theme.glass.controlActive,
    },
    rowText: {
      flex: 1,
    },
    name: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
    },
    relation: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    noMatch: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
      paddingVertical: Spacing.lg,
    },
    empty: {
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    emptyText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
    },
  });
