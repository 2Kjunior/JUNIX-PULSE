/**
 * The glass effect switch of the settings: off, every glass surface (cards, bars, buttons, the
 * mascot) turns to a plain background, exactly as when the phone asks to reduce transparency.
 * It is saved with the settings but stays out of the backups, like the app lock.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { MIGRATIONS } from '@/database/migrations';
import { getDatabase } from '@/database/sqlite';
import { useReduceTransparency } from '@/hooks/use-reduce-transparency';
import { SettingsRepository } from '@/repositories/settings-repository';
import { useAppStore } from '@/store/app-store';

jest.mock('@/database/sqlite', () => ({ getDatabase: jest.fn() }));

function readHook(): { current: boolean; unmount: () => void } {
  const result = { current: false, unmount: () => {} };
  function Probe() {
    result.current = useReduceTransparency();
    return null;
  }
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Probe />);
  });
  result.unmount = () => act(() => renderer.unmount());
  return result;
}

describe('glass effect', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
    act(() => useAppStore.setState({ reduceTransparency: false }));
  });

  it('is on by default, and off as soon as the setting says so', () => {
    const hook = readHook();
    expect(hook.current).toBe(false);
    act(() => useAppStore.getState().setReduceTransparency(true));
    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('still follows the phone when the phone asks for less transparency', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);
    const hook = readHook();
    await act(async () => {});
    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('is read from and written to the settings', async () => {
    const db = { getFirstAsync: jest.fn(), runAsync: jest.fn() };
    (getDatabase as jest.Mock).mockResolvedValue(db);
    db.getFirstAsync.mockResolvedValueOnce({ id: '1', reduce_transparency: 1 });
    expect((await SettingsRepository.get())?.reduceTransparency).toBe(true);
    db.getFirstAsync.mockResolvedValueOnce({ id: '1' });
    expect((await SettingsRepository.get())?.reduceTransparency).toBe(false);

    await SettingsRepository.update({ reduceTransparency: true, updatedAt: 'now' });
    const [query, ...values] = db.runAsync.mock.calls[0];
    expect(query).toContain('reduce_transparency = ?');
    expect(values).toContain(1);
  });

  it('comes with migration 32, off for everyone at first', () => {
    expect(MIGRATIONS.find(m => m.version === 32)?.sql).toContain(
      'ALTER TABLE settings ADD COLUMN reduce_transparency INTEGER NOT NULL DEFAULT 0;'
    );
  });
});
