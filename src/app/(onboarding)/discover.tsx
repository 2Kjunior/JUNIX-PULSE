/**
 * Onboarding, step 2: how it works. The five things of Junix Pulse (task, reminder, moment,
 * habit, goal) as shared cards, and one line on how to add (sheet 021). The list and its
 * texts live in constants/pulse-concepts.ts, so this screen never lists them by hand.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/ui/StepIndicator';
import type { ThemePalette } from '@/constants/palettes';
import { PULSE_CONCEPTS } from '@/constants/pulse-concepts';
import { Spacing, Radius, Typography } from '@/constants/theme';
import { setDiscoverCardsY } from '@/features/mascot/onboarding-guide-state';
import { ConceptCard } from '@/features/onboarding/ConceptCard';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';

/** How far above the bottom of the list the mascot points for a card that is scrolled out of view. */
const HIDDEN_CARD_MARGIN = 24;

export default function OnboardingDiscover() {
  const t = useT();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeOnboardingDiscoverStyles);

  // The mascot guide points at each card: the screen tells it where they are. They are measured
  // once the screen has finished sliding in, otherwise the position would be the moving one.
  // A card below the visible part of the list is pointed at the bottom of that part.
  const listRef = useRef<React.ComponentRef<typeof View>>(null);
  const cardRefs = useRef<(React.ComponentRef<typeof View> | null)[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.measureInWindow((_lx, listY, _lw, listHeight) => {
        const bottom = listY + listHeight - HIDDEN_CARD_MARGIN;
        const centres: number[] = [];
        let measured = 0;
        cardRefs.current.forEach((card, index) => {
          card?.measureInWindow((_x, y, _w, h) => {
            centres[index] = Math.min(y + h / 2, bottom);
            measured += 1;
            if (measured === PULSE_CONCEPTS.length) setDiscoverCardsY(centres);
          });
        });
      });
    }, 600);
    return () => {
      clearTimeout(timer);
      setDiscoverCardsY([]);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <StepIndicator total={5} current={2} />
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/permissions')}
            style={styles.skipBtn}
            accessibilityLabel={t('discover.skipA11y')}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t('discover.title')}</Text>
        <Text style={styles.subtitle}>{t('discover.subtitle')}</Text>
      </View>

      <View ref={listRef} collapsable={false} style={styles.scroll}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {PULSE_CONCEPTS.map((concept, index) => (
            <View
              key={concept}
              ref={node => {
                cardRefs.current[index] = node;
              }}
              collapsable={false}
            >
              <ConceptCard concept={concept} />
            </View>
          ))}

          <View style={styles.hint}>
            <Ionicons name="mic-outline" size={18} color={palette.primary.default} />
            <Text style={styles.hintText}>{t('discover.hint')}</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('common.next')}
          onPress={() => router.push('/(onboarding)/personalize')}
          variant="primary"
          size="lg"
          style={styles.btnPrimary}
          testID="onboarding-discover-next"
        />
        <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" size="md" />
      </View>
    </View>
  );
}

const makeOnboardingDiscoverStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface.base,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xxl,
      paddingBottom: Spacing.xxl,
    },
    header: {
      marginBottom: Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    skipBtn: {
      paddingVertical: Spacing.xs,
      paddingLeft: Spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    skipText: {
      ...Typography.bodyMedium,
      color: theme.onSurface.disabled,
    },
    title: {
      fontSize: 26,
      fontFamily: 'Outfit-Bold',
      color: theme.onSurface.primary,
      marginBottom: Spacing.xs,
      lineHeight: 34,
    },
    subtitle: {
      ...Typography.bodyLarge,
      color: theme.onSurface.variant,
    },
    scroll: {
      flex: 1,
    },
    list: {
      gap: Spacing.sm,
      paddingBottom: Spacing.lg,
    },
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: theme.surface.high,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginTop: Spacing.xs,
      borderWidth: 1,
      borderColor: theme.primary.default + '26',
    },
    hintText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      flex: 1,
    },
    actions: {
      gap: Spacing.sm,
      alignItems: 'center',
      paddingTop: Spacing.md,
    },
    btnPrimary: {
      width: '100%',
    },
  });
