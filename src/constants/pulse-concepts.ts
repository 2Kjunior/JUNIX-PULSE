/**
 * The five things Junix Pulse keeps for you (study 001, 15.1): their order, icon, colour and the
 * keys of their texts. The onboarding shows them as cards (sheet 021); any other screen that
 * explains them reads this list, so a sixth one is added here once (with its texts in both
 * languages and a mascot sentence in DISCOVER_CARD_MESSAGES: a test keeps them in step).
 * Task, reminder and moment take the colour of their family, the same as on every other screen.
 */
import type { Ionicons } from '@expo/vector-icons';

import { itemFamilyColor, type ItemFamily } from '@/constants/item-kinds';
import type { ThemePalette } from '@/constants/palettes';
import type { MessageKey } from '@/i18n';

export const PULSE_CONCEPTS = ['task', 'reminder', 'moment', 'habit', 'goal'] as const;
export type PulseConcept = (typeof PULSE_CONCEPTS)[number];

export interface PulseConceptDefinition {
  icon: keyof typeof Ionicons.glyphMap;
  /** The family whose colour it takes, or the palette role it uses. */
  color: { family: ItemFamily } | { role: 'success' | 'tertiary' };
  titleKey: MessageKey;
  descKey: MessageKey;
  exampleKey: MessageKey;
}

export const PULSE_CONCEPT_DEFINITIONS: Readonly<Record<PulseConcept, PulseConceptDefinition>> = {
  task: {
    icon: 'checkbox-outline',
    color: { family: 'todo' },
    titleKey: 'concept.task.title',
    descKey: 'concept.task.desc',
    exampleKey: 'concept.task.example',
  },
  reminder: {
    icon: 'notifications-outline',
    color: { family: 'todo' },
    titleKey: 'concept.reminder.title',
    descKey: 'concept.reminder.desc',
    exampleKey: 'concept.reminder.example',
  },
  moment: {
    icon: 'calendar-outline',
    color: { family: 'moment' },
    titleKey: 'concept.moment.title',
    descKey: 'concept.moment.desc',
    exampleKey: 'concept.moment.example',
  },
  habit: {
    icon: 'repeat-outline',
    color: { role: 'success' },
    titleKey: 'concept.habit.title',
    descKey: 'concept.habit.desc',
    exampleKey: 'concept.habit.example',
  },
  goal: {
    icon: 'flag-outline',
    color: { role: 'tertiary' },
    titleKey: 'concept.goal.title',
    descKey: 'concept.goal.desc',
    exampleKey: 'concept.goal.example',
  },
};

/** The colour of one of the five things in the current theme. */
export function pulseConceptColor(palette: ThemePalette, concept: PulseConcept): string {
  const color = PULSE_CONCEPT_DEFINITIONS[concept].color;
  return 'family' in color ? itemFamilyColor(palette, color.family) : palette[color.role].default;
}
