/**
 * useScreenFocused: a mascot on a tab that is hidden must rest, and wake when the tab is shown again.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { useScreenFocused } from '../features/mascot/use-screen-focused';

// A screen that the test can send behind another one and bring back
let focusScreen: () => void = () => {};
let blurScreen: () => void = () => {};

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    useFocusEffect: (cb: () => (() => void) | void) => {
      ReactModule.useEffect(() => {
        let cleanup = cb();
        focusScreen = () => {
          cleanup = cb();
        };
        blurScreen = () => {
          if (cleanup) cleanup();
        };
        return () => {
          if (cleanup) cleanup();
        };
      }, [cb]);
    },
  };
});

function Probe({ onValue }: { onValue: (focused: boolean) => void }) {
  onValue(useScreenFocused());
  return null;
}

describe('useScreenFocused', () => {
  it('is true on a screen that is shown, false once it is behind another, true again when it returns', () => {
    const values: boolean[] = [];
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Probe onValue={value => values.push(value)} />);
    });
    expect(values[values.length - 1]).toBe(true);

    act(() => blurScreen());
    expect(values[values.length - 1]).toBe(false);

    act(() => focusScreen());
    expect(values[values.length - 1]).toBe(true);

    act(() => renderer.unmount());
  });
});
