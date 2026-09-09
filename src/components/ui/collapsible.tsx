/**
 * Composant Collapsible — section repliable.
 * Adapté au design system Junix Pulse.
 */
import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Surface, OnSurface, Spacing, Radius, Typography } from '@/constants/theme';

interface CollapsibleProps {
  title: string;
}

export function Collapsible({ children, title }: PropsWithChildren<CollapsibleProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.heading, pressed && styles.pressed]}
        onPress={() => setIsOpen(v => !v)}
      >
        <View style={styles.chevronContainer}>
          <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>›</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </Pressable>

      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pressed: { opacity: 0.7 },
  chevronContainer: {
    width: Spacing.lg,
    height: Spacing.lg,
    borderRadius: Radius.sm,
    backgroundColor: Surface.high,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    color: OnSurface.variant,
    fontSize: 14,
    transform: [{ rotate: '90deg' }],
  },
  chevronOpen: {
    transform: [{ rotate: '-90deg' }],
  },
  title: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  content: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    marginLeft: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Surface.container,
  },
});
