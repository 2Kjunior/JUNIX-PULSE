import { MASCOT_MESSAGES } from '../domain/rules/mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from '../domain/rules/mascot-message-catalog-en';
import { SECRET_TIPS, secretDue } from '../domain/rules/secret-tips-rules';

describe('the secrets of Pulse (sheet 046)', () => {
  const startedAt = new Date(2026, 10, 20, 9, 0);
  const at = (day: number) => new Date(2026, 10, day, 18, 0);
  const due = (over: Partial<Parameters<typeof secretDue>[0]> = {}) =>
    secretDue({ seen: new Set(), startedAt, lastTipDay: null, lastSecretDay: null, now: at(24), ...over });

  it('keeps quiet in the first days of use', () => {
    expect(due({ now: at(20) })).toBeNull();
    expect(due({ now: at(22) })).toBeNull();
    expect(due({ now: at(23) })?.id).toBe(SECRET_TIPS[0].id);
  });

  it('never comes on the day of another tip', () => {
    expect(due({ lastTipDay: '2026-11-24' })).toBeNull();
    expect(due({ lastTipDay: '2026-11-23' })).not.toBeNull();
  });

  it('tells one at most every three days', () => {
    expect(due({ lastSecretDay: '2026-11-22' })).toBeNull();
    expect(due({ lastSecretDay: '2026-11-21' })).not.toBeNull();
  });

  it('tells them in order, each once, then nothing more', () => {
    expect(due({ seen: new Set([SECRET_TIPS[0].id]) })?.id).toBe(SECRET_TIPS[1].id);
    expect(due({ seen: new Set(SECRET_TIPS.map(secret => secret.id)) })).toBeNull();
  });

  it('has each secret in French and in English, kept as a tip', () => {
    for (const secret of SECRET_TIPS) {
      expect(secret.id.startsWith('secret:')).toBe(true);
      expect(MASCOT_MESSAGES[secret.message]).toBeDefined();
      expect(MASCOT_MESSAGES_EN[secret.message]).toBeDefined();
    }
  });
});
