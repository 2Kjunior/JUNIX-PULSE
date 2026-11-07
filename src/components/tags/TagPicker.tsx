/**
 * Choosing the tags of a task, a reminder or an event, and managing them in the same place: no
 * page of its own in the settings. A sheet from the bottom: create a tag (name and colour), check
 * the ones to put on, and the pencil of a tag to rename it, change its colour or delete it.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import { Button } from '@/components/ui/Button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { tagColorValue } from '@/constants/tag-colors';
import type { Tag } from '@/domain/entities';
import { nextTagColor, sortTags, TAG_COLORS, TAG_NAME_MAX, type TagColor } from '@/domain/rules/tag-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT, type MessageKey } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { TagUseCases, type TagSaveResult } from '@/use-cases/tag-use-cases';

import { TagDot } from './TagChip';

interface TagPickerProps {
  visible: boolean;
  tags: readonly Tag[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  /** The list of tags changed: one was created, renamed, recoloured or deleted. */
  onTagsChange: (tags: Tag[]) => void;
  onClose: () => void;
}

function ColorChoice({ value, onChange }: { value: TagColor; onChange: (color: TagColor) => void }) {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeTagPickerStyles);
  return (
    <View style={styles.colors} accessibilityRole="radiogroup">
      {TAG_COLORS.map(color => {
        const selected = color === value;
        return (
          <TouchableOpacity
            key={color}
            style={[styles.colorRing, selected && { borderColor: palette.onSurface.primary }]}
            onPress={() => onChange(color)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t('tagPicker.color', { color: t(`tagColor.${color}` as MessageKey) })}
            testID={`tag-color-${color}`}
          >
            <View style={[styles.colorDot, { backgroundColor: tagColorValue(palette, color) }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function TagPicker({ visible, tags, selectedIds, onChange, onTagsChange, onClose }: TagPickerProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeTagPickerStyles);
  const showSnackbar = useAppStore(state => state.showSnackbar);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<TagColor | null>(null);
  const [editing, setEditing] = useState<{ tag: Tag; name: string; color: TagColor } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setNewName('');
    setNewColor(null);
    setEditing(null);
    setError(null);
    onClose();
  };

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id]);

  /** Keeps the tag, or says why not; a failure of the database is shown once, never thrown. */
  const save = async (run: () => Promise<TagSaveResult>): Promise<Tag | null> => {
    try {
      const result = await run();
      if (!result.ok) {
        setError(result.reason === 'taken' ? t('tagPicker.taken') : null);
        return null;
      }
      setError(null);
      return result.tag;
    } catch {
      showSnackbar(t('tagPicker.failed'));
      return null;
    }
  };

  const create = async () => {
    const tag = await save(() => TagUseCases.create(newName, newColor ?? nextTagColor(tags), tags));
    if (!tag) return;
    const list = sortTags([...tags, tag]);
    onTagsChange(list);
    onChange([...selectedIds, tag.id]);
    setNewName('');
    setNewColor(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const tag = await save(() => TagUseCases.update(editing.tag, editing.name, editing.color, tags));
    if (!tag) return;
    onTagsChange(sortTags(tags.map(item => (item.id === tag.id ? tag : item))));
    setEditing(null);
  };

  const remove = (tag: Tag) => {
    GlassAlert.alert(t('tagPicker.deleteTitle', { name: tag.name }), t('tagPicker.deleteBody'), [
      { text: t('form.cancel'), style: 'cancel' },
      {
        text: t('tagPicker.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await TagUseCases.delete(tag.id);
            onTagsChange(tags.filter(item => item.id !== tag.id));
            onChange(selectedIds.filter(id => id !== tag.id));
            setEditing(null);
          } catch {
            showSnackbar(t('tagPicker.failed'));
          }
        },
      },
    ]);
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
            {t('tagPicker.title')}
          </Text>

          {/* Une nouvelle étiquette : son nom, puis sa couleur dès qu'on écrit */}
          <View style={styles.createRow}>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={text => {
                setNewName(text);
                setError(null);
              }}
              onSubmitEditing={create}
              placeholder={t('tagPicker.newPlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              maxLength={TAG_NAME_MAX}
              returnKeyType="done"
              accessibilityLabel={t('tagPicker.newPlaceholder')}
              testID="tag-picker-new"
            />
            <Button label={t('tagPicker.create')} variant="secondary" size="sm" onPress={create} disabled={!newName.trim()} />
          </View>
          {!!newName.trim() && <ColorChoice value={newColor ?? nextTagColor(tags)} onChange={setNewColor} />}
          {!!error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {tags.length === 0 && <Text style={styles.empty}>{t('tagPicker.empty')}</Text>}
            {tags.map(tag => {
              if (editing?.tag.id === tag.id) {
                return (
                  <View key={tag.id} style={styles.editBox}>
                    <TextInput
                      style={styles.input}
                      value={editing.name}
                      onChangeText={name => {
                        setEditing({ ...editing, name });
                        setError(null);
                      }}
                      maxLength={TAG_NAME_MAX}
                      autoFocus
                      accessibilityLabel={t('tagPicker.edit', { name: tag.name })}
                      testID="tag-picker-edit-name"
                    />
                    <ColorChoice value={editing.color} onChange={color => setEditing({ ...editing, color })} />
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => remove(tag)}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('tagPicker.delete')} ${tag.name}`}
                      >
                        <Ionicons name="trash-outline" size={16} color={palette.error.default} />
                        <Text style={styles.deleteText}>{t('tagPicker.delete')}</Text>
                      </TouchableOpacity>
                      <Button label={t('tagPicker.save')} variant="secondary" size="sm" onPress={saveEdit} />
                    </View>
                  </View>
                );
              }
              const selected = selectedIds.includes(tag.id);
              return (
                <View key={tag.id} style={[styles.row, selected && styles.rowSelected]}>
                  <TouchableOpacity
                    style={styles.rowMain}
                    onPress={() => toggle(tag.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={tag.name}
                    testID={`tag-picker-${tag.id}`}
                  >
                    <TagDot color={tag.color} size={14} />
                    <Text style={styles.name} numberOfLines={1}>
                      {tag.name}
                    </Text>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={selected ? palette.primary.default : palette.onSurface.disabled}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setError(null);
                      setEditing({ tag, name: tag.name, color: tag.color });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('tagPicker.edit', { name: tag.name })}
                    testID={`tag-picker-edit-${tag.id}`}
                  >
                    <Ionicons name="create-outline" size={18} color={palette.onSurface.variant} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <Button label={t('tagPicker.done')} variant="secondary" size="md" onPress={close} />
        </View>
      </View>
    </Modal>
  );
}

const makeTagPickerStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    sheet: {
      maxHeight: '85%',
      // Opaque, like the person picker: nothing behind shows through the list
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
    createRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    input: {
      flex: 1,
      ...Typography.bodyLarge,
      color: theme.onSurface.primary,
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    colors: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    colorRing: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorDot: {
      width: 26,
      height: 26,
      borderRadius: 13,
    },
    error: {
      ...Typography.bodySmall,
      color: theme.error.default,
    },
    list: {
      flexGrow: 0,
    },
    empty: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
      textAlign: 'center',
      paddingVertical: Spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.md,
    },
    rowSelected: {
      backgroundColor: theme.glass.controlActive,
    },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      minHeight: 52,
      paddingHorizontal: Spacing.sm,
    },
    name: {
      flex: 1,
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
    },
    editBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editBox: {
      gap: Spacing.sm,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: theme.glass.controlActive,
      marginBottom: Spacing.xs,
    },
    editActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      minHeight: 44,
      paddingHorizontal: Spacing.sm,
    },
    deleteText: {
      ...Typography.labelMedium,
      color: theme.error.default,
    },
  });
