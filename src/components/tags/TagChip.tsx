/**
 * A tag as it is seen everywhere: a dot of its colour and its name. On the cards, TagSummary
 * shows the first one and "+2" for the others, so that a card stays readable.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { tagColorValue } from '@/constants/tag-colors';
import type { Tag } from '@/domain/entities';
import { cardTags } from '@/domain/rules/tag-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

export function TagDot({ color, size = 8 }: { color: Tag['color']; size?: number }) {
  const { palette } = useTheme();
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tagColorValue(palette, color) }}
      importantForAccessibility="no"
    />
  );
}

/** The name with its dot, on a quiet pill: the colour says the group, the text stays neutral. */
export function TagChip({ tag }: { tag: Pick<Tag, 'name' | 'color'> }) {
  const styles = useThemedStyles(makeTagChipStyles);
  return (
    <View style={styles.pill}>
      <TagDot color={tag.color} />
      <Text style={styles.text} numberOfLines={1}>
        {tag.name}
      </Text>
    </View>
  );
}

/** The tags of a card: the first one, then "+2". Read out whole by the screen reader. */
export function TagSummary({ tags }: { tags: readonly Tag[] }) {
  const t = useT();
  const styles = useThemedStyles(makeTagChipStyles);
  if (tags.length === 0) return null;
  const { shown, more } = cardTags(tags);
  return (
    <View
      style={styles.summary}
      accessible
      accessibilityLabel={t('tags.cardA11y', { names: tags.map(tag => tag.name).join(', ') })}
      testID="tag-summary"
    >
      {shown.map(tag => (
        <TagChip key={tag.id} tag={tag} />
      ))}
      {more > 0 && <Text style={styles.more}>{t('tags.more', { count: more })}</Text>}
    </View>
  );
}

const makeTagChipStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      maxWidth: 160,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    text: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
      flexShrink: 1,
    },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    more: {
      ...Typography.labelSmall,
      color: theme.onSurface.variant,
    },
  });
