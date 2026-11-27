import { HabitRepository } from '../repositories/habit-repository';
import { ReminderRepository } from '../repositories/reminder-repository';
import { TaskRepository } from '../repositories/task-repository';
import { completeFromAlarm } from '../services/alarm-done-service';
import { HabitUseCases } from '../use-cases/habit-use-cases';
import { completeReminder } from '../use-cases/reminder-use-cases';
import { TaskUseCases } from '../use-cases/task-use-cases';

jest.mock('../repositories/reminder-repository', () => ({ ReminderRepository: { findById: jest.fn() } }));
jest.mock('../repositories/task-repository', () => ({ TaskRepository: { findById: jest.fn() } }));
jest.mock('../repositories/habit-repository', () => ({ HabitRepository: { isCompletedOn: jest.fn() } }));
jest.mock('../use-cases/reminder-use-cases', () => ({ completeReminder: jest.fn() }));
jest.mock('../use-cases/task-use-cases', () => ({ TaskUseCases: { toggleComplete: jest.fn() } }));
jest.mock('../use-cases/habit-use-cases', () => ({ HabitUseCases: { toggleHabitCompletion: jest.fn() } }));

describe('completeFromAlarm, "Terminer" on an alarm (sheet 039)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes a reminder, once', async () => {
    (ReminderRepository.findById as jest.Mock).mockResolvedValue({ id: 'r1', status: 'UPCOMING' });
    expect(await completeFromAlarm('reminder', 'r1')).toBe('done');
    expect(completeReminder).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));

    (ReminderRepository.findById as jest.Mock).mockResolvedValue({ id: 'r1', status: 'COMPLETED' });
    expect(await completeFromAlarm('reminder', 'r1')).toBe('already');
    expect(completeReminder).toHaveBeenCalledTimes(1);
  });

  it('ticks a task, never unticks it', async () => {
    (TaskRepository.findById as jest.Mock).mockResolvedValue({ id: 't1', status: 'SCHEDULED' });
    expect(await completeFromAlarm('task', 't1')).toBe('done');
    expect(TaskUseCases.toggleComplete).toHaveBeenCalledWith('t1');

    (TaskRepository.findById as jest.Mock).mockResolvedValue({ id: 't1', status: 'COMPLETED' });
    expect(await completeFromAlarm('task', 't1')).toBe('already');
    expect(TaskUseCases.toggleComplete).toHaveBeenCalledTimes(1);
  });

  it('ticks a habit for today, once', async () => {
    const now = new Date(2026, 10, 27, 7, 30);
    (HabitRepository.isCompletedOn as jest.Mock).mockResolvedValue(false);
    expect(await completeFromAlarm('habit', 'h1', now)).toBe('done');
    expect(HabitUseCases.toggleHabitCompletion).toHaveBeenCalledWith('h1', '2026-11-27');

    (HabitRepository.isCompletedOn as jest.Mock).mockResolvedValue(true);
    expect(await completeFromAlarm('habit', 'h1', now)).toBe('already');
  });

  it('leaves alone what is removed or unknown', async () => {
    (ReminderRepository.findById as jest.Mock).mockResolvedValue(null);
    expect(await completeFromAlarm('reminder', 'gone')).toBe('missing');
    expect(await completeFromAlarm('moment', 'e1')).toBe('missing');
    expect(await completeFromAlarm('reminder', undefined)).toBe('missing');
    expect(completeReminder).not.toHaveBeenCalled();
  });
});
