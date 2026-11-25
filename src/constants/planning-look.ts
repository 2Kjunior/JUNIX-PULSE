/**
 * How each thing looks in the Planning (sheet 027): the GlowCard tone, the colour of its badge and
 * its icon, taken from the earlier Day view and kept in one place for the Day and Month views.
 *  - a moment: tone "info", the colour and icon of its type (sheet 023), blue for "Autre";
 *  - a reminder: tone "primary", violet; "urgent" and red when it is urgent;
 *  - a task: tone "success", green;
 *  - the phone's own calendar: no glow, green of the agenda.
 */
import type { Ionicons } from '@expo/vector-icons';

import type { GlowTone } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { momentKindColor, momentKindLook } from '@/constants/moment-kinds';
import type { MomentKind, ReminderPriority } from '@/domain/entities';
import type { MessageKey } from '@/i18n';

export type PlanningKind = 'event' | 'reminder' | 'task' | 'device';

export interface PlanningLook {
  tone: GlowTone;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** The badge, in capitals on the card. */
  labelKey: MessageKey;
}

/** The blue of a moment without a type, as on the earlier Day view. */
export function eventAccent(palette: Pick<ThemePalette, 'mode'>): string {
  return palette.mode === 'light' ? '#0284C7' : '#38BDF8';
}

/** The green of the tasks, as on the earlier Day view. */
export function taskAccent(palette: Pick<ThemePalette, 'mode'>): string {
  return palette.mode === 'light' ? '#059669' : '#34D399';
}

export function planningLook(
  palette: ThemePalette,
  kind: PlanningKind,
  details: { momentKind?: MomentKind; priority?: ReminderPriority } = {}
): PlanningLook {
  if (kind === 'event') {
    const typed = !!details.momentKind && details.momentKind !== 'other';
    return {
      tone: 'info',
      color: typed ? momentKindColor(palette, details.momentKind) : eventAccent(palette),
      icon: typed ? momentKindLook(details.momentKind).icon : 'calendar',
      labelKey: typed ? momentKindLook(details.momentKind).labelKey : 'timetable.eventBadge',
    };
  }
  if (kind === 'reminder') {
    const urgent = details.priority === 'URGENT';
    return {
      tone: urgent ? 'urgent' : 'primary',
      color: urgent ? palette.error.default : palette.primary.default,
      icon: 'notifications',
      labelKey: urgent ? 'timetable.reminderUrgent' : 'timetable.reminderBadge',
    };
  }
  if (kind === 'task') {
    return { tone: 'success', color: taskAccent(palette), icon: 'checkbox-outline', labelKey: 'planning.taskBadge' };
  }
  return { tone: 'neutral', color: palette.success.default, icon: 'phone-portrait-outline', labelKey: 'planning.deviceBadge' };
}
