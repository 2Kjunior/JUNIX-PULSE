/**
 * Tests unitaires pour reconcileOverdueRecurringReminders (DEF-03 / I-11).
 *
 * Scenarios couverts :
 * 1. Un rappel DAILY en retard de 5 jours -> avance a la prochaine occurrence
 * 2. Un rappel recurrent dont la regle est expiree -> marque COMPLETED
 * 3. Pas de rappels en retard -> rien ne change (count = 0)
 * 4. Plusieurs rappels en retard -> tous reconcilies
 * 5. Robustesse : rappel sans recurrenceRuleId -> ignore
 * 6. Robustesse : regle introuvable en base -> ignore
 */

import { reconcileOverdueRecurringReminders } from '../reminder-use-cases';
import { ReminderRepository } from '../../repositories/reminder-repository';
import { getNextOccurrence } from '../../domain/rules/reminder-rules';

// --- Mocks -------------------------------------------------------------------

jest.mock('../../repositories/reminder-repository');
jest.mock('../../domain/rules/reminder-rules', () => ({
  ...jest.requireActual('../../domain/rules/reminder-rules'),
  getNextOccurrence: jest.fn(),
}));

const mockRepo = ReminderRepository as jest.Mocked<typeof ReminderRepository>;
const mockGetNextOccurrence = getNextOccurrence as jest.MockedFunction<typeof getNextOccurrence>;

// Figer "maintenant" pour des tests deterministes
const NOW = new Date('2025-06-15T14:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

// --- Helpers -----------------------------------------------------------------

function makeReminder(overrides: Partial<{
  id: string;
  scheduledAt: string;
  recurrenceRuleId: string;
  status: string;
}> = {}) {
  return {
    id: overrides.id ?? 'r-1',
    title: 'Rappel test',
    scheduledAt: overrides.scheduledAt ?? '2025-06-10T09:00:00.000Z',
    timezone: 'UTC',
    priority: 'NORMAL' as const,
    status: (overrides.status ?? 'UPCOMING') as any,
    actionType: 'NONE' as const,
    recurrenceRuleId: 'recurrenceRuleId' in overrides ? overrides.recurrenceRuleId : 'rule-1',
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  };
}

const DAILY_RULE = {
  id: 'rule-1',
  type: 'DAILY' as const,
  interval: 1,
};

// --- Tests -------------------------------------------------------------------

describe('reconcileOverdueRecurringReminders (DEF-03)', () => {
  it('avance un rappel DAILY en retard vers la prochaine occurrence future', async () => {
    const reminder = makeReminder({
      scheduledAt: '2025-06-10T09:00:00.000Z',
      recurrenceRuleId: 'rule-1',
    });

    mockRepo.findOverdueRecurring.mockResolvedValue([reminder]);
    mockRepo.findRecurrenceRule.mockResolvedValue(DAILY_RULE);
    mockGetNextOccurrence.mockReturnValue('2025-06-16T09:00:00.000Z');
    mockRepo.update.mockResolvedValue();

    const count = await reconcileOverdueRecurringReminders();

    expect(count).toBe(1);
    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'r-1',
        scheduledAt: '2025-06-16T09:00:00.000Z',
        status: 'UPCOMING',
      })
    );
  });

  it('marque COMPLETED un rappel dont la regle de recurrence est expiree', async () => {
    const reminder = makeReminder({
      scheduledAt: '2025-06-10T09:00:00.000Z',
      recurrenceRuleId: 'rule-expired',
    });

    mockRepo.findOverdueRecurring.mockResolvedValue([reminder]);
    mockRepo.findRecurrenceRule.mockResolvedValue({
      ...DAILY_RULE,
      id: 'rule-expired',
      endDate: '2025-06-12T23:59:59.000Z',
    });
    // La regle expire avant maintenant -> getNextOccurrence retourne null
    mockGetNextOccurrence.mockReturnValue(null);
    mockRepo.update.mockResolvedValue();

    const count = await reconcileOverdueRecurringReminders();

    expect(count).toBe(1);
    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'r-1',
        status: 'COMPLETED',
        completedAt: expect.any(String),
      })
    );
  });

  it('retourne 0 si aucun rappel recurrent est en retard', async () => {
    mockRepo.findOverdueRecurring.mockResolvedValue([]);

    const count = await reconcileOverdueRecurringReminders();

    expect(count).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('reconcilie plusieurs rappels en retard en une seule passe', async () => {
    const reminders = [
      makeReminder({ id: 'r-1', scheduledAt: '2025-06-08T09:00:00.000Z', recurrenceRuleId: 'rule-1' }),
      makeReminder({ id: 'r-2', scheduledAt: '2025-06-05T15:00:00.000Z', recurrenceRuleId: 'rule-2' }),
    ];

    mockRepo.findOverdueRecurring.mockResolvedValue(reminders);
    mockRepo.findRecurrenceRule.mockResolvedValue(DAILY_RULE);
    mockGetNextOccurrence.mockReturnValue('2025-06-16T09:00:00.000Z');
    mockRepo.update.mockResolvedValue();

    const count = await reconcileOverdueRecurringReminders();

    expect(count).toBe(2);
    expect(mockRepo.update).toHaveBeenCalledTimes(2);
  });

  it('ignore les rappels sans recurrenceRuleId (robustesse defensive)', async () => {
    // Cas theoriquement impossible vu la requete SQL, mais test de robustesse
    const reminder = makeReminder({
      recurrenceRuleId: undefined as any,
    });

    mockRepo.findOverdueRecurring.mockResolvedValue([reminder]);

    const count = await reconcileOverdueRecurringReminders();

    expect(count).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('ignore un rappel si sa regle de recurrence est introuvable en base', async () => {
    const reminder = makeReminder({ recurrenceRuleId: 'rule-orphan' });

    mockRepo.findOverdueRecurring.mockResolvedValue([reminder]);
    mockRepo.findRecurrenceRule.mockResolvedValue(null);

    const count = await reconcileOverdueRecurringReminders();

    expect(count).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
