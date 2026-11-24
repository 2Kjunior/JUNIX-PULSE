/**
 * Sending a task, a reminder or a moment without an account (study 001, 5-A and 12.5; sheet 025).
 * Nothing goes through a server: everything is in the message. The message has a text anyone can
 * read and a Junix link (junixpulse://invite?…) that adds the item in one touch for whoever has
 * Junix, or that Junix finds again in a pasted message.
 *
 * What is sent: the type, the title, when, where, the type of a moment and the sender's name.
 * Not the notes (they may be private), nor the people, nor the tags.
 *
 * A received link is data from outside: it is read strictly (known keys, lengths, real dates),
 * and nothing is added without the person's "Ajouter".
 */

import { format } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';

import type { MomentKind } from '../enums';
import { translate } from '../../i18n/translate';
import type { AppLanguage } from './language-rules';
import { momentKindOf } from './moment-kind-rules';

export const INVITE_SCHEME_PREFIX = 'junixpulse://invite?';

export type InviteKind = 'task' | 'reminder' | 'event';

export interface Invite {
  kind: InviteKind;
  title: string;
  /** A task: its day, YYYY-MM-DD, if it has one. */
  day?: string;
  /** A reminder: when it rings (ISO). */
  at?: string;
  /** A moment: its start and end (ISO). */
  start?: string;
  end?: string;
  place?: string;
  momentKind?: MomentKind;
  /** The name of who sends it. */
  from?: string;
}

export const INVITE_LIMITS = { title: 120, place: 200, from: 60 } as const;

/** The short keys of the link, so that it stays short in an SMS. */
const KEYS: Readonly<Record<keyof Invite, string>> = {
  kind: 'k',
  title: 't',
  day: 'd',
  at: 'a',
  start: 's',
  end: 'e',
  place: 'p',
  momentKind: 'mk',
  from: 'f',
};

export function inviteLink(invite: Invite): string {
  const parts = (Object.keys(KEYS) as (keyof Invite)[])
    .filter(field => invite[field] !== undefined && invite[field] !== '')
    .map(field => `${KEYS[field]}=${encodeURIComponent(String(invite[field]))}`);
  return INVITE_SCHEME_PREFIX + parts.join('&');
}

const clip = (value: string | undefined, max: number) => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : undefined;
};

const validIso = (value: string | undefined): string | undefined => {
  if (!value || value.length > 40) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

/**
 * The invite of a link's parameters (by their short keys), or null when it is not a complete
 * invite: unknown type, no title, a reminder without its time, a moment without a start before
 * its end. Lengths are cut, unknown keys ignored.
 */
export function parseInviteParams(params: Readonly<Record<string, string | string[] | undefined>>): Invite | null {
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const kind = read(KEYS.kind);
  if (kind !== 'task' && kind !== 'reminder' && kind !== 'event') return null;
  const title = clip(read(KEYS.title), INVITE_LIMITS.title);
  if (!title) return null;
  const invite: Invite = { kind, title, from: clip(read(KEYS.from), INVITE_LIMITS.from) };

  if (kind === 'task') {
    const day = read(KEYS.day);
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(new Date(`${day}T12:00:00`).getTime())) invite.day = day;
  } else if (kind === 'reminder') {
    invite.at = validIso(read(KEYS.at));
    if (!invite.at) return null;
  } else {
    invite.start = validIso(read(KEYS.start));
    invite.end = validIso(read(KEYS.end));
    if (!invite.start || !invite.end || invite.end <= invite.start) return null;
    invite.place = clip(read(KEYS.place), INVITE_LIMITS.place);
    const momentKind = read(KEYS.momentKind);
    if (momentKind) invite.momentKind = momentKindOf(momentKind);
  }
  return invite;
}

/** The invite of the first Junix link found in a text (a pasted message), or null. */
export function findInvite(text: string): Invite | null {
  const at = text.indexOf(INVITE_SCHEME_PREFIX);
  if (at < 0) return null;
  const query = text.slice(at + INVITE_SCHEME_PREFIX.length).split(/\s/)[0];
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const cut = pair.indexOf('=');
    if (cut <= 0) continue;
    try {
      params[pair.slice(0, cut)] = decodeURIComponent(pair.slice(cut + 1));
    } catch {
      return null; // A broken link is not read halfway
    }
  }
  return parseInviteParams(params);
}

/** When an invite is, as the message says it ("samedi 28 nov., 20:00 – 22:00"), or '' for a task without a day. */
export function inviteWhen(invite: Invite, language: AppLanguage): string {
  const locale = language === 'en' ? enUS : fr;
  const day = (date: Date) => format(date, 'EEEE d MMM', { locale });
  const clock = (date: Date) => format(date, 'HH:mm');
  if (invite.kind === 'event' && invite.start && invite.end) {
    const start = new Date(invite.start);
    const end = new Date(invite.end);
    const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
    return sameDay ? `${day(start)}, ${clock(start)} – ${clock(end)}` : `${day(start)} ${clock(start)} – ${day(end)} ${clock(end)}`;
  }
  if (invite.kind === 'reminder' && invite.at) {
    const at = new Date(invite.at);
    return translate(language, 'invite.whenAt', { day: day(at), time: clock(at) });
  }
  if (invite.kind === 'task' && invite.day) return translate(language, 'invite.whenDay', { day: day(new Date(`${invite.day}T12:00:00`)) });
  return '';
}

/** The message sent: a text anyone can read, then the Junix link. */
export function inviteMessage(invite: Invite, language: AppLanguage): string {
  const when = inviteWhen(invite, language);
  const head = invite.from
    ? translate(language, 'invite.messageFrom', { name: invite.from, title: invite.title })
    : translate(language, 'invite.message', { title: invite.title });
  const lines = [head, when, invite.place ?? ''].filter(line => line !== '');
  return [...lines, '', translate(language, 'invite.messageLink'), inviteLink(invite)].join('\n');
}

// ─── What the sender sees after sending ──────────────────────────────────────────────────

/** No server tells when the other accepts: "Invitée" comes with the sending, "Participe" by hand. */
export type InviteStatus = 'invited' | 'joined';

/** A touch on the status: invited → takes part → invited. Before any sending, nothing to touch. */
export function nextInviteStatus(status: InviteStatus | null): InviteStatus | null {
  if (status === 'invited') return 'joined';
  if (status === 'joined') return 'invited';
  return null;
}

export function inviteStatusOf(value: unknown): InviteStatus | null {
  return value === 'invited' || value === 'joined' ? value : null;
}

/** A received reminder whose time has passed is added as a task on its day: it can no longer ring. */
export function receivedKind(invite: Invite, now: Date): InviteKind {
  if (invite.kind === 'reminder' && invite.at && new Date(invite.at).getTime() <= now.getTime()) return 'task';
  return invite.kind;
}

/** The person of the sender among the people, by name (no account: no phone or e-mail is sent). */
export function senderAmong<T extends { id: string; displayName: string }>(name: string | undefined, people: readonly T[]): T | null {
  const plain = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  if (!name) return null;
  const wanted = plain(name);
  return people.find(person => plain(person.displayName) === wanted) ?? null;
}
