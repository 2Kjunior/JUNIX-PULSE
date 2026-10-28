/**
 * Formulaire de création d'une habitude — Junix Pulse.
 * Thématisé dynamiquement : mode sombre Midnight Glow et mode clair crème chaleureuse.
 */
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HabitUseCases } from '@/use-cases/habit-use-cases';
import { HabitFrequency } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { Spacing, Radius, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { makeFormStyles } from '@/styles/common/form-styles';

export default function NewHabitScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const styles = useThemedStyles(makeNewHabitStyles);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('DAILY');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(3);
  const [color, setColor] = useState('primary');
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  const colorOptions = useMemo(() => [
    { id: 'primary', label: 'Violet', hex: palette.primary.default },
    { id: 'tertiary', label: 'Cyan / Teal', hex: palette.tertiary.default },
    { id: 'green', label: 'Vert', hex: palette.success.default },
    { id: 'orange', label: 'Orange', hex: palette.priority.HIGH },
    { id: 'purple', label: 'Pourpre', hex: '#9C27B0' },
    { id: 'cyan', label: 'Cyan', hex: '#00BCD4' },
  ], [palette]);

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('Le nom de l\'habitude est requis');
      return;
    }
    setTitleError('');

    try {
      setSaving(true);
      await HabitUseCases.createHabit({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        targetDaysPerWeek: frequency === 'WEEKLY' ? targetDaysPerWeek : undefined,
        color,
      });

      showSnackbar(`Habitude "${title.trim()}" créée avec succès`);
      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer l\'habitude.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[formStyles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header Toolbar */}
      <View style={formStyles.toolbar}>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={() => router.back()}
          accessibilityLabel="Annuler"
        >
          <Text style={formStyles.toolbarCancel}>Annuler</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <Text style={formStyles.toolbarTitle}>Nouvelle habitude</Text>
          <Text style={formStyles.toolbarSubtitle}>Discipline & Routine</Text>
        </View>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Créer l'habitude"
        >
          <Text style={[formStyles.toolbarSave, saving && formStyles.toolbarSaveDisabled]}>
            {saving ? 'Création...' : 'Créer'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={formStyles.scroll}
        contentContainerStyle={[formStyles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Carte 1 : Titre & Description */}
        <View style={formStyles.cardGroup}>
          <TextInput
            style={[formStyles.titleInput, !!titleError && styles.inputErrorBorder]}
            placeholder="ex: Méditation 10 min, Boire 2L d'eau..."
            placeholderTextColor={palette.onSurface.disabled}
            value={title}
            onChangeText={t => {
              setTitle(t);
              if (titleError) setTitleError('');
            }}
            maxLength={60}
            autoFocus
          />
          {!!titleError && <Text style={formStyles.errorText}>{titleError}</Text>}

          <View style={formStyles.notesRow}>
            <Ionicons name="document-text-outline" size={18} color={palette.onSurface.variant} style={formStyles.notesIcon} />
            <TextInput
              style={formStyles.notesInput}
              placeholder="Pourquoi cette habitude et comment la maintenir..."
              placeholderTextColor={palette.onSurface.disabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Carte 2 : Fréquence */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="repeat-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Rythme & Fréquence</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={formStyles.chipsRow}>
            <TouchableOpacity
              style={[
                formStyles.chip,
                frequency === 'DAILY' && formStyles.chipActive,
              ]}
              onPress={() => setFrequency('DAILY')}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={frequency === 'DAILY' ? palette.primary.default : palette.onSurface.variant}
              />
              <Text
                style={[
                  formStyles.chipText,
                  frequency === 'DAILY' && formStyles.chipTextActive,
                ]}
              >
                Quotidienne (Tous les jours)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                formStyles.chip,
                frequency === 'WEEKLY' && formStyles.chipActive,
              ]}
              onPress={() => setFrequency('WEEKLY')}
            >
              <Ionicons
                name="bar-chart-outline"
                size={16}
                color={frequency === 'WEEKLY' ? palette.primary.default : palette.onSurface.variant}
              />
              <Text
                style={[
                  formStyles.chipText,
                  frequency === 'WEEKLY' && formStyles.chipTextActive,
                ]}
              >
                Hebdomadaire
              </Text>
            </TouchableOpacity>
          </View>

          {/* Jours visés si Hebdomadaire */}
          {frequency === 'WEEKLY' && (
            <View style={styles.daysSelectorContainer}>
              <Text style={formStyles.fieldSub}>Objectif : {targetDaysPerWeek} jours par semaine</Text>
              <View style={styles.daysSelector}>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.dayPill,
                      targetDaysPerWeek === num && styles.dayPillActive,
                    ]}
                    onPress={() => setTargetDaysPerWeek(num)}
                  >
                    <Text
                      style={[
                        styles.dayPillText,
                        targetDaysPerWeek === num && styles.dayPillTextActive,
                      ]}
                    >
                      {num}j
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Carte 3 : Thème Couleur */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="color-palette-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Couleur distinctive</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <View style={styles.colorRow}>
            {colorOptions.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.hex },
                  color === c.id && styles.colorCircleSelected,
                ]}
                onPress={() => setColor(c.id)}
              >
                {color === c.id && (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          label="Créer l'habitude"
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeNewHabitStyles(theme: ThemePalette) {
  const isDark = theme.mode === 'dark';

  return StyleSheet.create({
    inputErrorBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.error.default,
    },
    daysSelectorContainer: {
      marginTop: Spacing.sm,
      gap: Spacing.xs,
    },
    daysSelector: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: 4,
    },
    dayPill: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: isDark ? 'rgba(15, 18, 28, 0.85)' : theme.surface.container,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.outline.variant,
      alignItems: 'center',
    },
    dayPillActive: {
      backgroundColor: isDark ? 'rgba(208, 188, 255, 0.20)' : 'rgba(107, 70, 193, 0.15)',
      borderColor: theme.primary.default,
    },
    dayPillText: {
      ...Typography.labelMedium,
      color: theme.onSurface.variant,
    },
    dayPillTextActive: {
      color: theme.primary.default,
      fontWeight: '700',
    },
    colorRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    colorCircle: {
      width: 42,
      height: 42,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorCircleSelected: {
      borderWidth: 3,
      borderColor: isDark ? '#FFFFFF' : theme.onSurface.primary,
    },
  });
}
