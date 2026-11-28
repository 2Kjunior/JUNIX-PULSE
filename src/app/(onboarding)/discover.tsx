/**
 * Onboarding, screen 2 of 5: what Junix Pulse does best (study 001, 16.13; sheet 044).
 *
 * Four flagship features, not everything (the rest is found while using the app). Pulse points
 * at each card in turn: the screen tells the guide where the cards are, once it has slid in.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ONBOARDING_FEATURE_DEFINITIONS, ONBOARDING_FEATURES } from '@/constants/onboarding-features';
import type { ThemePalette } from '@/constants/palettes';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { setDiscoverCardsY } from '@/features/mascot/onboarding-guide-state';
import { GUIDE_ROOM, OnboardingFrame } from '@/features/onboarding/OnboardingFrame';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { withAlpha } from '@/utils/color';

export default function OnboardingDiscover() {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingDiscoverStyles);

  // Where each card is, for the guide that points at them
  const cardRefs = useRef<(React.ComponentRef<typeof View> | null)[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const centres: number[] = [];
      let measured = 0;
      cardRefs.current.forEach((card, index) => {
        card?.measureInWindow((_x, y, _w, h) => {
          centres[index] = y + h / 2;
          measured += 1;
          if (measured === ONBOARDING_FEATURES.length) setDiscoverCardsY(centres);
        });
      });
    }, 600);
    return () => {
      clearTimeout(timer);
      setDiscoverCardsY([]);
    };
  }, []);

  return (
    <OnboardingFrame
      step={2}
      onSkip={() => router.push('/(onboarding)/permissions')}
      // Pulse sits at the top right with its bubble: room for it above the title
      guideRoom={GUIDE_ROOM}
      title={t('onb.features.title')}
      cta={{ label: t('common.continue'), onPress: () => router.push('/(onboarding)/personalize'), testID: 'onboarding-discover-next' }}
    >
      {ONBOARDING_FEATURES.map((feature, index) => {
        const definition = ONBOARDING_FEATURE_DEFINITIONS[feature];
        const color = definition.color(palette);
        const title = t(definition.titleKey);
        const desc = t(definition.descKey);
        return (
          <View
            key={feature}
            ref={node => {
              cardRefs.current[index] = node;
            }}
            collapsable={false}
            style={styles.card}
            accessible
            accessibilityLabel={`${title}. ${desc}`}
          >
            <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.16) }]}>
              <Ionicons name={definition.icon} size={22} color={color} />
            </View>
            <View style={styles.body}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDesc}>{desc}</Text>
            </View>
          </View>
        );
      })}
      <View style={styles.private}>
        <Ionicons name="lock-closed-outline" size={16} color={palette.onSurface.variant} />
        <Text style={styles.privateText}>{t('onb.features.private')}</Text>
      </View>
    </OnboardingFrame>
  );
}

function makeOnboardingDiscoverStyles(theme: ThemePalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface.container,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
    },
    cardDesc: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    private: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: Spacing.sm,
    },
    privateText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
  });
}
