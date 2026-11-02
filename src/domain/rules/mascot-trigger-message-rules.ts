/**
 * Pure rules turning a due time trigger into the catalogue message the mascot says.
 * A trigger that has nothing worth saying (an empty day, a block with no message) gives null,
 * so the mascot stays quiet rather than announcing "0 tâche".
 */

import type { AppLanguage } from './language-rules';
import { formatSpokenTime, MascotSuggestionMessage } from './mascot-suggestion-rules';
import { MascotTimeTrigger } from './mascot-time-rules';

export interface TriggerEventInfo {
  title: string;
  startAt: number; // Epoch milliseconds
  location?: string;
}

export interface TriggerMessageContext {
  remindersToday: number;
  tasksTotal: number;
  tasksDone: number;
  /** Events by id, for the triggers that name one. */
  events: Readonly<Record<string, TriggerEventInfo>>;
}

export function triggerToMascotMessage(
  trigger: MascotTimeTrigger,
  context: TriggerMessageContext,
  language: AppLanguage = 'fr'
): MascotSuggestionMessage | null {
  if (!trigger.hasMessage) return null;

  const event = trigger.subjectId ? context.events[trigger.subjectId] : undefined;

  switch (trigger.kind) {
    case 'MORNING_BRIEFING':
      if (context.remindersToday === 0 && context.tasksTotal === 0) return null;
      return { id: 'MORNING_BRIEFING', params: { reminders: context.remindersToday, count: context.tasksTotal } };

    case 'EVENING_REVIEW':
      if (context.tasksTotal === 0) return null;
      return { id: 'EVENING_REVIEW', params: { done: context.tasksDone, total: context.tasksTotal } };

    case 'EVENT_IN_60':
      if (!event) return null;
      return { id: 'EVENT_IN_60', params: { title: event.title, time: formatSpokenTime(new Date(event.startAt), language) } };

    case 'EVENT_IN_15':
      if (!event) return null;
      return { id: 'EVENT_IN_15', params: { title: event.title } };

    case 'EVENT_DEPARTURE':
      if (!event?.location) return null;
      return { id: 'EVENT_DEPARTURE', params: { place: event.location } };

    case 'EVENT_START':
      if (!event) return null;
      return { id: 'EVENT_START', params: { title: event.title } };

    case 'PLANNING_BLOCK_START':
      // Planning blocks are not shown on the home screen yet
      return null;
  }
}
