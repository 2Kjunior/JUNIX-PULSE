/**
 * Where each kind of new item opens, with the day and hour the user came from (a slot of the
 * Planning). Quick capture reads one sentence and picks the kind itself.
 */

import { format } from 'date-fns';

export type NewItemKind = 'capture' | 'reminder' | 'task' | 'event';

export interface NewItemRoute {
  pathname: '/capture' | '/reminders/new' | '/tasks/new' | '/events/new';
  params: Record<string, string>;
}

const PATHS: Record<NewItemKind, NewItemRoute['pathname']> = {
  capture: '/capture',
  reminder: '/reminders/new',
  task: '/tasks/new',
  event: '/events/new',
};

export function newItemRoute(kind: NewItemKind, date?: Date | null, hour?: number | null): NewItemRoute {
  const params: Record<string, string> = {};
  if (kind !== 'capture' && date) params.defaultDate = format(date, 'yyyy-MM-dd');
  // A task takes a day, never an hour
  if ((kind === 'reminder' || kind === 'event') && date && hour !== undefined && hour !== null) {
    params.defaultHour = String(hour);
  }
  return { pathname: PATHS[kind], params };
}
