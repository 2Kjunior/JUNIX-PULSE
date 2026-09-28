import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { OnSurface, Outline, Primary, Radius, Spacing, Surface, Typography } from '@/constants/theme';

interface BackupPasswordModalProps {
  visible: boolean;
  title: string;
  confirmLabel: string;
  confirmPassword?: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export function BackupPasswordModal({
  visible,
  title,
  confirmLabel,
  confirmPassword = false,
  onCancel,
  onSubmit,
}: BackupPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setConfirmation('');
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (password.length < 16 || password.length > 256) {
      setError('Utilisez un mot de passe de 16 à 256 caractères.');
      return;
    }
    if (confirmPassword && password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>
            Le mot de passe n’est pas enregistré. Vous en aurez besoin pour restaurer ce fichier.
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe, 16 caractères minimum"
            placeholderTextColor={OnSurface.disabled}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            returnKeyType={confirmPassword ? 'next' : 'done'}
            onSubmitEditing={confirmPassword ? undefined : handleSubmit}
            style={styles.input}
            accessibilityLabel="Mot de passe de sauvegarde"
          />
          {confirmPassword && (
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={OnSurface.disabled}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={styles.input}
              accessibilityLabel="Confirmer le mot de passe de sauvegarde"
            />
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Button label="Annuler" variant="ghost" onPress={onCancel} disabled={busy} style={styles.action} />
            <Button
              label={busy ? 'Traitement...' : confirmLabel}
              variant="secondary"
              onPress={handleSubmit}
              disabled={busy}
              style={styles.action}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  dialog: {
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    backgroundColor: Surface.container,
  },
  title: {
    ...Typography.headlineMedium,
    color: OnSurface.primary,
  },
  description: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    backgroundColor: Surface.base,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
  },
  error: {
    ...Typography.bodySmall,
    color: Primary.default,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  action: {
    minWidth: 96,
  },
});