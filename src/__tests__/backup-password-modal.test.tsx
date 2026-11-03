import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { BackupPasswordModal } from '../components/ui/BackupPasswordModal';

function renderModal({ confirmPassword = true, onSubmit = jest.fn(async () => undefined) } = {}) {
  let root: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    root = ReactTestRenderer.create(
      <BackupPasswordModal
        visible
        title="Sauvegarde"
        confirmLabel="Créer"
        confirmPassword={confirmPassword}
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />
    );
  });
  return root!;
}

const field = (root: ReactTestRenderer.ReactTestRenderer, testID: string) =>
  root.root.findAllByType(TextInput).find(input => input.props.testID === testID)!;

const pressEye = (root: ReactTestRenderer.ReactTestRenderer, testID: string) =>
  act(() => root.root.findByProps({ testID: `${testID}-reveal`, accessibilityRole: 'button' }).props.onPress());

const rule = (root: ReactTestRenderer.ReactTestRenderer, text: string) =>
  root.root.findAll(node => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith(text))[0];

describe('BackupPasswordModal', () => {
  it('gives each field its own eye', () => {
    const root = renderModal();

    pressEye(root, 'backup-password');

    expect(field(root, 'backup-password').props.secureTextEntry).toBe(false);
    expect(field(root, 'backup-password-confirm').props.secureTextEntry).toBe(true);
  });

  it('ticks the rules while the user types', () => {
    const root = renderModal();

    expect(rule(root, '10 caractères minimum').props.accessibilityLabel).toContain('à faire');
    act(() => field(root, 'backup-password').props.onChangeText('dix-chars!'));
    act(() => field(root, 'backup-password-confirm').props.onChangeText('dix-chars!'));

    expect(rule(root, '10 caractères minimum').props.accessibilityLabel).toContain('validé');
    expect(rule(root, 'Les deux mots de passe').props.accessibilityLabel).toContain('validé');
  });

  it('accepts a password of ten characters', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const root = renderModal({ onSubmit });

    act(() => field(root, 'backup-password').props.onChangeText('dix-chars!'));
    act(() => field(root, 'backup-password-confirm').props.onChangeText('dix-chars!'));
    await act(async () => field(root, 'backup-password-confirm').props.onSubmitEditing());

    expect(onSubmit).toHaveBeenCalledWith('dix-chars!');
  });

  it('refuses nine characters', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const root = renderModal({ onSubmit });

    act(() => field(root, 'backup-password').props.onChangeText('neuf-car!'));
    act(() => field(root, 'backup-password-confirm').props.onChangeText('neuf-car!'));
    await act(async () => field(root, 'backup-password-confirm').props.onSubmitEditing());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('only asks for the password when opening a backup', () => {
    const root = renderModal({ confirmPassword: false });

    expect(root.root.findAllByType(TextInput)).toHaveLength(1);
    expect(rule(root, '10 caractères minimum')).toBeUndefined();
  });
});
