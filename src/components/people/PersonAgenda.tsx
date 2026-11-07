/**
 * "Avec Paul" on the page of a person: what is still planned with them (the next three, then
 * "Tout voir"), and the shortcuts to plan something more with them, the follow-up included.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { PERSON_AGENDA_PREVIEW, PersonAgendaItem, PersonAgendaKind } from '@/domain/rules/person-link-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { MessageKey, useDateLocale, useT } from '@/i18n';

const KIND_ICON: Record<PersonAgendaKind, 'notifications-outline' | 'checkbox-outline' | 'calendar-outline'> = {
  reminder: 'notifications-outline',
  task: 'checkbox-outline',
  event: 'calendar-outline',
};

const KIND_ROUTE = {
  reminder: '/reminders/[id]',
  task: '/tasks/[id]',
  event: '/events/[id]',
} as const;

const SHORTCUTS: readonly { key: string; labelKey: MessageKey; icon: 'notifications-outline' | 'checkbox-outline' | 'calendar-outline'; pathname: '/reminders/new' | '/tasks/new' | '/events/new' }[] = [
  { key: 'reminder', labelKey: 'personAgenda.addReminder', icon: 'notifications-outline', pathname: '/reminders/new' },
  { key: 'task', labelKey: 'personAgenda.addTask', icon: 'checkbox-outline', pathname: '/tasks/new' },
  { key: 'event', labelKey: 'personAgenda.addEvent', icon: 'calendar-outline', pathname: '/events/new' },
];

interface PersonAgendaProps {
  personId: string;
  firstName: string;
  items: readonly PersonAgendaItem[];
  onFollowUp: () => void;
}

export function PersonAgenda({ personId, firstName, items, onFollowUp }: PersonAgendaProps) {
  const t = useT();
  const dateLocale = useDateLocale();
  const { theme } = useTheme();
  const styles = useThemedStyles(makePersonAgendaStyles);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, PERSON_AGENDA_PREVIEW);

  const when = (item: PersonAgendaItem) => {
    if (!item.at) return t('personAgenda.noDate');
    const date = format(item.at, item.kind === 'task' ? 'EEE d MMM' : 'EEE d MMM · HH:mm', { locale: dateLocale });
    return item.overdue ? t('personAgenda.overdue', { date }) : date;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {t('personAgenda.title', { name: firstName })}
      </Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>{t('personAgenda.empty', { name: firstName })}</Text>
      ) : (
        shown.map(item => (
          <GlowCard
            key={`${item.kind}-${item.id}`}
            tone={item.overdue ? 'attention' : 'neutral'}
            size="list"
            onPress={() => router.push({ pathname: KIND_ROUTE[item.kind], params: { id: item.id } })}
            accessibilityLabel={`${item.title}, ${when(item)}`}
          >
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name={KIND_ICON[item.kind]} size={18} color={theme.primary.default} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.itemWhen, item.overdue && { color: theme.priority.HIGH }]}>{when(item)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.onSurface.disabled} />
            </View>
          </GlowCard>
        ))
      )}

      {items.length > PERSON_AGENDA_PREVIEW && (
        <TouchableOpacity
          style={styles.more}
          onPress={() => setShowAll(value => !value)}
          accessibilityRole="button"
          testID="person-agenda-more"
        >
          <Text style={styles.moreText}>
            {showAll ? t('personAgenda.less') : t('personAgenda.all', { count: items.length })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Plan something more with this person, already filled with them */}
      <View style={styles.shortcuts}>
        {SHORTCUTS.map(shortcut => (
          <TouchableOpacity
            key={shortcut.key}
            style={styles.shortcut}
            onPress={() => router.push({ pathname: shortcut.pathname, params: { personId } })}
            accessibilityRole="button"
            accessibilityLabel={t(shortcut.labelKey)}
          >
            <Ionicons name="add" size={14} color={theme.primary.default} />
            <Text style={styles.shortcutText}>{t(shortcut.labelKey)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.shortcut, styles.followUp]}
          onPress={onFollowUp}
          accessibilityRole="button"
          accessibilityLabel={t('personAgenda.followUp')}
          testID="person-follow-up"
        >
          <Ionicons name="repeat-outline" size={14} color={theme.primary.default} />
          <Text style={styles.shortcutText}>{t('personAgenda.followUp')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makePersonAgendaStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    section: {
      gap: Spacing.sm,
    },
    title: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    empty: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.glass.controlActive,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    itemTitle: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
    itemWhen: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    more: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
    },
    moreText: {
      ...Typography.labelMedium,
      color: theme.primary.default,
      fontWeight: '600',
    },
    shortcuts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    shortcut: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 36,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    followUp: {
      borderColor: theme.primary.default,
    },
    shortcutText: {
      ...Typography.labelMedium,
      color: theme.onSurface.primary,
    },
  });
