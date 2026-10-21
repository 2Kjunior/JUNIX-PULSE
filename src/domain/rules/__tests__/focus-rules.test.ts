/**
 * Tests unitaires des règles métier pures pour le Focus Timer (focus-rules).
 */

import {
  createFocusSession,
  applyPreset,
  applyCustomAdjustment,
  startFocusSession,
  pauseFocusSession,
  resetFocusSession,
  tickFocusSession,
  formatRemainingTime,
  calculateFocusProgress,
} from '../focus-rules';

describe('focus-rules', () => {
  describe('createFocusSession', () => {
    it('initialise par défaut avec 25 minutes et le mode preset', () => {
      const session = createFocusSession();
      expect(session.durationMinutes).toBe(25);
      expect(session.remainingSeconds).toBe(1500);
      expect(session.selectionMode).toBe('preset');
      expect(session.state).toBe('idle');
      expect(session.completedAt).toBeUndefined();
    });

    it('permet de lier une tâche et de spécifier des valeurs initiales', () => {
      const session = createFocusSession({
        durationMinutes: 50,
        selectionMode: 'preset',
        taskId: 'task-123',
        taskTitle: 'Rédiger le rapport',
      });
      expect(session.durationMinutes).toBe(50);
      expect(session.remainingSeconds).toBe(3000);
      expect(session.taskId).toBe('task-123');
      expect(session.taskTitle).toBe('Rédiger le rapport');
    });

    it('plafonne la durée entre 1 et 120 minutes', () => {
      const tooSmall = createFocusSession({ durationMinutes: 0 });
      expect(tooSmall.durationMinutes).toBe(1);

      const tooLarge = createFocusSession({ durationMinutes: 200 });
      expect(tooLarge.durationMinutes).toBe(120);
    });
  });

  describe('applyPreset & applyCustomAdjustment (exclusion mutuelle)', () => {
    it('applyPreset bascule en mode preset et réinitialise le temps restant', () => {
      const customSession = createFocusSession({ durationMinutes: 17, selectionMode: 'custom' });
      expect(customSession.selectionMode).toBe('custom');

      const presetSession = applyPreset(customSession, 50);
      expect(presetSession.selectionMode).toBe('preset');
      expect(presetSession.durationMinutes).toBe(50);
      expect(presetSession.remainingSeconds).toBe(3000);
      expect(presetSession.state).toBe('idle');
    });

    it('applyCustomAdjustment bascule en mode custom et applique le delta', () => {
      const presetSession = createFocusSession({ durationMinutes: 25, selectionMode: 'preset' });
      expect(presetSession.selectionMode).toBe('preset');

      const adjustedSession = applyCustomAdjustment(presetSession, 5);
      expect(adjustedSession.selectionMode).toBe('custom');
      expect(adjustedSession.durationMinutes).toBe(30);
      expect(adjustedSession.remainingSeconds).toBe(1800);
      expect(adjustedSession.state).toBe('idle');
    });

    it('applyCustomAdjustment respecte les bornes min et max', () => {
      const session = createFocusSession({ durationMinutes: 2 });
      const decremented = applyCustomAdjustment(session, -5);
      expect(decremented.durationMinutes).toBe(1);

      const maxSession = createFocusSession({ durationMinutes: 115 });
      const incremented = applyCustomAdjustment(maxSession, 10);
      expect(incremented.durationMinutes).toBe(120);
    });
  });

  describe('Transitions d\'état (start, pause, reset)', () => {
    it('startFocusSession passe de idle à running', () => {
      const session = createFocusSession();
      const started = startFocusSession(session);
      expect(started.state).toBe('running');
    });

    it('pauseFocusSession passe de running à paused', () => {
      const session = startFocusSession(createFocusSession());
      const paused = pauseFocusSession(session);
      expect(paused.state).toBe('paused');
    });

    it('resetFocusSession remet les secondes au départ et réinitialise à idle', () => {
      let session = startFocusSession(createFocusSession({ durationMinutes: 25 }));
      session = tickFocusSession(session);
      session = tickFocusSession(session);
      expect(session.remainingSeconds).toBe(1498);

      const reset = resetFocusSession(session);
      expect(reset.state).toBe('idle');
      expect(reset.remainingSeconds).toBe(1500);
    });

    it('démarrer une session completed la réinitialise à pleine durée', () => {
      const completed = {
        ...createFocusSession({ durationMinutes: 25 }),
        state: 'completed' as const,
        remainingSeconds: 0,
      };

      const restarted = startFocusSession(completed);
      expect(restarted.state).toBe('running');
      expect(restarted.remainingSeconds).toBe(1500);
    });
  });

  describe('tickFocusSession', () => {
    it('décrémente de 1 seconde lorsque la session est en cours', () => {
      const session = startFocusSession(createFocusSession({ durationMinutes: 25 }));
      const ticked = tickFocusSession(session);
      expect(ticked.remainingSeconds).toBe(1499);
      expect(ticked.state).toBe('running');
    });

    it('ne décrémente pas si la session est en pause ou idle', () => {
      const idle = createFocusSession({ durationMinutes: 25 });
      expect(tickFocusSession(idle).remainingSeconds).toBe(1500);

      const paused = pauseFocusSession(startFocusSession(idle));
      expect(tickFocusSession(paused).remainingSeconds).toBe(1500);
    });

    it('passe à completed quand remainingSeconds atteint 0', () => {
      const now = new Date('2026-10-20T10:00:00Z');
      const session = {
        ...createFocusSession({ durationMinutes: 1 }),
        state: 'running' as const,
        remainingSeconds: 1,
      };

      const finished = tickFocusSession(session, now);
      expect(finished.remainingSeconds).toBe(0);
      expect(finished.state).toBe('completed');
      expect(finished.completedAt).toBe(now.toISOString());
    });
  });

  describe('formatRemainingTime', () => {
    it('formate correctement les durées en MM:SS', () => {
      expect(formatRemainingTime(1500)).toBe('25:00');
      expect(formatRemainingTime(65)).toBe('01:05');
      expect(formatRemainingTime(9)).toBe('00:09');
      expect(formatRemainingTime(0)).toBe('00:00');
    });

    it('gère les valeurs négatives en retournant 00:00', () => {
      expect(formatRemainingTime(-10)).toBe('00:00');
    });
  });

  describe('calculateFocusProgress', () => {
    it('calcule la fraction écoulée entre 0 et 1', () => {
      expect(calculateFocusProgress(1500, 25)).toBe(0); // 0% écoulé au début
      expect(calculateFocusProgress(750, 25)).toBe(0.5); // 50% écoulé à mi-parcours
      expect(calculateFocusProgress(0, 25)).toBe(1); // 100% à la fin
    });

    it('gère les cas limites', () => {
      expect(calculateFocusProgress(0, 0)).toBe(1);
      expect(calculateFocusProgress(-5, 25)).toBe(1);
    });
  });
});
