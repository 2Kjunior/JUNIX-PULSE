/**
 * The orb A1 in the app and the launch animation: one drawing with the right numbers, a timeline
 * in order, a launch that can be skipped and always ends, and Pulse only when the mascot is on.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { PulseLogo } from '../components/ui/PulseLogo';
import {
  ORB_BEAT_LENGTH,
  ORB_BEAT_PATH,
  ORB_LIQUID_HIDDEN_DROP,
  ORB_LIQUID_RADIUS,
  ORB_VARIANTS,
  ORB_WAVE,
  orbWavePath,
} from '../constants/orb-logo';
import { SplashAnimation } from '../features/launch/SplashAnimation';
import { SPLASH_HEARTBEAT, SPLASH_TIMINGS } from '../features/launch/splash-constants';
import { PulseMascot } from '../features/mascot/PulseMascot';
import { useAppStore } from '../store/app-store';

// The sound module cannot load in tests: a stand-in player, as in notification-sound-service.test.ts
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ volume: 1, play: jest.fn(), pause: jest.fn(), remove: jest.fn() }),
}));

/** Length of a path made of M, H and L commands, by following the pen. */
function lineLength(path: string): number {
  const parts = path.match(/[A-Z]|-?\d+(?:\.\d+)?/g) ?? [];
  let x = 0;
  let y = 0;
  let total = 0;
  let index = 0;
  while (index < parts.length) {
    const command = parts[index++];
    if (command === 'H') {
      const nextX = Number(parts[index++]);
      total += Math.abs(nextX - x);
      x = nextX;
    } else {
      const nextX = Number(parts[index++]);
      const nextY = Number(parts[index++]);
      if (command === 'L') total += Math.hypot(nextX - x, nextY - y);
      x = nextX;
      y = nextY;
    }
  }
  return total;
}

/** The x of the first and last points of a wave outline. */
function waveSpan(path: string): { from: number; to: number } {
  const xs = [...path.matchAll(/[MT](-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  return { from: xs[0], to: xs[xs.length - 1] };
}

describe('the orb drawing', () => {
  it('gives the beat its true length, so it is drawn to the very end', () => {
    const length = lineLength(ORB_BEAT_PATH);
    expect(ORB_BEAT_LENGTH).toBeGreaterThanOrEqual(length);
    expect(ORB_BEAT_LENGTH - length).toBeLessThan(1);
  });

  it('hides the liquid fully at the start, and covers the whole orb wherever the wave slides', () => {
    // The top of the highest crest is still below the inside of the orb
    expect(ORB_WAVE.surfaceY + ORB_LIQUID_HIDDEN_DROP - ORB_WAVE.depth).toBeGreaterThan(ORB_LIQUID_RADIUS);
    for (const slide of [0, ORB_WAVE.period]) {
      const { from, to } = waveSpan(orbWavePath(0, slide));
      expect(from).toBeLessThanOrEqual(-ORB_LIQUID_RADIUS);
      expect(to).toBeGreaterThanOrEqual(ORB_LIQUID_RADIUS);
    }
    expect(orbWavePath(0, 0)).toContain(`M-150 ${ORB_WAVE.surfaceY} `);
  });
});

describe('the launch timeline', () => {
  it('plays its steps in order and ends before the safety net', () => {
    const T = SPLASH_TIMINGS;
    const heartbeatEnd = T.heartbeatDelayMs + SPLASH_HEARTBEAT.reduce((sum, step) => sum + step.ms, 0);
    expect(T.ringDelayMs).toBeLessThan(T.liquidDelayMs);
    expect(T.liquidDelayMs).toBeLessThan(T.beatDelayMs);
    expect(T.beatDelayMs + T.beatDurationMs).toBeLessThanOrEqual(T.heartbeatDelayMs);
    expect(heartbeatEnd).toBeLessThanOrEqual(T.greetDelayMs);
    expect(T.nameDelayMs + T.nameDurationMs).toBeLessThanOrEqual(T.greetDelayMs);
    expect(T.greetDelayMs + T.greetDurationMs).toBeLessThanOrEqual(T.exitDelayMs);
    expect(T.exitDelayMs + T.exitDurationMs).toBe(T.totalDurationMs);
    expect(T.totalDurationMs).toBeLessThan(T.safetyTimeoutMs);
    expect(T.reducedMotionHoldMs + T.reducedMotionExitMs).toBeLessThan(T.safetyTimeoutMs);
  });
});

describe('the launch animation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function renderSplash(greet: boolean, onFinish: () => void) {
    let root!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(<SplashAnimation greet={greet} onFinish={onFinish} />);
    });
    return root;
  }

  it('ends once when tapped, even when tapped twice', () => {
    const onFinish = jest.fn();
    const root = renderSplash(false, onFinish);
    const skip = root.root.findAllByProps({ accessibilityLabel: 'Junix Pulse' })[0];
    act(() => {
      skip.props.onPress();
      skip.props.onPress();
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('always ends, at the latest with the safety net', () => {
    const onFinish = jest.fn();
    const root = renderSplash(false, onFinish);
    act(() => {
      jest.advanceTimersByTime(SPLASH_TIMINGS.safetyTimeoutMs + 100);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('shows Pulse only when the mascot is on', () => {
    const without = renderSplash(false, jest.fn());
    expect(without.root.findAllByType(PulseMascot)).toHaveLength(0);
    act(() => without.unmount());

    const withPulse = renderSplash(true, jest.fn());
    expect(withPulse.root.findAllByType(PulseMascot)).toHaveLength(1);
    act(() => withPulse.unmount());
  });
});

describe('PulseLogo', () => {
  it('outlines the beat in white on the light theme, as on the validated drawing', () => {
    act(() => {
      useAppStore.setState({ themeMode: 'light' });
    });
    let root!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(<PulseLogo size={64} mode="static" />);
    });
    const light = ORB_VARIANTS.light;
    expect(root.root.findAll((node) => node.props.stroke === light.beat).length).toBeGreaterThan(0);
    expect(root.root.findAll((node) => node.props.stroke === light.beatOutline).length).toBeGreaterThan(0);
    act(() => root.unmount());
  });
});
