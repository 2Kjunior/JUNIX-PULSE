import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { GlassActionButton } from '../components/ui/GlassActionButton';
import { darkPalette, lightPalette } from '../constants/palettes';
import { contrastRatio } from '../utils/color';

function blendOver(rgba: string, background: readonly [number, number, number]): string {
  const [r, g, b, a] = (rgba.match(/[\d.]+/g) ?? []).map(Number);
  const channel = (top: number, bottom: number) =>
    Math.round(top * a + bottom * (1 - a)).toString(16).padStart(2, '0');
  return `#${channel(r, background[0])}${channel(g, background[1])}${channel(b, background[2])}`;
}

describe('glass buttons', () => {
  it.each([
    ['dark', darkPalette],
    ['light', lightPalette],
  ])('keeps white text readable on the main buttons over a white background (%s)', (_mode, palette) => {
    for (const color of palette.gradient.glassPrimary) {
      expect(contrastRatio('#FFFFFF', blendOver(color, [255, 255, 255]))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('exposes its action to assistive technologies and runs it on press', () => {
    const onPress = jest.fn();
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <GlassActionButton
          icon="trash-outline"
          label="Supprimer"
          color="#DC2626"
          onPress={onPress}
          accessibilityLabel="Supprimer ce rappel"
        />
      );
    });

    const button = root!.root.findByProps({ accessibilityLabel: 'Supprimer ce rappel', accessibilityRole: 'button' });
    act(() => button.props.onPress());

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
