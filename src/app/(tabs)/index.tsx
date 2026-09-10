/**
 * Écran Aujourd'hui — Centre opérationnel de Junix Pulse.
 * Agrège rappels, tâches, événements et personnes du jour.
 *
 * Utilise useFocusEffect pour mettre à jour instantanément les statistiques
 * et les compteurs à chaque fois que l'écran devient actif.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import { ReminderRepository } from '@/repositories/reminder-repository';
import { TaskRepository } from '@/repositories/task-repository';
import { SettingsRepository } from '@/repositories/settings-repository';
import { Reminder, Task } from '@/domain/entities';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
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

  // Rechargement automatique à chaque fois que l'écran prend le focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
          onPress={() => router.push('/settings')}
          accessibilityLabel="Paramètres"
        >
          <Ionicons name="settings-outline" size={22} color={OnSurface.variant} />
        </TouchableOpacity>
      </View>

      {/* Résumé rapide interactif */}
      <View style={styles.summaryRow}>
        <SummaryChip
          count={upcomingReminders.length}
          label="rappels"
          color={Primary.default}
          icon="notifications-outline"
          onPress={() => router.push('/reminders')}
        />
        <SummaryChip
          count={tasks.length}
          label="tâches"
          color={Tertiary.default}
          icon="checkmark-circle-outline"
          onPress={() => router.push('/(tabs)/tasks')}
        />
        {missedReminders.length > 0 && (
          <SummaryChip
            count={missedReminders.length}
            label="manqués"
            color="#FFB4AB"
            icon="alert-circle-outline"
            onPress={() => router.push('/reminders')}
          />
        )}
      </View>

      {/* Rappels manqués — priorité d'affichage */}
      {missedReminders.length > 0 && (
        <Section
          title="À rattraper"
          icon="alert-circle"
          iconColor="#FFB4AB"
          action={{ label: 'Voir tout', onPress: () => router.push('/reminders') }}
        >
          {missedReminders.map(r => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </Section>
      )}

      {/* Rappels du jour */}
      <Section
        title="Rappels"
        icon="notifications-outline"
        iconColor={Primary.default}
        action={{ label: 'Voir tout', onPress: () => router.push('/reminders') }}
      >
        {upcomingReminders.length > 0 ? (
          upcomingReminders.map(r => <ReminderCard key={r.id} reminder={r} />)
        ) : (
          <EmptySection
            text="Aucun rappel pour aujourd'hui"
            action="Créer un rappel"
            onAction={() => router.push('/reminders/new')}
          />
        )}
      </Section>

      {/* Tâches du jour */}
      <Section
        title="Tâches planifiées"
        icon="checkmark-circle-outline"
        iconColor={Tertiary.default}
        action={{ label: '+ Nouvelle', onPress: () => router.push('/tasks/new') }}
      >
        {tasks.length > 0 ? (
          tasks.map(t => <TaskCard key={t.id} task={t} />)
        ) : (
          <EmptySection
            text="Aucune tâche pour aujourd'hui"
            action="Voir l'Inbox"
            onAction={() => router.push('/(tabs)/tasks')}
          />
        )}
      </Section>
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
  onPress,
}: {
  count: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: color + '30' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </TouchableOpacity>
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
          <Ionicons name={icon} size={18} color={iconColor} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && (
          <TouchableOpacity onPress={action.onPress}>
            <Text style={styles.sectionAction}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function EmptySection({
  text,
  action,
  onAction,
}: {
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptyText}>{text}</Text>
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.emptyAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const time = format(new Date(reminder.scheduledAt), 'HH:mm');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/reminders/${reminder.id}` as any)}
    >
      <View style={styles.cardTime}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {reminder.title}
        </Text>
        {reminder.notes && (
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {reminder.notes}
          </Text>
        )}
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
    >
      <Ionicons
        name={task.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={task.status === 'COMPLETED' ? Tertiary.default : OnSurface.disabled}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {task.title}
        </Text>
        {task.estimatedMinutes && (
          <Text style={styles.cardSubtitle}>⏱️ {task.estimatedMinutes} min</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={OnSurface.disabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { ...Typography.headlineLarge, color: OnSurface.primary },
  date: { ...Typography.bodyMedium, color: OnSurface.variant, textTransform: 'capitalize' },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    borderWidth: 1,
  },
  chipCount: { ...Typography.titleMedium },
  chipLabel: { ...Typography.bodySmall, color: OnSurface.variant },
  section: { gap: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { ...Typography.titleLarge, color: OnSurface.primary },
  sectionAction: { ...Typography.labelMedium, color: Primary.default },
  sectionContent: { gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardTime: {
    backgroundColor: Surface.high,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  timeText: { ...Typography.labelMedium, color: Primary.default },
  cardBody: { flex: 1 },
  cardTitle: { ...Typography.bodyMedium, color: OnSurface.primary },
  cardSubtitle: { ...Typography.bodySmall, color: OnSurface.variant },
  emptySection: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.bodyMedium, color: OnSurface.variant },
  emptyAction: { ...Typography.labelMedium, color: Primary.default },
});
