/**
 * The flagship features shown on the 2nd onboarding screen (study 001, 16.13; sheet 044).
 * Four, not everything: the rest is found while using the app, and Pulse tells a few secrets later.
 * Pulse points at each card in turn with a sentence of DISCOVER_CARD_MESSAGES (same order; a test
 * keeps both the same length).
 */

import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ThemePalette } from '@/constants/palettes';
import type { MessageKey } from '@/i18n';

export const ONBOARDING_FEATURES = ['voice', 'alarm', 'week', 'people'] as const;
export type OnboardingFeature = (typeof ONBOARDING_FEATURES)[number];

export interface OnboardingFeatureDefinition {
  icon: ComponentProps<typeof Ionicons>['name'];
  titleKey: MessageKey;
  descKey: MessageKey;
  /** Its colour in the palette of the theme. */
  color: (palette: ThemePalette) => string;
}

export const ONBOARDING_FEATURE_DEFINITIONS: Readonly<Record<OnboardingFeature, OnboardingFeatureDefinition>> = {
  voice: { icon: 'mic-outline', titleKey: 'onb.feature.voice', descKey: 'onb.feature.voiceDesc', color: palette => palette.tertiary.default },
  alarm: { icon: 'alarm-outline', titleKey: 'onb.feature.alarm', descKey: 'onb.feature.alarmDesc', color: palette => palette.error.default },
  week: { icon: 'calendar-outline', titleKey: 'onb.feature.week', descKey: 'onb.feature.weekDesc', color: palette => palette.primary.default },
  people: { icon: 'heart-outline', titleKey: 'onb.feature.people', descKey: 'onb.feature.peopleDesc', color: palette => palette.family.moment },
};
