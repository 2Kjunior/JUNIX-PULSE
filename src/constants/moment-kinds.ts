/**
 * How each type of moment looks (study 001, 6-C; sheet 023): its icon, its name and its colour
 * in each theme. What a type does lives in domain/rules/moment-kind-rules.ts; both are keyed by
 * the same ids (MOMENT_KINDS), so adding a type is one line here, one there, and its two names.
 * The colours are readable on every surface; the mourning one stays grey and quiet.
 */

import type { Ionicons } from '@expo/vector-icons';

import type { ThemePalette } from '@/constants/palettes';
import { momentKindOf, type MomentKind } from '@/domain/rules/moment-kind-rules';
import type { MessageKey } from '@/i18n';

export interface MomentKindLook {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: MessageKey;
  color: { dark: string; light: string };
}

export const MOMENT_KIND_LOOKS: Readonly<Record<MomentKind, MomentKindLook>> = {
  appointment: { icon: 'calendar-outline', labelKey: 'momentKind.appointment', color: { dark: '#F5B942', light: '#A8500A' } },
  work: { icon: 'briefcase-outline', labelKey: 'momentKind.work', color: { dark: '#7AA2F7', light: '#1D4ED8' } },
  health: { icon: 'medkit-outline', labelKey: 'momentKind.health', color: { dark: '#5EEAD4', light: '#0F766E' } },
  birthday: { icon: 'gift-outline', labelKey: 'momentKind.birthday', color: { dark: '#F9A8D4', light: '#BE185D' } },
  party: { icon: 'sparkles-outline', labelKey: 'momentKind.party', color: { dark: '#C4B5FD', light: '#6D28D9' } },
  ceremony: { icon: 'flower-outline', labelKey: 'momentKind.ceremony', color: { dark: '#E9D8A6', light: '#854D0E' } },
  mourning: { icon: 'leaf-outline', labelKey: 'momentKind.mourning', color: { dark: '#A8A29E', light: '#57534E' } },
  travel: { icon: 'airplane-outline', labelKey: 'momentKind.travel', color: { dark: '#93C5FD', light: '#0369A1' } },
  // "Autre" keeps the amber of the Moment family, as before the types
  other: { icon: 'ellipse-outline', labelKey: 'momentKind.other', color: { dark: '#F5B942', light: '#A8500A' } },
};

/** The look of a saved type; an unknown one looks like "Autre". */
export function momentKindLook(kind: unknown): MomentKindLook {
  return MOMENT_KIND_LOOKS[momentKindOf(kind)];
}

export function momentKindColor(palette: Pick<ThemePalette, 'mode'>, kind: unknown): string {
  const look = momentKindLook(kind);
  return palette.mode === 'light' ? look.color.light : look.color.dark;
}
