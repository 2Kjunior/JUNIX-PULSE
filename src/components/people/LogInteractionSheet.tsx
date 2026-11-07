/**
 * Noting an exchange with a person, in a glass sheet from the bottom: the kind of exchange and
 * a note. It used to fill a whole section of the person page; a button opens it now.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import type { InteractionType } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { MessageKey, useT } from '@/i18n';
import { makePersonDetailStyles } from '@/styles/people/person-detail-styles';

export interface InteractionTypeConfig {
  type: InteractionType;
  labelKey: MessageKey;
  icon: 'call-outline' | 'chatbubble-outline' | 'logo-whatsapp' | 'people-outline' | 'mail-outline' | 'document-text-outline';
}

export const INTERACTION_TYPES: readonly InteractionTypeConfig[] = [
  { type: 'CALL', labelKey: 'interaction.CALL', icon: 'call-outline' },
  { type: 'SMS', labelKey: 'interaction.SMS', icon: 'chatbubble-outline' },
  { type: 'WHATSAPP', labelKey: 'interaction.WHATSAPP', icon: 'logo-whatsapp' },
  { type: 'IN_PERSON', labelKey: 'interaction.IN_PERSON', icon: 'people-outline' },
  { type: 'EMAIL', labelKey: 'interaction.EMAIL', icon: 'mail-outline' },
  { type: 'OTHER', labelKey: 'interaction.OTHER', icon: 'document-text-outline' },
];

interface LogInteractionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (type: InteractionType, notes: string) => Promise<void>;
}

export function LogInteractionSheet({ visible, onClose, onSave }: LogInteractionSheetProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makePersonDetailStyles);
  const sheetStyles = useThemedStyles(makeSheetStyles);
  const [type, setType] = useState<InteractionType>('CALL');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(type, notes.trim());
      setNotes('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]} accessibilityViewIsModal>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title} accessibilityRole="header">
            {t('person.logTitle')}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            <View style={styles.typeRow}>
              {INTERACTION_TYPES.map(item => {
                const selected = type === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[styles.typeChip, selected && styles.typeChipActive]}
                    onPress={() => setType(item.type)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(item.labelKey)}
                  >
                    <Ionicons name={item.icon} size={16} color={selected ? theme.primary.onContainer : theme.onSurface.variant} />
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>{t(item.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TextInput
            style={styles.logInput}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('person.logNotesPlaceholder')}
            placeholderTextColor={theme.onSurface.disabled}
            multiline
            numberOfLines={2}
            accessibilityLabel={t('person.logNotesPlaceholder')}
          />

          <Button label={t('person.logButton')} onPress={save} variant="primary" size="md" loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeSheetStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    sheet: {
      // Opaque: without blur (Android, web) the screen behind would show through the list
      backgroundColor: theme.surface.container,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      gap: Spacing.md,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.onSurface.disabled,
      alignSelf: 'center',
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
