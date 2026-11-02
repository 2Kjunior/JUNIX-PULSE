/**
 * Pure rules turning a message id, its parameters and the user's preferences into display text,
 * and the single (mood, reaction, message) contract every mascot output goes through.
 * A generative layer can later feed the same contract without changing the interface.
 */

import { MASCOT_MESSAGES, MascotMessageId } from './mascot-message-catalog';
import { MASCOT_MESSAGES_EN } from './mascot-message-catalog-en';
import { MascotMood } from './mascot-mood-rules';
import { MascotPreferences, resolveFirstName } from './mascot-preferences';
import { MascotReaction } from './mascot-reaction-rules';

export type MascotMessageParams = Readonly<Record<string, string | number>>;

export interface MascotSignal {
  mood: MascotMood;
  reaction: MascotReaction | null;
  message: string | null;
}

const PLACEHOLDER = /\{(?:(de):)?([A-Za-z]+)(?:\|([^|}]*)\|([^|}]*))?\}/g;
const VOWEL_START = /^[aeiouyàâäéèêëîïôöùûüœh]/i;

function readParam(params: MascotMessageParams, key: string): string | number {
  const value = params[key];
  if (value === undefined) {
    throw new Error(`Missing mascot message parameter: ${key}`);
  }
  return value;
}

/** "de Paul" or "d'Awa": elision before a vowel or a mute h. */
function withDe(value: string): string {
  return VOWEL_START.test(value) ? `d'${value}` : `de ${value}`;
}

/** Fills a catalogue template. Throws when a parameter is missing, so a broken call shows in tests. */
export function renderMascotTemplate(template: string, params: MascotMessageParams): string {
  return template.replace(
    PLACEHOLDER,
    (_match, de: string | undefined, key: string, singular: string | undefined, plural: string | undefined) => {
      const value = readParam(params, key);
      if (singular !== undefined && plural !== undefined) {
        return Number(value) < 2 ? singular : plural;
      }
      return de ? withDe(String(value)) : String(value);
    }
  );
}

/** Names of the parameters a template needs, without the first name. */
export function templateParams(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER)) {
    if (match[2] !== 'name') names.add(match[2]);
  }
  return [...names].sort();
}

/**
 * Text of a message in the variant the user chose, or null when the mascot is silent.
 * Without a first name (unknown, or switched off) the plain variant is used.
 */
export function resolveMascotMessage(
  id: MascotMessageId,
  params: MascotMessageParams,
  preferences: MascotPreferences,
  displayName: string | null | undefined
): string | null {
  if (preferences.presence === 'off') return null;

  const firstName = resolveFirstName(preferences, displayName);
  const variants =
    preferences.language === 'en'
      ? MASCOT_MESSAGES_EN[id][preferences.tone]
      : MASCOT_MESSAGES[id][preferences.address][preferences.tone];

  if (firstName) {
    return renderMascotTemplate(variants.named, { ...params, name: firstName });
  }
  return renderMascotTemplate(variants.plain, params);
}

export function buildMascotSignal(
  mood: MascotMood,
  reaction: MascotReaction | null,
  message: { id: MascotMessageId; params: MascotMessageParams } | null,
  preferences: MascotPreferences,
  displayName: string | null | undefined
): MascotSignal {
  return {
    mood,
    reaction,
    message: message ? resolveMascotMessage(message.id, message.params, preferences, displayName) : null,
  };
}
