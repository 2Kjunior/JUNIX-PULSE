/**
 * Hook utilitaire pour créer des styles dépendants du thème.
 *
 * Pattern de fabrique `makeStyles` :
 * Au lieu d'évaluer `StyleSheet.create` au niveau module (qui fige les couleurs),
 * on passe une fonction pure `(theme: ThemePalette) => StyleSheet` à `useThemedStyles`.
 *
 * La mémoïsation est basée sur l'instance de `theme`. Comme `darkPalette` et
 * `lightPalette` sont des singletons statiques, le cache ne recalcule les styles
 * qu'en cas de changement effectif de thème.
 *
 * @example
 * ```tsx
 * const makeStyles = (t: ThemePalette) => StyleSheet.create({
 *   container: { backgroundColor: t.surface.base },
 *   title: { color: t.onSurface.primary },
 * });
 *
 * export function MyComponent() {
 *   const styles = useThemedStyles(makeStyles);
 *   return <View style={styles.container}><Text style={styles.title}>Hello</Text></View>;
 * }
 * ```
 */

import { useMemo } from 'react';
import { ThemePalette } from '@/constants/palettes';
import { useTheme } from './use-theme';

export function useThemedStyles<T>(makeStyles: (theme: ThemePalette) => T): T {
  const { theme } = useTheme();
  return useMemo(() => makeStyles(theme), [theme, makeStyles]);
}
