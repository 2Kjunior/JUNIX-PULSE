/**
 * The relation of a person as shown (sheet 028). It is kept as the words chosen at the time:
 * « Friend » if the app was in English then. A known relation (friend, family…) is shown in
 * today's language; a free text (« Maman ») stays as written.
 */
import { knownRelationKey } from '@/domain/rules/person-rules';
import type { MessageKey, TFunction } from '@/i18n';
import { MESSAGES } from '@/i18n/messages';

const RELATION_KEYS = ['rel.friend', 'rel.family', 'rel.colleague', 'rel.partner', 'rel.client', 'rel.other'] as const satisfies readonly MessageKey[];

/** Each known relation, in every language of the app. */
const RELATION_LABELS = Object.fromEntries(
  RELATION_KEYS.map(key => [key, Object.values(MESSAGES).map(catalog => catalog[key])])
) as Record<(typeof RELATION_KEYS)[number], string[]>;

export function relationLabel(stored: string, t: TFunction): string {
  const key = knownRelationKey(stored, RELATION_LABELS);
  return key ? t(key) : stored;
}
