/**
 * The "To do" tab (study 001, 12.10 n° 4 and section 14; sheet 015): reminders and tasks
 * together, filtered at the top (All · With an alert · Without an alert), the coloured tags
 * below, and one list sorted by moment. The old Reminders list stays for the links to it.
 */

import { Ionicons } from '@expo/vector-icons';
import { addHours } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { TagFilterRow } from '@/components/tags/TagFilterRow';
import { TodoRow } from '@/components/todo/TodoRow';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { HeaderIconButton, SettingsButton } from '@/components/ui/HeaderIconButton';
import { TourInfoButton } from '@/features/mascot/TourInfoButton';
import { TourTarget, tourTargetIf } from '@/features/mascot/TourTarget';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { SwipeableItem, makeStandardRightActions, type SwipeAction } from '@/components/ui/SwipeableItem';
import { openFocusForTask } from '@/features/focus/open-focus';
import { useGestureTip } from '@/features/mascot/GestureTip';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Spacing, TAB_BAR_TOTAL_HEIGHT, Typography } from '@/constants/theme';
import type { Reminder, Tag, Task } from '@/domain/entities';
import { tagsOf } from '@/domain/rules/tag-rules';
import {
  entryFromReminder,
  entryFromTask,
  filterFromParam,
  todoCounts,
  todoSections,
  type TodoEntry,
  type TodoFilter,
  type TodoSectionId,
} from '@/domain/rules/todo-list-rules';
import { useTheme } from '@/hooks/use-theme';
import { type MessageKey, useT } from '@/i18n';
import { ReminderRepository } from '@/repositories/reminder-repository';
import { TagRepository } from '@/repositories/tag-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { useAppStore } from '@/store/app-store';
import { completeReminder, deleteReminder, snoozeReminder } from '@/use-cases/reminder-use-cases';
import { TaskUseCases } from '@/use-cases/task-use-cases';

const SECTION_LOOK: Readonly<Record<TodoSectionId, { icon: keyof typeof Ionicons.glyphMap; labelKey: MessageKey }>> = {
  overdue: { icon: 'alert-circle-outline', labelKey: 'todoTab.section.overdue' },
  today: { icon: 'today-outline', labelKey: 'todoTab.section.today' },
  tomorrow: { icon: 'arrow-forward-outline', labelKey: 'todoTab.section.tomorrow' },
  later: { icon: 'calendar-outline', labelKey: 'todoTab.section.later' },
  noDate: { icon: 'file-tray-outline', labelKey: 'todoTab.section.noDate' },
  done: { icon: 'checkmark-done-outline', labelKey: 'todoTab.section.done' },
};

type ScreenState = 'loading' | 'content' | 'error';

export function TodoTabScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const accent = itemFamilyColor(palette, 'todo');
  const params = useLocalSearchParams<{ filter?: string }>();

  const [state, setState] = useState<ScreenState>('loading');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TodoFilter>(() => filterFromParam(params.filter));
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, string[]>>({});
  const [reminderTags, setReminderTags] = useState<Record<string, string[]>>({});

  // A link from the home screen asks for a filter ("Rappels" → With an alert)
  useEffect(() => {
    if (params.filter) setFilter(filterFromParam(params.filter));
  }, [params.filter]);

  const load = useCallback(async () => {
    try {
      const [allTasks, allReminders, allTags, taskLinks, reminderLinks] = await Promise.all([
        TaskRepository.findAll(),
        ReminderRepository.findAll(),
        // The tags never keep the list from showing
        TagRepository.findAll().catch(() => [] as Tag[]),
        TagRepository.findLinks('task').catch(() => ({})),
        TagRepository.findLinks('reminder').catch(() => ({})),
      ]);
      setTasks(allTasks);
      setReminders(allReminders.filter(reminder => reminder.status !== 'DELETED' && !reminder.deletedAt));
      setTags(allTags);
      setTaskTags(taskLinks);
      setReminderTags(reminderLinks);
      // A tag deleted meanwhile no longer filters anything
      setTagFilter(current => (current && allTags.some(tag => tag.id === current) ? current : null));
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      setState('error');
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const entries: TodoEntry[] = [
    ...tasks.map(task => entryFromTask(task, taskTags[task.id] ?? [])),
    ...reminders.map(reminder => entryFromReminder(reminder, reminderTags[reminder.id] ?? [])),
  ];
  const sections = todoSections(entries, filter, new Date(), tagFilter);
  const counts = todoCounts(entries);
  // The swipe tip (sheet 024): once, when two cards or more show; the first one opens by itself
  const shownCount = sections.reduce((sum, section) => sum + section.entries.length, 0);
  const swipeTip = useGestureTip('swipe', shownCount);
  const firstShown = sections[0]?.entries[0];
  const firstKey = firstShown ? `${firstShown.kind}-${firstShown.id}` : null;

  const openEntry = (entry: TodoEntry) => router.push(entry.kind === 'task' ? `/tasks/${entry.id}` : `/reminders/${entry.id}`);

  const toggle = async (entry: TodoEntry) => {
    try {
      if (entry.kind === 'task') {
        const status = await TaskUseCases.toggleComplete(entry.id);
        showSnackbar(t(status === 'COMPLETED' ? 'tasks.completed' : 'tasks.reopened'));
      } else {
        const reminder = reminders.find(item => item.id === entry.id);
        if (!reminder || entry.done) return;
        await completeReminder(reminder);
        showSnackbar(t('reminders.completed'));
      }
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('common.error'));
    }
    void load();
  };

  const remove = async (entry: TodoEntry) => {
    try {
      const result =
        entry.kind === 'task'
          ? await TaskUseCases.deleteTask(entry.id)
          : await deleteReminder(reminders.find(item => item.id === entry.id) as Reminder);
      void load();
      showSnackbar(t(entry.kind === 'task' ? 'tasks.deleted' : 'reminders.deleted'), {
        actionLabel: t('common.undo30'),
        onAction: async () => {
          await result.undo();
          void load();
        },
        durationMs: 30_000,
      });
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const later = async (entry: TodoEntry) => {
    const reminder = reminders.find(item => item.id === entry.id);
    if (!reminder) return;
    await snoozeReminder(reminder, { kind: 'custom', until: addHours(new Date(), 2) });
    showSnackbar(t('reminders.snoozed'));
    void load();
  };

  const rightActionsOf = (entry: TodoEntry): SwipeAction[] => [
    // A task not done: Focus, in its "⋯" and its swipe (sheet 033)
    ...(entry.kind === 'task' && !entry.done
      ? [{ key: 'focus', icon: 'timer-outline' as const, label: t('todoTab.focus'), color: palette.primary.default, onPress: () => openFocusForTask(entry) }]
      : []),
    ...(entry.kind === 'reminder' && !entry.done
      ? [{ key: 'later', icon: 'time-outline' as const, label: t('todoTab.later'), color: palette.tertiary.default, onPress: () => void later(entry) }]
      : []),
    ...makeStandardRightActions({
      palette,
      onDelete: () => void remove(entry),
      onEdit: () => openEntry(entry),
      deleteLabel: t('common.delete'),
      editLabel: t('common.edit'),
    }),
  ];

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const addPath = filter === 'alert' ? '/tasks/new?alert=1' : '/tasks/new';

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} testID="todo-tab">
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...Typography.headlineMedium, color: palette.onSurface.primary }} numberOfLines={1}>
            {t('tab.todo')}
          </Text>
          {/* ⓘ next to the subtitle: the tour of this tab again (sheet 045) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant, flexShrink: 1 }} numberOfLines={1}>
              {t('todoTab.subtitle', { count: counts.all })}
            </Text>
            <TourInfoButton tour="todo" />
          </View>
        </View>
        <HeaderIconButton
          icon="timer-outline"
          label={t('todoTab.focusA11y')}
          onPress={() => router.push('/focus' as never)}
          color={palette.tertiary.default}
        />
        <SettingsButton />
      </View>

      <TourTarget id="todoFilter">
      <PillTopBar<TodoFilter>
        tabs={[
          { key: 'all', label: t('todoTab.all'), count: counts.all },
          // No icons here: on a phone, the words need the room (the bell is on the cards)
          { key: 'alert', label: t('todoTab.alert'), count: counts.alert },
          { key: 'noAlert', label: t('todoTab.noAlert'), count: counts.noAlert },
        ]}
        activeTab={filter}
        onTabChange={setFilter}
      />
      </TourTarget>
      <TagFilterRow tags={tags} selectedId={tagFilter} onSelect={setTagFilter} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: TAB_BAR_TOTAL_HEIGHT + insets.bottom + 96, gap: Spacing.sm }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 ? (
          tagFilter ? (
            <EmptyState iconName="pricetag-outline" title={t('tags.filterEmpty')} />
          ) : (
            <EmptyState
              iconName="checkbox-outline"
              title={t(`todoTab.empty.${filter}` as MessageKey)}
              description={t('todoTab.emptyDesc')}
              actionLabel={t('todoTab.add')}
              onAction={() => router.push(addPath as never)}
            />
          )
        ) : (
          sections.map(section => (
            <View key={section.id} style={{ gap: Spacing.sm }} testID={`todo-section-${section.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md }}>
                <Ionicons
                  name={SECTION_LOOK[section.id].icon}
                  size={16}
                  color={section.id === 'overdue' ? palette.error.default : accent}
                />
                <Text style={{ ...Typography.titleMedium, color: palette.onSurface.primary }}>{t(SECTION_LOOK[section.id].labelKey)}</Text>
                <Text style={{ ...Typography.labelMedium, color: palette.onSurface.variant }}>{section.entries.length}</Text>
              </View>
              {section.entries.map(entry => tourTargetIf(`${entry.kind}-${entry.id}` === firstKey, 'todoCard', (
                <SwipeableItem
                  key={`${entry.kind}-${entry.id}`}
                  peek={swipeTip.peeking && `${entry.kind}-${entry.id}` === firstKey}
                  rightActions={rightActionsOf(entry)}
                  leftActions={
                    entry.done
                      ? []
                      : [{ key: 'done', icon: 'checkmark', label: t('todoTab.done'), color: accent, onPress: () => void toggle(entry) }]
                  }
                >
                  <TodoRow
                    entry={entry}
                    tags={tagsOf(entry.tagIds, tags)}
                    onPress={() => openEntry(entry)}
                    onToggle={() => void toggle(entry)}
                    menuTour={`${entry.kind}-${entry.id}` === firstKey}
                  />
                </SwipeableItem>
              )))}
            </View>
          ))
        )}
      </ScrollView>

      <GlassFloatingActionButton
        label={t('itemForm.save')}
        accessibilityLabel={t('todoTab.add')}
        icon="add"
        onPress={() => router.push(addPath as never)}
      />
      {swipeTip.element}
    </View>
  );
}
