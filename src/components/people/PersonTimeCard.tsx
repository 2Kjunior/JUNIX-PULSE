/**
 * PersonTimeCard: the time where a person lives and the best moment to call them.
 *
 * It tells what time it is there, whether they can be called now, and otherwise when they can
 * next be, in their time and in the time of the user. The same card edits the timezone and the
 * window, since the person screen has no other way to change a person.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PersonTimeFields, PersonTimeValue } from '@/components/people/PersonTimeFields';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { timezoneLabel } from '@/constants/timezones';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { Person } from '@/domain/entities';
import { MomentLabel, personTimeState, WEEKDAY_NAMES_FR } from '@/domain/rules/person-availability-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { PersonUseCases } from '@/use-cases/person-use-cases';

const REFRESH_MS = 30_000;

interface PersonTimeCardProps {
  person: Person;
  userTimezone: string;
  /** Called after the card saved a change, so the screen reads the person again. */
  onSaved: () => void;
  onError: (message: string) => void;
}

function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES_FR[weekday - 1] ?? '';
}

function describeMoment(moment: MomentLabel): string {
  return `${weekdayName(moment.weekday)} ${moment.time}`;
}

export function PersonTimeCard({ person, userTimezone, onSaved, onError }: PersonTimeCardProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makePersonTimeCardStyles);
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PersonTimeValue>({});
  const [saving, setSaving] = useState(false);

  // The clock there moves: read it again every half minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const startEditing = () => {
    setDraft({ timezone: person.timezone, availability: person.availability });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await PersonUseCases.updatePerson({
        id: person.id,
        timezone: draft.timezone ?? null,
        availability: draft.availability ?? null,
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <GlowCard tone="neutral">
        <View style={styles.inner}>
          <PersonTimeFields value={draft} onChange={setDraft} />
          <View style={styles.actions}>
            <Button label="Annuler" onPress={() => setEditing(false)} variant="secondary" size="md" />
            <Button label="Enregistrer" onPress={save} variant="primary" size="md" loading={saving} />
          </View>
        </View>
      </GlowCard>
    );
  }

  if (!person.timezone) {
    return (
      <TouchableOpacity
        onPress={startEditing}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Ajouter le fuseau horaire et les heures d'appel"
        testID="person-time-add"
      >
        <GlowCard tone="neutral">
          <View style={styles.addRow}>
            <Ionicons name="earth-outline" size={20} color={palette.primary.default} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addTitle}>Connaître l’heure chez cette personne</Text>
              <Text style={styles.addSub}>Ajoutez sa ville et les heures où l’appeler</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
          </View>
        </GlowCard>
      </TouchableOpacity>
    );
  }

  const state = personTimeState({ timezone: person.timezone, availability: person.availability }, now, userTimezone);

  return (
    <GlowCard tone="neutral">
      <View style={styles.inner} testID="person-time-card">
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.place}>{`Chez ${person.displayName.split(' ')[0]} · ${timezoneLabel(person.timezone)}`}</Text>
            <Text style={styles.clock}>{state.localTime}</Text>
            <Text style={styles.day}>{weekdayName(state.weekday)}</Text>
          </View>
          <TouchableOpacity
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel="Modifier le fuseau et les heures d'appel"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={palette.primary.default} />
          </TouchableOpacity>
        </View>

        {state.kind === 'available' && (
          <View style={[styles.status, styles.statusOk]}>
            <Ionicons name="call-outline" size={16} color={palette.success.default} />
            <Text style={[styles.statusText, { color: palette.success.default }]}>
              {`Disponible maintenant, jusqu’à ${state.untilTime} chez elle`}
            </Text>
          </View>
        )}

        {state.kind === 'unavailable' && (
          <View style={[styles.status, styles.statusLater]}>
            <Ionicons name="moon-outline" size={16} color={palette.priority.HIGH} />
            <Text style={[styles.statusText, { color: palette.priority.HIGH }]}>
              {state.next
                ? `Pas disponible. Prochain créneau : ${describeMoment(state.next.there)} chez elle, soit ${
                    state.next.sameDay ? state.next.here.time : describeMoment(state.next.here)
                  } chez vous`
                : 'Pas disponible pour le moment'}
            </Text>
          </View>
        )}
      </View>
    </GlowCard>
  );
}

const makePersonTimeCardStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    inner: { gap: Spacing.md },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    place: { ...Typography.labelMedium, color: theme.onSurface.variant },
    clock: { ...Typography.headlineMedium, color: theme.onSurface.primary },
    day: { ...Typography.bodyMedium, color: theme.onSurface.variant },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    statusOk: { backgroundColor: theme.surface.container },
    statusLater: { backgroundColor: theme.surface.container },
    statusText: { ...Typography.labelMedium, flex: 1 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    addTitle: { ...Typography.bodyMedium, color: theme.onSurface.primary },
    addSub: { ...Typography.labelSmall, color: theme.onSurface.variant },
  });
