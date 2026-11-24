import {
  findInvite,
  inviteLink,
  inviteMessage,
  nextInviteStatus,
  parseInviteParams,
  receivedKind,
  senderAmong,
  type Invite,
} from '../invite-rules';

const MOMENT: Invite = {
  kind: 'event',
  title: 'Dîner chez Paul & Léa',
  start: '2026-11-28T19:00:00.000Z',
  end: '2026-11-28T21:00:00.000Z',
  place: '12 rue des Lilas',
  momentKind: 'party',
  from: 'Simon',
};

describe('the invite link (study 001, 5-A; sheet 025)', () => {
  it('reads back what it writes, accents and signs included', () => {
    expect(findInvite(inviteLink(MOMENT))).toEqual(MOMENT);
    const task: Invite = { kind: 'task', title: 'Rapporter le livre', day: '2026-11-30', from: 'Awa' };
    expect(findInvite(inviteLink(task))).toEqual(task);
    const reminder: Invite = { kind: 'reminder', title: 'Appeler maman ?', at: '2026-11-27T17:00:00.000Z' };
    expect(findInvite(inviteLink(reminder))).toEqual(reminder);
  });

  it('finds the link in a whole pasted message', () => {
    expect(findInvite(`Simon t'invite.\n\nPour l'ajouter : ${inviteLink(MOMENT)}\nÀ bientôt`)).toEqual(MOMENT);
    expect(findInvite('Rien à voir ici')).toBeNull();
  });

  it('refuses what is not a complete invite', () => {
    expect(parseInviteParams({ k: 'party', t: 'x' })).toBeNull();
    expect(parseInviteParams({ k: 'task', t: '   ' })).toBeNull();
    expect(parseInviteParams({ k: 'reminder', t: 'x', a: 'demain' })).toBeNull();
    expect(parseInviteParams({ k: 'event', t: 'x', s: '2026-11-28T21:00:00Z', e: '2026-11-28T19:00:00Z' })).toBeNull();
    expect(findInvite('junixpulse://invite?k=task&t=%E0%A4%A')).toBeNull();
  });

  it('cuts what is too long and ignores what it does not know', () => {
    const invite = parseInviteParams({ k: 'task', t: 'a'.repeat(500), d: '28/11/2026', x: 'drop table', f: 'b'.repeat(200) });
    expect(invite?.title).toHaveLength(120);
    expect(invite?.from).toHaveLength(60);
    expect(invite?.day).toBeUndefined();
    expect(Object.keys(invite ?? {})).not.toContain('x');
  });

  it('reads an unknown type of moment as "Autre"', () => {
    expect(parseInviteParams({ k: 'event', t: 'x', s: MOMENT.start, e: MOMENT.end, mk: 'rave' })?.momentKind).toBe('other');
  });

  it('writes a message anyone can read, then the link', () => {
    const message = inviteMessage(MOMENT, 'fr');
    expect(message).toContain('Simon');
    expect(message).toContain('Dîner chez Paul & Léa');
    expect(message).toContain('12 rue des Lilas');
    expect(message.trim().endsWith(inviteLink(MOMENT))).toBe(true);
    expect(inviteMessage({ kind: 'task', title: 'Rapporter le livre' }, 'en')).toContain('Rapporter le livre');
  });
});

describe('after sending and on receiving', () => {
  it('goes from invited to takes part and back, by hand', () => {
    expect(nextInviteStatus(null)).toBeNull();
    expect(nextInviteStatus('invited')).toBe('joined');
    expect(nextInviteStatus('joined')).toBe('invited');
  });

  it('adds a reminder already past as a task', () => {
    const now = new Date('2026-11-28T12:00:00Z');
    expect(receivedKind({ kind: 'reminder', title: 'x', at: '2026-11-27T10:00:00Z' }, now)).toBe('task');
    expect(receivedKind({ kind: 'reminder', title: 'x', at: '2026-11-29T10:00:00Z' }, now)).toBe('reminder');
    expect(receivedKind(MOMENT, now)).toBe('event');
  });

  it('knows the sender among the people by name, without accents or capitals', () => {
    const people = [{ id: '1', displayName: 'Zoé Martin' }, { id: '2', displayName: 'Simon' }];
    expect(senderAmong('zoe martin', people)?.id).toBe('1');
    expect(senderAmong('Paul', people)).toBeNull();
    expect(senderAmong(undefined, people)).toBeNull();
  });
});
