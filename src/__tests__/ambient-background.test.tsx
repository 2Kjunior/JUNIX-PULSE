/**
 * Tests for the ambient background: halo trajectories and pause conditions.
 */

import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AmbientBackground } from '../components/ui/AmbientBackground';
import { AMBIENT_GRADIENT_STOPS, AMBIENT_HALOS } from '../constants/ambient';
import { sampleAmbientPose } from '../domain/rules/ambient-motion';
import { useAppStore } from '../store/app-store';

describe('sampleAmbientPose', () => {
  const violet = AMBIENT_HALOS[0].motion;

  it('starts at the first keyframe', () => {
    expect(sampleAmbientPose(violet, 0)).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('reaches each keyframe of the reference', () => {
    const pose = sampleAmbientPose(violet, violet.durationMs * 0.33);
    expect(pose.x).toBeCloseTo(14);
    expect(pose.y).toBeCloseTo(8);
    expect(pose.scale).toBeCloseTo(1.12);
  });

  it('loops without a jump', () => {
    const end = sampleAmbientPose(violet, violet.durationMs - 1);
    const start = sampleAmbientPose(violet, violet.durationMs);
    expect(end.x).toBeCloseTo(start.x, 2);
    expect(end.y).toBeCloseTo(start.y, 2);
    expect(end.scale).toBeCloseTo(start.scale, 2);
  });

  it('applies the head start of the halo', () => {
    const cyan = AMBIENT_HALOS[1].motion;
    expect(sampleAmbientPose(cyan, 0)).toEqual(sampleAmbientPose({ ...cyan, phaseMs: 0 }, 9000));
  });

  it('stays inside the amplitudes of every halo over a whole cycle', () => {
    for (const { motion } of AMBIENT_HALOS) {
      for (let elapsed = 0; elapsed < motion.durationMs; elapsed += 250) {
        const pose = sampleAmbientPose(motion, elapsed);
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(14);
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(14);
        expect(pose.scale).toBeGreaterThanOrEqual(0.92);
        expect(pose.scale).toBeLessThanOrEqual(1.15);
      }
    }
  });
});

describe('AMBIENT_HALOS', () => {
  it('declares 4 halos with different cycles', () => {
    const durations = AMBIENT_HALOS.map((halo) => halo.motion.durationMs);
    expect(durations).toEqual([24000, 28000, 32000, 20000]);
  });

  it('ends the gradient fully transparent', () => {
    expect(AMBIENT_GRADIENT_STOPS[AMBIENT_GRADIENT_STOPS.length - 1].opacity).toBe(0);
  });
});

describe('AmbientBackground', () => {
  const setActive = jest.fn();
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    setActive.mockClear();
    jest
      .spyOn(Reanimated, 'useFrameCallback')
      .mockReturnValue({ setActive, isActive: false, callbackId: -1 });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    act(() => {
      useAppStore.setState({ themeMode: 'dark' });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function render(props: { visible: boolean; revealed: boolean }) {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = ReactTestRenderer.create(<AmbientBackground {...props} />);
    });
    return renderer as ReactTestRenderer.ReactTestRenderer;
  }

  it('runs once visible and revealed', () => {
    render({ visible: true, revealed: true });
    expect(setActive).toHaveBeenLastCalledWith(true);
  });

  it('stays paused during the launch animation', () => {
    render({ visible: true, revealed: false });
    expect(setActive).toHaveBeenLastCalledWith(false);
  });

  it('pauses behind an opaque screen, then resumes', () => {
    const renderer = render({ visible: true, revealed: true });
    act(() => renderer.update(<AmbientBackground visible={false} revealed />));
    expect(setActive).toHaveBeenLastCalledWith(false);
    act(() => renderer.update(<AmbientBackground visible revealed />));
    expect(setActive).toHaveBeenLastCalledWith(true);
  });

  it('pauses in the background, then resumes', () => {
    render({ visible: true, revealed: true });
    act(() => appStateListener?.('background'));
    expect(setActive).toHaveBeenLastCalledWith(false);
    act(() => appStateListener?.('active'));
    expect(setActive).toHaveBeenLastCalledWith(true);
  });

  it('stays still when reduced motion is on', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    render({ visible: true, revealed: true });
    expect(setActive).toHaveBeenLastCalledWith(false);
  });

  it('is hidden from assistive technologies and never intercepts touches', () => {
    const renderer = render({ visible: true, revealed: true });
    const root = renderer.toJSON() as ReactTestRenderer.ReactTestRendererJSON;
    expect(root.props.pointerEvents).toBe('none');
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
