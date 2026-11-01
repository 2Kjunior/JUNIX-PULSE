import { createFocusSession, startFocusSession, syncFocusSessionWithClock } from '../focus-rules';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const running = () => startFocusSession(createFocusSession({ durationMinutes: 25 }));

describe('syncFocusSessionWithClock', () => {
  it('follows the end time, even after a long time in the background', () => {
    const endsAt = NOW.getTime() + 10 * 60 * 1000;

    const session = syncFocusSessionWithClock(running(), endsAt, NOW);

    expect(session.state).toBe('running');
    expect(session.remainingSeconds).toBe(600);
  });

  it('completes the session once the end time has passed', () => {
    const session = syncFocusSessionWithClock(running(), NOW.getTime() - 5000, NOW);

    expect(session.state).toBe('completed');
    expect(session.remainingSeconds).toBe(0);
    expect(session.completedAt).toBe(NOW.toISOString());
  });

  it('leaves a paused session alone', () => {
    const paused = { ...running(), state: 'paused' as const };

    expect(syncFocusSessionWithClock(paused, NOW.getTime() - 5000, NOW)).toEqual(paused);
  });
});
