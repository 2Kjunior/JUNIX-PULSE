/**
 * SwipeableItem — Interaction gestuelle iOS-like sur les cartes.
 *
 * Comportement :
 * - Swipe vers la gauche → la card glisse, révélant des boutons d'action
 *   qui APPARAISSENT DEPUIS LA DROITE (pattern iOS natif).
 * - Les boutons ne sont JAMAIS dans l'arrière-plan de la card — ils sont
 *   affichés dans un panneau adjacent, révélé derrière la card qui glisse.
 * - Effet LiquidGlass sur les boutons : GlassView (expo-glass-effect) sur iOS,
 *   fallback glassmorphism semi-transparent sur Android.
 * - Couleurs issues à 100% de la palette officielle ThemePalette.
 *
 * Architecture :
 * ┌──────────────────────────────────────────────────┐
 * │ ReanimatedSwipeable (RNGH)                       │
 * │  ├── [Card content]   ← glisse vers la gauche   │
 * │  └── [Right actions]  ← révélés depuis la droite│
 * │        ├── [Delete btn] GlassView + accent error │
 * │        └── [Edit btn]   GlassView + accent primary│
 * └──────────────────────────────────────────────────┘
 *
 * Accessibilité : WCAG 2.2 AA — rôles et labels explicites.
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Radius, Spacing, Typography } from '@/constants/theme';

// ─── Types publics ────────────────────────────────────────────────────────────

export interface SwipeAction {
  /** Identifiant unique de l'action */
  key: string;
  /** Icône Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Label texte sous l'icône */
  label: string;
  /**
   * Couleur de l'action — doit provenir de la palette officielle.
   * Exemples : palette.error.default, palette.primary.default, palette.tertiary.default
   */
  color: string;
  /** Callback déclenché quand l'utilisateur appuie sur le bouton */
  onPress: () => void;
}

export interface SwipeableItemProps {
  children: React.ReactNode;
  /** Actions affichées lors du swipe gauche */
  rightActions?: SwipeAction[];
  /** Actions affichées lors du swipe droit (rare, ex. complétion) */
  leftActions?: SwipeAction[];
  /** Désactive entièrement le swipe si false */
  enabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

// ─── Dimensions ──────────────────────────────────────────────────────────────

const ACTION_BUTTON_WIDTH = 72;

// ─── Composant bouton d'action LiquidGlass ───────────────────────────────────

interface GlassActionButtonProps {
  action: SwipeAction;
  progress: SharedValue<number>;
  index: number;
  total: number;
  onPress: () => void;
}

function GlassActionButton({
  action,
  progress,
  index,
  total,
  onPress,
}: GlassActionButtonProps) {
  // Animation synchronisée avec le geste de slide
  // Le dernier bouton (index = total - 1) apparaît en premier (le plus proche du bord)
  const delay = (total - 1 - index) * 0.1;

  const animatedStyle = useAnimatedStyle(() => {
    // scale : 0.6 → 1 synchronisé avec la progression du swipe
    const scale = interpolate(
      progress.value,
      [0 + delay, 0.6 + delay, 1],
      [0.6, 0.9, 1],
      Extrapolation.CLAMP
    );
    // opacity : 0 → 1 avec une courbe douce
    const opacity = interpolate(
      progress.value,
      [0, 0.3 + delay, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    );
    // translateX : glisse depuis la droite vers la position finale
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [ACTION_BUTTON_WIDTH * 0.5, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }, { translateX }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.actionButtonWrapper, animatedStyle]}>
      <TouchableOpacity
        style={styles.actionTouchable}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        {/* LiquidGlass sur iOS, glassmorphism fallback sur Android */}
        <GlassView
          style={[styles.glassButton]}
          glassEffectStyle="regular"
          colorScheme="dark"
        >
          {/* Tint coloré semi-transparent pour l'identité de l'action */}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.colorTint,
              { backgroundColor: action.color + '26' }, // 15% opacity
            ]}
          />
          {/* Bordure lumineuse */}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.glassBorder,
              { borderColor: action.color + '50' }, // 31% opacity
            ]}
          />
          {/* Contenu (icône + label) */}
          <Ionicons name={action.icon} size={22} color={action.color} />
          <Text
            style={[styles.actionLabel, { color: action.color }]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </GlassView>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Panneau d'actions (rendu par ReanimatedSwipeable) ───────────────────────

interface ActionsContainerProps {
  actions: SwipeAction[];
  progress: SharedValue<number>;
  methods: SwipeableMethods;
  side: 'left' | 'right';
}

function ActionsContainer({
  actions,
  progress,
  methods,
  side,
}: ActionsContainerProps) {
  const containerWidth = actions.length * ACTION_BUTTON_WIDTH;

  return (
    <View
      style={[
        styles.actionsContainer,
        { width: containerWidth },
        side === 'left' ? styles.actionsLeft : styles.actionsRight,
      ]}
    >
      {actions.map((action, index) => (
        <GlassActionButton
          key={action.key}
          action={action}
          progress={progress}
          index={index}
          total={actions.length}
          onPress={() => {
            methods.close();
            action.onPress();
          }}
        />
      ))}
    </View>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SwipeableItem({
  children,
  rightActions,
  leftActions,
  enabled = true,
  containerStyle,
}: SwipeableItemProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const hasActions =
    (rightActions && rightActions.length > 0) ||
    (leftActions && leftActions.length > 0);

  const rightWidth = (rightActions?.length ?? 0) * ACTION_BUTTON_WIDTH;
  const leftWidth = (leftActions?.length ?? 0) * ACTION_BUTTON_WIDTH;

  const renderRightActions = useCallback(
    (
      progress: SharedValue<number>,
      _dragX: SharedValue<number>,
      methods: SwipeableMethods
    ) => {
      if (!rightActions || rightActions.length === 0) return null;
      return (
        <ActionsContainer
          actions={rightActions}
          progress={progress}
          methods={methods}
          side="right"
        />
      );
    },
    [rightActions]
  );

  const renderLeftActions = useCallback(
    (
      progress: SharedValue<number>,
      _dragX: SharedValue<number>,
      methods: SwipeableMethods
    ) => {
      if (!leftActions || leftActions.length === 0) return null;
      return (
        <ActionsContainer
          actions={leftActions}
          progress={progress}
          methods={methods}
          side="left"
        />
      );
    },
    [leftActions]
  );

  if (!enabled || !hasActions) {
    return <View style={containerStyle}>{children}</View>;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      overshootLeft={false}
      rightThreshold={rightWidth * 0.35}
      leftThreshold={leftWidth * 0.35}
      renderRightActions={rightActions?.length ? renderRightActions : undefined}
      renderLeftActions={leftActions?.length ? renderLeftActions : undefined}
      containerStyle={containerStyle}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

// ─── Helper : créer les actions standard (delete + edit) ─────────────────────

/**
 * Génère les actions right-swipe standard :
 * - Supprimer (rouge error de la palette)
 * - Modifier (violet primary de la palette)
 *
 * Usage :
 * ```tsx
 * rightActions={makeStandardRightActions({
 *   palette,
 *   onDelete: handleDelete,
 *   onEdit: () => router.push(`/habits/${id}`),
 * })}
 * ```
 */
export function makeStandardRightActions({
  palette,
  onDelete,
  onEdit,
  deleteLabel = 'Supprimer',
  editLabel = 'Modifier',
}: {
  palette: import('@/constants/palettes').ThemePalette;
  onDelete?: () => void;
  onEdit?: () => void;
  deleteLabel?: string;
  editLabel?: string;
}): SwipeAction[] {
  const actions: SwipeAction[] = [];

  if (onEdit) {
    actions.push({
      key: 'edit',
      icon: 'pencil-outline',
      label: editLabel,
      color: palette.primary.default,
      onPress: onEdit,
    });
  }

  if (onDelete) {
    actions.push({
      key: 'delete',
      icon: 'trash-outline',
      label: deleteLabel,
      color: palette.error.default,
      onPress: onDelete,
    });
  }

  return actions;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // Pas de marginBottom ici — la gestion de l'espacement est dans
    // containerStyle transmis par les écrans parents.
  },
  actionsLeft: {
    justifyContent: 'flex-start',
    paddingRight: Spacing.sm,
  },
  actionsRight: {
    justifyContent: 'flex-end',
    paddingLeft: Spacing.sm,
  },
  actionButtonWrapper: {
    width: ACTION_BUTTON_WIDTH,
    paddingHorizontal: Spacing.xs,
    alignSelf: 'stretch',
  },
  actionTouchable: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  glassButton: {
    flex: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Fallback Android : fond semi-transparent sombre
    backgroundColor: Platform.OS === 'android'
      ? 'rgba(30, 28, 35, 0.82)'
      : 'transparent',
    // Ombre subtile pour séparer visuellement du fond
    ...Platform.select({
      android: {
        elevation: 4,
      },
    }),
  },
  colorTint: {
    borderRadius: Radius.lg,
  },
  glassBorder: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  actionLabel: {
    ...Typography.labelSmall,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
