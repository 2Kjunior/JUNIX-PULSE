/**
 * The chooser of a new item: where each choice opens (with the day and hour of the Planning),
 * and what it says. Two families: "something to do" opens on its two ways (without or with an
 * alert), "a moment" opens the event form.
 */

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { NewItemChooser } from '@/components/create/NewItemChooser';
import { newItemRoute } from '@/features/create/new-item-route';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (route: unknown) => mockPush(route) } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const day = new Date(2026, 10, 24, 9, 0);

function render(props: Partial<React.ComponentProps<typeof NewItemChooser>>) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<NewItemChooser visible onClose={() => {}} {...props} />);
  });
  return renderer;
}

const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAllByType(Text).map(node => String(node.props.children));

const press = (renderer: ReactTestRenderer.ReactTestRenderer, testID: string) => {
  const target = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.testID === testID);
  act(() => target?.props.onPress());
};

describe('where each choice opens', () => {
  it('passes the day to every form, and the hour only to a reminder or an event', () => {
    expect(newItemRoute('reminder', day, 14)).toEqual({ pathname: '/reminders/new', params: { defaultDate: '2026-11-24', defaultHour: '14' } });
    expect(newItemRoute('event', day, 9)).toEqual({ pathname: '/events/new', params: { defaultDate: '2026-11-24', defaultHour: '9' } });
    expect(newItemRoute('task', day, 14)).toEqual({ pathname: '/tasks/new', params: { defaultDate: '2026-11-24' } });
  });

  it('opens plain forms from the home screen, and the quick capture without any day', () => {
    expect(newItemRoute('task')).toEqual({ pathname: '/tasks/new', params: {} });
    expect(newItemRoute('capture', day, 14)).toEqual({ pathname: '/capture', params: {} });
  });
});

describe('the chooser', () => {
  beforeEach(() => mockPush.mockClear());

  it('offers two families, each with its name and its rule', () => {
    const shown = texts(render({}));
    expect(shown).toEqual(
      expect.arrayContaining([
        'Que voulez-vous ajouter ?',
        'Une chose à faire',
        'À faire',
        'Un moment qui a lieu',
        'Moment',
        'Ça occupe le planning, du début à la fin',
      ])
    );
    expect(shown).not.toContain('Rappel');
    expect(shown).not.toContain('Sans alerte');
  });

  it('opens something to do on its two ways, each opening its form', () => {
    const renderer = render({});
    press(renderer, 'new-item-todo');
    expect(texts(renderer)).toEqual(expect.arrayContaining(['Sans alerte', 'Avec une alerte à une heure']));
    press(renderer, 'new-item-reminder');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/reminders/new', params: {} });
  });

  it('offers the quick capture first from the home screen', () => {
    const renderer = render({ withCapture: true });
    expect(texts(renderer)[1]).toBe('Écrire ou dicter en une phrase');
    press(renderer, 'new-item-capture');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/capture', params: {} });
  });

  it('opens the chosen form on the slot touched in the Planning, and closes itself', () => {
    const onClose = jest.fn();
    const renderer = render({ date: day, hour: 14, onClose });
    expect(texts(renderer)).toContain('Créneau de 14:00');
    press(renderer, 'new-item-moment');
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/new', params: { defaultDate: '2026-11-24', defaultHour: '14' } });
  });
});
