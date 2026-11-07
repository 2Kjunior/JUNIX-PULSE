/**
 * Phase 1, the person at the centre: which actions count as an exchange (once only), what is
 * planned with someone, the follow-up, the picker order and search, the quick capture.
 */

import { parseQuickCapture } from '@/domain/rules/capture-rules';
import {
  followUpDate,
  interactionTypeForAction,
  meetingWindow,
  MEETING_LOOKBACK_DAYS,
  personAgenda,
} from '@/domain/rules/person-link-rules';
import { foldText, pickerPersons } from '@/domain/rules/person-picker-rules';
import { recordLinkedInteraction } from '@/use-cases/person-use-cases';
import { completeReminder } from '@/use-cases/reminder-use-cases';
import { EventUseCases } from '@/use-cases/event-use-cases';

const mockInteractions: { personId: string; type: string; reminderId?: string; eventId?: string }[] = [];
const mockPersons = new Set(['paul', 'lea']);
const mockEnded: { event: { id: string; startAt: string }; personIds: string[] }[] = [];
// The people of each reminder, as the link table holds them
const mockReminderPeople: Record<string, string[]> = { r1: ['paul'], r2: ['lea'], r3: [] };

jest.mock('@/repositories/person-repository', () => ({
  PersonRepository: {
    findById: jest.fn(async (id: string) => (mockPersons.has(id) ? { id, displayName: id } : null)),
    hasInteractionFrom: jest.fn(async (personId: string, source: { reminderId?: string; eventId?: string }) =>
      mockInteractions.some(
        item =>
          item.personId === personId &&
          ((source.reminderId && item.reminderId === source.reminderId) || (source.eventId && item.eventId === source.eventId))
      )
    ),
    createInteraction: jest.fn(async (interaction: { personId: string; type: string; reminderId?: string; eventId?: string }) => {
      mockInteractions.push(interaction);
    }),
  },
}));
jest.mock('@/repositories/reminder-repository', () => ({
  ReminderRepository: {
    update: jest.fn(async () => {}),
    findRecurrenceRule: jest.fn(async () => null),
    findPersonIds: jest.fn(async (id: string) => mockReminderPeople[id] ?? []),
  },
}));
jest.mock('@/repositories/event-repository', () => ({
  EventRepository: { findEndedWithPersons: jest.fn(async () => mockEnded) },
}));
jest.mock('@/services/reminder-notification-service', () => ({ syncReminderNotifications: jest.fn(async () => {}) }));
jest.mock('@/services/mascot/mascot-event-bus', () => ({ emitMascotEvent: jest.fn() }));

const reminder = (actionType: string, personId?: string, id = 'r1') =>
  ({
    id,
    title: 'Appeler',
    scheduledAt: '2026-11-06T10:00:00.000Z',
    timezone: 'UTC',
    priority: 'NORMAL',
    status: 'TRIGGERED',
    actionType,
    personId,
    createdAt: '',
    updatedAt: '',
  }) as never;

beforeEach(() => {
  mockInteractions.length = 0;
  mockEnded.length = 0;
});

describe('what counts as an exchange', () => {
  it('calling, writing, mailing or meeting does; anything else does not', () => {
    expect(interactionTypeForAction('CALL')).toBe('CALL');
    expect(interactionTypeForAction('MESSAGE')).toBe('SMS');
    expect(interactionTypeForAction('EMAIL')).toBe('EMAIL');
    expect(interactionTypeForAction('MEET')).toBe('IN_PERSON');
    expect(interactionTypeForAction('TASK')).toBeNull();
    expect(interactionTypeForAction('NONE')).toBeNull();
  });

  it('a reminder done with a call counts once, a reminder without action does not', async () => {
    await completeReminder(reminder('CALL', 'paul'));
    await completeReminder(reminder('CALL', 'paul'));
    await completeReminder(reminder('NONE', 'lea', 'r2'));
    await completeReminder(reminder('CALL', undefined, 'r3'));
    expect(mockInteractions).toEqual([expect.objectContaining({ personId: 'paul', type: 'CALL', reminderId: 'r1' })]);
  });

  it('a call with several people counts as an exchange with each of them', async () => {
    mockReminderPeople.r4 = ['paul', 'lea'];
    await completeReminder(reminder('CALL', 'paul', 'r4'));
    expect(mockInteractions.map(item => [item.personId, item.type, item.reminderId])).toEqual([
      ['paul', 'CALL', 'r4'],
      ['lea', 'CALL', 'r4'],
    ]);
  });

  it('never counts for a person that no longer exists', async () => {
    expect(await recordLinkedInteraction({ personId: 'ghost', type: 'CALL', reminderId: 'r9' })).toBe(false);
    expect(mockInteractions).toHaveLength(0);
  });

  it('an ended event counts as a meeting with each of its people, once', async () => {
    mockEnded.push({ event: { id: 'e1', startAt: '2026-11-05T18:00:00.000Z' }, personIds: ['paul', 'lea'] });
    expect(await EventUseCases.recordPastMeetings()).toBe(2);
    expect(await EventUseCases.recordPastMeetings()).toBe(0);
    expect(mockInteractions.map(item => [item.personId, item.type, item.eventId])).toEqual([
      ['paul', 'IN_PERSON', 'e1'],
      ['lea', 'IN_PERSON', 'e1'],
    ]);
  });

  it('looks back two weeks for meetings', () => {
    const now = new Date(2026, 10, 20, 12);
    const { from, to } = meetingWindow(now);
    expect(to).toBe(now);
    expect(Math.round((now.getTime() - from.getTime()) / 86_400_000)).toBe(MEETING_LOOKBACK_DAYS);
  });
});

describe('what is planned with a person', () => {
  const now = new Date(2026, 10, 6, 15, 0);

  it('lists what is left, late reminders first, tasks without a day last', () => {
    const items = personAgenda(
      [
        { id: 'late', title: 'Rappeler Paul', scheduledAt: new Date(2026, 10, 6, 9).toISOString(), status: 'TRIGGERED' },
        { id: 'done', title: 'Fait', scheduledAt: new Date(2026, 10, 7, 9).toISOString(), status: 'COMPLETED' },
        { id: 'soon', title: 'Anniversaire', scheduledAt: new Date(2026, 10, 9, 9).toISOString(), status: 'UPCOMING' },
      ],
      [
        { id: 't1', title: 'Cadeau', status: 'INBOX' },
        { id: 't2', title: 'Réserver', status: 'SCHEDULED', scheduledDate: '2026-11-08' },
        { id: 't3', title: 'Finie', status: 'COMPLETED', scheduledDate: '2026-11-07' },
      ],
      [
        { id: 'past', title: 'Dîner passé', startAt: new Date(2026, 10, 5, 19).toISOString(), endAt: new Date(2026, 10, 5, 22).toISOString() },
        { id: 'e1', title: 'Café', startAt: new Date(2026, 10, 7, 10).toISOString(), endAt: new Date(2026, 10, 7, 11).toISOString() },
      ],
      now
    );
    expect(items.map(item => item.id)).toEqual(['late', 'e1', 't2', 'soon', 't1']);
    expect(items[0].overdue).toBe(true);
    expect(items[4].at).toBeNull();
  });

  it('plans a follow-up at 10:00, the given number of days later', () => {
    const at = followUpDate(3, now);
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([9, 10, 0]);
  });
});

describe('person picker', () => {
  const persons = [
    { id: 'a', displayName: 'Zoé Martin', relationship: 'Sœur' },
    { id: 'b', displayName: 'André', lastInteractionAt: '2026-11-01T10:00:00.000Z' },
    { id: 'c', displayName: 'Bruno', lastInteractionAt: '2026-11-05T10:00:00.000Z', relationship: 'Collègue' },
  ];

  it('shows the people seen most recently first, then by name', () => {
    expect(pickerPersons(persons, '').map(person => person.id)).toEqual(['c', 'b', 'a']);
  });

  it('searches names and relationships without caring about case or accents', () => {
    expect(foldText('  Zoé ')).toBe('zoe');
    expect(pickerPersons(persons, 'zoe').map(person => person.id)).toEqual(['a']);
    expect(pickerPersons(persons, 'ANDRE').map(person => person.id)).toEqual(['b']);
    expect(pickerPersons(persons, 'collegue').map(person => person.id)).toEqual(['c']);
    expect(pickerPersons(persons, 'xyz')).toEqual([]);
  });
});

describe('quick capture of a follow-up', () => {
  it('reads "Relancer Paul dans 3 jours" as a call to Paul in three days', () => {
    const now = new Date(2026, 10, 6, 15, 0);
    const paul = { id: 'paul', displayName: 'Paul', forgottenThresholdDays: 30, importedFromContacts: false, createdAt: '', updatedAt: '' };
    const parsed = parseQuickCapture('Relancer Paul dans 3 jours', [paul], now);
    expect(parsed.actionType).toBe('CALL');
    expect(parsed.targetPerson?.id).toBe('paul');
    expect(parsed.targetDate.getDate()).toBe(9);
    expect(parseQuickCapture('Follow up with Paul tomorrow', [paul], now, 'en').actionType).toBe('CALL');
  });
});
