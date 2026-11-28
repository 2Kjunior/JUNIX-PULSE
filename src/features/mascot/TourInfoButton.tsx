/**
 * TourInfoButton: a small ⓘ next to the subtitle of a tab (sheet 045). It gives the tab's tour
 * again, at once, even if it was seen and even with Pulse switched off. Small to the eye so the
 * titles keep their room, 44 dp to the finger (hitSlop).
 */
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import type { TourId } from '@/domain/rules/mascot-tour-rules';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { replayTour } from './HomeTour';

export function TourInfoButton({ tour }: { tour: TourId }) {
  const t = useT();
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => replayTour(tour)}
      hitSlop={14}
      accessibilityRole="button"
      accessibilityLabel={t('tour.replayA11y')}
      testID={`tour-info-${tour}`}
    >
      <Ionicons name="information-circle-outline" size={16} color={palette.onSurface.variant} />
    </TouchableOpacity>
  );
}
