/**
 * The types of a moment (study 001, 6-C; sheet 023): what each one does to its notifications,
 * and the words that tell it in a sentence. Pure: the icons, colours and names live in
 * constants/moment-kinds.ts, keyed by the same ids, so TypeScript asks for both when a type is added.
 */

import { MOMENT_KINDS, type MomentKind } from '../enums';
import type { AppLanguage } from './language-rules';

export { MOMENT_KINDS, type MomentKind };

/** A moment saved before the types, or with a type this version does not know, is "Autre". */
export const DEFAULT_MOMENT_KIND: MomentKind = 'other';

export function momentKindOf(value: unknown): MomentKind {
  return (MOMENT_KINDS as readonly string[]).includes(value as string) ? (value as MomentKind) : DEFAULT_MOMENT_KIND;
}

/** The tone of a type: Pulse and, later, the sounds follow it (a funeral is not a party). */
export type MomentTone = 'festive' | 'neutral' | 'sober';

export const MOMENT_KIND_TONES: Readonly<Record<MomentKind, MomentTone>> = {
  appointment: 'neutral',
  work: 'neutral',
  health: 'neutral',
  birthday: 'festive',
  party: 'festive',
  ceremony: 'sober',
  mourning: 'sober',
  travel: 'neutral',
  other: 'neutral',
};

/**
 * How a type moves the level of its notifications, one step at most: a mourning stays discreet,
 * the time to leave for a journey is an alarm (a plane does not wait). The other types keep the
 * level of the settings.
 */
export const MOMENT_KIND_ALERT_SHIFT: Readonly<Record<MomentKind, { before: -1 | 0 | 1; leave: -1 | 0 | 1 }>> = {
  appointment: { before: 0, leave: 0 },
  work: { before: 0, leave: 0 },
  health: { before: 0, leave: 0 },
  birthday: { before: 0, leave: 0 },
  party: { before: 0, leave: 0 },
  ceremony: { before: 0, leave: 0 },
  mourning: { before: -1, leave: -1 },
  travel: { before: 0, leave: 1 },
  other: { before: 0, leave: 0 },
};

/**
 * The words that tell a type, in the order they are tried: the most precise first, so that
 * "fête d'anniversaire" is a birthday and "rendez-vous chez le médecin" is health.
 * Written without accents, as the sentence is read without them.
 */
const KIND_WORDS: readonly { kind: MomentKind; fr: readonly string[]; en: readonly string[] }[] = [
  { kind: 'mourning', fr: ['enterrement', 'obseques', 'funerailles', 'deuil', 'veillee funebre', 'inhumation'], en: ['funeral', 'burial', 'wake', 'memorial'] },
  { kind: 'birthday', fr: ['anniversaire', 'anniv'], en: ['birthday', 'bday'] },
  { kind: 'health', fr: ['medecin', 'docteur', 'dentiste', 'hopital', 'clinique', 'kine', 'kinesitherapeute', 'ophtalmo', 'gyneco', 'pediatre', 'vaccin', 'prise de sang', 'pharmacie'], en: ['doctor', 'dentist', 'hospital', 'clinic', 'physio', 'vaccine', 'blood test', 'pharmacy'] },
  { kind: 'ceremony', fr: ['messe', 'eglise', 'mosquee', 'temple', 'culte', 'priere', 'bapteme', 'mariage', 'communion', 'ceremonie', 'synagogue'], en: ['church', 'mass', 'mosque', 'temple', 'prayer', 'wedding', 'baptism', 'ceremony', 'synagogue'] },
  { kind: 'travel', fr: ['vol', 'avion', 'aeroport', 'train', 'gare', 'voyage', 'bus', 'depart en vacances'], en: ['flight', 'plane', 'airport', 'train', 'station', 'trip', 'journey', 'travel'] },
  { kind: 'party', fr: ['fete', 'soiree', 'diner', 'apero', 'barbecue', 'pot de depart', 'concert'], en: ['party', 'dinner', 'drinks', 'barbecue', 'concert', 'celebration'] },
  { kind: 'work', fr: ['reunion', 'travail', 'bureau', 'boulot', 'client', 'entretien', 'seminaire', 'conference'], en: ['meeting', 'work', 'office', 'client', 'interview', 'seminar', 'conference'] },
  { kind: 'appointment', fr: ['rendez-vous', 'rdv', 'coiffeur', 'banque', 'mairie', 'notaire', 'garage'], en: ['appointment', 'hairdresser', 'bank', 'town hall', 'garage'] },
];

function plain(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ');
}

/** The type a title or a sentence speaks of, or null when it says none. Whole words only. */
export function guessMomentKind(text: string, language: AppLanguage = 'fr'): MomentKind | null {
  const words = ` ${plain(text).replace(/[^a-z0-9- ]/g, ' ').replace(/\s+/g, ' ')} `;
  for (const entry of KIND_WORDS) {
    // Both languages are read: a French title may say "meeting"
    const list = language === 'en' ? [...entry.en, ...entry.fr] : [...entry.fr, ...entry.en];
    if (list.some(word => words.includes(` ${word} `))) return entry.kind;
  }
  return null;
}
