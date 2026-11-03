/**
 * Password of an encrypted backup: to create one, or to open one.
 * Each field has its own eye, inside the field, as in the usual password forms. When creating,
 * the rules are shown from the start and tick as they are met, instead of appearing as errors.
 */

import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useT } from '@/i18n';
import { BACKUP_PASSPHRASE_MAX_LENGTH, BACKUP_PASSPHRASE_MIN_LENGTH } from '@/services/backup-crypto';

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
  const styles = useThemedStyles(makeBackupPasswordModalStyles);
  const t = useT();
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

  const longEnough =
    password.length >= BACKUP_PASSPHRASE_MIN_LENGTH && password.length <= BACKUP_PASSPHRASE_MAX_LENGTH;
  const matching = password.length > 0 && password === confirmation;

  const handleSubmit = async () => {
    if (!longEnough) {
      setError(t('backupPassword.length'));
      return;
    }
    if (confirmPassword && !matching) {
      setError(t('backupPassword.mismatch'));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('backupPassword.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{t('backupPassword.notice')}</Text>

          <PasswordField
            value={password}
            onChangeText={text => {
              setPassword(text);
              setError(null);
            }}
            placeholder={t('backupPassword.placeholder')}
            accessibilityLabel={t('backupPassword.a11y')}
            editable={!busy}
            returnKeyType={confirmPassword ? 'next' : 'done'}
            onSubmitEditing={confirmPassword ? undefined : handleSubmit}
            testID="backup-password"
          />

          {confirmPassword && (
            <PasswordField
              value={confirmation}
              onChangeText={text => {
                setConfirmation(text);
                setError(null);
              }}
              placeholder={t('backupPassword.confirmPlaceholder')}
              accessibilityLabel={t('backupPassword.confirmA11y')}
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              testID="backup-password-confirm"
            />
          )}

          {/* Rules shown before submitting, only when creating: opening a backup only needs its password */}
          {confirmPassword && (
            <View style={styles.rules}>
              <PasswordRule met={longEnough} label={t('backupPassword.ruleLength', { count: BACKUP_PASSPHRASE_MIN_LENGTH })} />
              <PasswordRule met={matching} label={t('backupPassword.ruleMatch')} />
            </View>
          )}

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} disabled={busy} style={styles.action} />
            <Button
              label={busy ? t('backupPassword.busy') : confirmLabel}
              variant="primary"
              onPress={handleSubmit}
              disabled={busy}
              loading={busy}
              style={styles.action}
              testID="backup-password-submit"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface PasswordFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  editable: boolean;
  returnKeyType: 'next' | 'done';
  onSubmitEditing?: () => void;
  testID: string;
}

/** A field and its own eye. The eye belongs to the field, so the whole frame reacts to focus. */
function PasswordField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  editable,
  returnKeyType,
  onSubmitEditing,
  testID,
}: PasswordFieldProps) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeBackupPasswordModalStyles);
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.onSurface.disabled}
        secureTextEntry={!revealed}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        editable={editable}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.fieldInput}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      />
      <TouchableOpacity
        style={styles.revealButton}
        onPress={() => setRevealed(current => !current)}
        accessibilityRole="button"
        accessibilityLabel={revealed ? t('backupPassword.hide') : t('backupPassword.show')}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        testID={`${testID}-reveal`}
      >
        <Ionicons
          name={revealed ? 'eye-off-outline' : 'eye-outline'}
          size={22}
          color={focused ? palette.primary.default : palette.onSurface.variant}
        />
      </TouchableOpacity>
    </View>
  );
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeBackupPasswordModalStyles);
  const t = useT();

  return (
    <View
      style={styles.rule}
      accessible
      accessibilityLabel={`${label}, ${met ? t('backupPassword.ruleMet') : t('backupPassword.ruleUnmet')}`}
    >
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? palette.success.default : palette.onSurface.variant}
      />
      <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{label}</Text>
    </View>
  );
}

const makeBackupPasswordModalStyles = (theme: ThemePalette) =>
  StyleSheet.create({
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
      borderColor: theme.glass.nav.borderColor,
      backgroundColor: theme.glass.nav.backgroundColor,
    },
    title: {
      ...Typography.headlineMedium,
      color: theme.onSurface.primary,
    },
    description: {
      ...Typography.bodyMedium,
      color: theme.onSurface.variant,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
      backgroundColor: theme.glass.control.backgroundColor,
    },
    fieldFocused: {
      borderColor: theme.primary.default,
    },
    fieldInput: {
      flex: 1,
      minHeight: 52,
      paddingLeft: Spacing.md,
      paddingRight: Spacing.xs,
      color: theme.onSurface.primary,
      ...Typography.bodyMedium,
    },
    revealButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rules: {
      gap: 6,
    },
    rule: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    ruleText: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
    },
    ruleTextMet: {
      color: theme.onSurface.primary,
    },
    error: {
      ...Typography.bodySmall,
      color: theme.error.default,
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
