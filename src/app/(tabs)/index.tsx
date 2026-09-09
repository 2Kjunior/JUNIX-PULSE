/**
 * Écran Aujourd'hui — Centre opérationnel de Junix Pulse.
 * Agrège rappels, tâches, événements et personnes du jour.
 *
 * V1 : structure et états de base. L'agrégation complète est construite à l'Étape 9.
 * Aujourd'hui est construit progressivement pour éviter un écran vide jusqu'à l'étape 9.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { Reminder } from '@/domain/entities';
import { Task } from '@/domain/entities';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
  Priority as PriorityColors,
} from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/feedback/States';

type ScreenState = 'loading' | 'content' | 'error';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>('loading');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const greeting = getGreeting(today.getHours());

  const load = useCallback(async () => {
    try {
      const [rems, tks, settings] = await Promise.all([
        ReminderRepository.findForDate(todayStr),
        TaskRepository.findForDate(todayStr),
        SettingsRepository.get(),
      ]);
      setReminders(rems.filter(r => r.status !== 'DELETED' && r.status !== 'COMPLETED'));
      setTasks(tks);
      setDisplayName(settings.displayName ?? '');
      setState('content');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setState('error');
    }
  }, [todayStr]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={error} onRetry={load} />;

  const dateLabel = format(today, 'EEEE d MMMM', { locale: fr });
  const upcomingReminders = reminders.filter(
    r => r.status === 'UPCOMING' || r.status === 'TRIGGERED' || r.status === 'SNOOZED'
  );
  const missedReminders = reminders.filter(r => r.status === 'MISSED');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Primary.default}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting}{displayName ? `, ${displayName}` : ''}
          </Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings/index')}
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="settings-outline" size={22} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* Résumé rapide */}
      <View style={styles.summaryRow}>
        <SummaryChip
          count={upcomingReminders.length}
          label="rappels"
          color={Primary.default}
          icon="notifications-outline"
        />
        <SummaryChip
          count={tasks.length}
          label="tâches"
          color={Tertiary.default}
          icon="checkmark-circle-outline"
        />
        {missedReminders.length > 0 && (
          <SummaryChip
            count={missedReminders.length}
            label="manqués"
            color="#FFB4AB"
            icon="alert-circle-outline"
          />
        )}
      </View>

      {/* Rappels manqués — priorité d'affichage */}
      {missedReminders.length > 0 && (
        <Section
          title="À rattraper"
          icon="alert-circle"
          iconColor="#FFB4AB"
          action={{ label: 'Voir tout', onPress: () => router.push('/reminders/new' as any) }}
        >
          {missedReminders.map(r => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </Section>
      )}

      {/* Rappels du jour */}
      {upcomingReminders.length > 0 ? (
        <Section
          title="Rappels"
          icon="notifications-outline"
          iconColor={Primary.default}
          action={{ label: '+ Nouveau', onPress: () => router.push('/reminders/new') }}
        >
          {upcomingReminders.map(r => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </Section>
      ) : (
        <Section
          title="Rappels"
          icon="notifications-outline"
          iconColor={Primary.default}
          action={{ label: '+ Nouveau', onPress: () => router.push('/reminders/new') }}
        >
          <EmptySection
            text="Aucun rappel pour aujourd'hui"
            action="Créer un rappel"
            onAction={() => router.push('/reminders/new')}
          />
        </Section>
      )}

      {/* Tâches du jour */}
      {tasks.length > 0 ? (
        <Section
          title="Tâches planifiées"
          icon="checkmark-circle-outline"
          iconColor={Tertiary.default}
          action={{ label: '+ Nouvelle', onPress: () => router.push('/tasks/new') }}
        >
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} />
          ))}
        </Section>
      ) : (
        <Section
          title="Tâches planifiées"
          icon="checkmark-circle-outline"
          iconColor={Tertiary.default}
          action={{ label: '+ Nouvelle', onPress: () => router.push('/tasks/new') }}
        >
          <EmptySection
            text="Aucune tâche pour aujourd'hui"
            action="Voir l'Inbox"
            onAction={() => router.push('/(tabs)/tasks')}
          />
        </Section>
      )}
    </ScrollView>
  );
}

// ─── Composants locaux ─────────────────────────────────────────────────────────

function getGreeting(hour: number): string {
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function SummaryChip({
  count,
  label,
  color,
  icon,
}: {
  count: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.chip, { borderColor: color + '30' }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  icon,
  iconColor,
  action,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon} size={16} color={iconColor} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && (
          <TouchableOpacity onPress={action.onPress}>
            <Text style={styles.sectionAction}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function EmptySection({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptySectionText}>{text}</Text>
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.emptySectionAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const priorityColor = PriorityColors[reminder.priority];
  const timeStr = format(new Date(reminder.scheduledAt), 'HH:mm');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/reminders/${reminder.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={[styles.cardPriority, { backgroundColor: priorityColor + '30' }]}>
        <View style={[styles.cardPriorityDot, { backgroundColor: priorityColor }]} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{reminder.title}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={12} color={OnSurface.variant} />
          <Text style={styles.cardMetaText}>{timeStr}</Text>
          {reminder.status === 'MISSED' && (
            <View style={styles.missedBadge}>
              <Text style={styles.missedBadgeText}>Manqué</Text>
            </View>
          )}
          {reminder.status === 'SNOOZED' && (
            <View style={styles.snoozedBadge}>
              <Text style={styles.snoozedBadgeText}>Reporté</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </TouchableOpacity>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tasks/${task.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.taskCheck}>
        <Ionicons
          name={task.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={task.status === 'COMPLETED' ? Tertiary.default : OnSurface.disabled}
        />
      </View>
      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, task.status === 'COMPLETED' && styles.cardTitleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.estimatedMinutes && (
          <View style={styles.cardMeta}>
            <Ionicons name="hourglass-outline" size={12} color={OnSurface.variant} />
            <Text style={styles.cardMetaText}>{task.estimatedMinutes} min</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: { paddingHorizontal: Spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  greeting: { ...Typography.headlineLarge, color: OnSurface.primary },
  date: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    marginTop: Spacing.xs,
    textTransform: 'capitalize',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Surface.container,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Surface.container,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
  },
  chipCount: { ...Typography.labelMedium, fontWeight: '700' },
  chipLabel: { ...Typography.labelSmall, color: OnSurface.variant },

  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sectionTitle: { ...Typography.titleMedium, color: OnSurface.primary },
  sectionAction: { ...Typography.labelMedium, color: Primary.default },

  emptySection: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptySectionText: { ...Typography.bodySmall, color: OnSurface.disabled },
  emptySectionAction: { ...Typography.labelMedium, color: Primary.default },

  card: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardPriority: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPriorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskCheck: { paddingHorizontal: Spacing.xs },
  cardBody: { flex: 1 },
  cardTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  cardTitleDone: { textDecorationLine: 'line-through', color: OnSurface.disabled },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  cardMetaText: { ...Typography.labelSmall, color: OnSurface.variant },

  missedBadge: {
    backgroundColor: '#93000A',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  missedBadgeText: { ...Typography.labelSmall, color: '#FFB4AB', fontSize: 9 },
  snoozedBadge: {
    backgroundColor: 'rgba(123, 208, 255, 0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  snoozedBadgeText: { ...Typography.labelSmall, color: Tertiary.default, fontSize: 9 },
});
