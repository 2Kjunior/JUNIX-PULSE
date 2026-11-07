/**
 * "Étiquettes" in the forms of tasks, reminders and events: the chosen tags as chips with a
 * cross, and a chip that opens the picker, where tags are also created and changed. The same
 * look as "Avec qui ?" just above it.
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { Tag } from '@/domain/entities';
import { tagsOf } from '@/domain/rules/tag-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { TagRepository } from '@/repositories/tag-repository';
import { makeFormStyles } from '@/styles/common/form-styles';
import { makeNewReminderStyles } from '@/styles/reminders/new-reminder-styles';

import { TagDot } from './TagChip';
import { TagPicker } from './TagPicker';

interface TagFieldProps {
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  /** As PersonField: the header of the generic forms, of the reminder form, or none. */
  look?: 'form' | 'reminder' | 'bare';
}

export function TagField({ selectedIds, onChange, look = 'form' }: TagFieldProps) {
  const t = useT();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const reminderStyles = useThemedStyles(makeNewReminderStyles);
  const [tags, setTags] = useState<Tag[]>([]);
  const [picking, setPicking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      TagRepository.findAll()
        .then(list => {
          if (active) setTags(list);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [])
  );

  const selected = tagsOf(selectedIds, tags);

  return (
    <>
      {look === 'bare' ? null : look === 'reminder' ? (
        <View style={reminderStyles.sectionHeaderRow}>
          <Ionicons name="pricetag-outline" size={16} color={palette.onSurface.variant} />
          <Text style={reminderStyles.sectionHeaderTitle}>{t('tagField.header')}</Text>
        </View>
      ) : (
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="pricetag-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>{t('tagField.header')}</Text>
        </View>
      )}

      <View style={look === 'bare' ? undefined : look === 'reminder' ? reminderStyles.cardGroup : formStyles.cardGroup}>
        <View style={formStyles.chipsRow}>
          {selected.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[formStyles.chip, formStyles.chipActive]}
              onPress={() => onChange(selectedIds.filter(id => id !== tag.id))}
              accessibilityRole="button"
              accessibilityLabel={t('tagField.remove', { name: tag.name })}
              testID={`tag-field-remove-${tag.id}`}
            >
              <TagDot color={tag.color} />
              <Text style={[formStyles.chipText, formStyles.chipTextActive]}>{tag.name}</Text>
              <Ionicons name="close" size={14} color={palette.primary.default} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={formStyles.chip}
            onPress={() => setPicking(true)}
            accessibilityRole="button"
            accessibilityLabel={t('tagField.add')}
            testID="tag-field-add"
          >
            <Ionicons name="add" size={14} color={palette.onSurface.variant} />
            <Text style={formStyles.chipText}>{t(selected.length > 0 ? 'tagField.addMore' : 'tagField.add')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TagPicker
        visible={picking}
        tags={tags}
        selectedIds={selectedIds}
        onChange={onChange}
        onTagsChange={setTags}
        onClose={() => setPicking(false)}
      />
    </>
  );
}
