/**
 * A row of tags to filter a list, scrolling sideways. It only appears once a tag exists, so
 * that whoever does not use tags never sees it.
 */

import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { Tag } from '@/domain/entities';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

import { TagDot } from './TagChip';

interface TagFilterRowProps {
  tags: readonly Tag[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function TagFilterRow({ tags, selectedId, onSelect }: TagFilterRowProps) {
  const t = useT();
  const styles = useThemedStyles(makeTagFilterStyles);
  if (tags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      testID="tag-filter-row"
    >
      <TouchableOpacity
        style={[styles.pill, selectedId === null && styles.pillActive]}
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedId === null }}
        accessibilityLabel={t('tags.filterAll')}
        testID="tag-filter-all"
      >
        <Text style={[styles.text, selectedId === null && styles.textActive]}>{t('tags.filterAll')}</Text>
      </TouchableOpacity>
      {tags.map(tag => {
        const selected = tag.id === selectedId;
        return (
          <TouchableOpacity
            key={tag.id}
            style={[styles.pill, selected && styles.pillActive]}
            // Touching the chosen tag again shows everything
            onPress={() => onSelect(selected ? null : tag.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t('tags.filterA11y', { name: tag.name })}
            testID={`tag-filter-${tag.id}`}
          >
            <TagDot color={tag.color} />
            <Text style={[styles.text, selected && styles.textActive]} numberOfLines={1}>
              {tag.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const makeTagFilterStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
      marginTop: Spacing.sm,
    },
    row: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    pillActive: {
      backgroundColor: theme.glass.controlActive,
      borderColor: theme.primary.default,
    },
    text: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    textActive: {
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
  });
