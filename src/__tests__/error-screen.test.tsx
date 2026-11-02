import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ErrorScreen } from '../components/feedback/ErrorScreen';

function textsOf(root: ReactTestRenderer.ReactTestRenderer): string[] {
  return root.root.findAllByType(Text).map(node => String(node.props.children));
}

describe('ErrorScreen', () => {
  it('shows the message and retries on demand', () => {
    const onRetry = jest.fn();
    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(
        <ErrorScreen title="Oups" body="Un problème est survenu." onRetry={onRetry} />
      );
    });

    expect(textsOf(root!)).toEqual(expect.arrayContaining(['Oups', 'Un problème est survenu.']));

    act(() => root!.root.findByProps({ testID: 'error-retry', accessibilityRole: 'button' }).props.onPress());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the technical detail in development only', () => {
    const globals = globalThis as unknown as { __DEV__: boolean };
    const initial = globals.__DEV__;
    const render = () => {
      let root: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        root = ReactTestRenderer.create(
          <ErrorScreen title="Oups" body="Message" detail="db is locked" onRetry={jest.fn()} />
        );
      });
      return textsOf(root!);
    };

    globals.__DEV__ = true;
    expect(render()).toContain('db is locked');

    globals.__DEV__ = false;
    expect(render()).not.toContain('db is locked');

    globals.__DEV__ = initial;
  });
});
