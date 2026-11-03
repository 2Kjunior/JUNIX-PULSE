/**
 * SwipeableItem — Interaction gestuelle iOS-like sur les cartes.
 *
 * Comportement :
 * - Swipe vers la gauche → la card glisse, révélant des boutons d'action
 *   qui APPARAISSENT DEPUIS LA DROITE (pattern iOS natif).
 * - Les boutons ne sont JAMAIS dans l'arrière-plan de la card — ils sont
 *   affichés dans un panneau adjacent, révélé derrière la card qui glisse.
 * - Boutons en verre teinté (GlassActionButton), identiques sur iOS et Android.
 * - Couleurs issues à 100% de la palette officielle ThemePalette.
 *
 * Architecture :
 * ┌──────────────────────────────────────────────────┐
 * │ ReanimatedSwipeable (RNGH)                       │
 * │  ├── [Card content]   ← glisse vers la gauche   │
 * │  └── [Right actions]  ← révélés depuis la droite│
 * │        ├── [Delete btn] verre teinté error       │
 * │        └── [Edit btn]   verre teinté primary     │
 * └──────────────────────────────────────────────────┘
 *
 * Accessibilité : WCAG 2.2 AA — rôles et labels explicites.
 */

import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
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
import { GlassActionButton } from '@/components/ui/GlassActionButton';
import { SwipeAccessibilityContext } from '@/components/ui/swipe-accessibility';
import { Spacing } from '@/constants/theme';

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

// ─── Bouton d'action animé avec le geste ─────────────────────────────────────

interface SwipeActionButtonProps {
  action: SwipeAction;
  progress: SharedValue<number>;
  index: number;
  total: number;
  onPress: () => void;
}

function SwipeActionButton({
  action,
  progress,
  index,
  total,
  onPress,
}: SwipeActionButtonProps) {
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
      <GlassActionButton
        icon={action.icon}
        label={action.label}
        color={action.color}
        onPress={onPress}
        layout="stacked"
      />
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
        <SwipeActionButton
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

  const accessibilityActions = useMemo(
    () => [...(leftActions ?? []), ...(rightActions ?? [])],
    [leftActions, rightActions]
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
      <SwipeAccessibilityContext.Provider value={accessibilityActions}>
        {children}
      </SwipeAccessibilityContext.Provider>
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
});
