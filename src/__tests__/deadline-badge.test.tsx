/**
 * The deadline badge on the task cards: its words and colours (orange, never the red of an
 * error). The date picker that sets a deadline only exists on the phone, so the badge cannot be
 * seen on the web preview: this test stands in for that check.
 */

import React from 'react';
import { Text, View } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { DeadlineBadge } from '@/components/tasks/DeadlineBadge';
import { darkPalette } from '@/constants/palettes';
import { useAppStore } from '@/store/app-store';

const now = new Date(2026, 10, 7, 15, 0);

function render(dueDate?: string) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<DeadlineBadge dueDate={dueDate} now={now} />);
  });
  return renderer;
}

describe('DeadlineBadge', () => {
  beforeEach(() => act(() => useAppStore.setState({ themeMode: 'dark' })));

  it.each([
    ['2026-11-10', 'J-3', darkPalette.onSurface.variant],
    ['2026-11-08', 'Demain', darkPalette.priority.HIGH],
    ['2026-11-07', 'Aujourd’hui', darkPalette.priority.HIGH],
    ['2026-11-01', 'En retard', darkPalette.priority.HIGH],
  ])('shows %s as "%s" in the right colour', (dueDate, label, color) => {
    const renderer = render(dueDate);
    const text = renderer.root.findByType(Text);
    expect(text.props.children).toBe(label);
    expect(text.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color })]));
    expect(color).not.toBe(darkPalette.error.default);
    expect(renderer.root.findByType(View).props.accessibilityLabel).toBe(`Échéance : ${label}`);
  });

  it('shows nothing without a deadline', () => {
    expect(render(undefined).toJSON()).toBeNull();
  });
});
