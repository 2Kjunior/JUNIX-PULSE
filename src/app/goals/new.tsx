/**
 * Formulaire de création d'un objectif — Junix Pulse.
 * Entièrement thématisé avec contrastes parfaits en mode sombre et clair.
 */
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { GoalUseCases } from '@/use-cases/goal-use-cases';
import { useAppStore } from '@/store/app-store';
import { Spacing } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/Button';
import { makeFormStyles } from '@/styles/common/form-styles';

export default function NewGoalScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const styles = useThemedStyles(makeNewGoalStyles);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('Le titre de l\'objectif est requis');
      return;
    }
    setTitleError('');

    try {
      setSaving(true);
      await GoalUseCases.createGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: deadline ? deadline.toISOString() : undefined,
      });

      showSnackbar(`Objectif "${title.trim()}" créé avec succès`);
      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer l\'objectif.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[formStyles.container, { paddingTop: insets.top }]}>
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
          <Text style={formStyles.toolbarTitle}>Nouvel objectif</Text>
          <Text style={formStyles.toolbarSubtitle}>Vision & Accomplissement</Text>
        </View>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Créer l'objectif"
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
        {/* Carte 1 : Titre & Vision */}
        <View style={formStyles.cardGroup}>
          <TextInput
            style={[formStyles.titleInput, !!titleError && styles.inputErrorBorder]}
            placeholder="ex: Lancer mon produit, Courir un marathon..."
            placeholderTextColor={palette.onSurface.disabled}
            value={title}
            onChangeText={t => {
              setTitle(t);
              if (titleError) setTitleError('');
            }}
            maxLength={80}
            autoFocus
          />
          {!!titleError && <Text style={formStyles.errorText}>{titleError}</Text>}

          <View style={formStyles.notesRow}>
            <Ionicons name="compass-outline" size={18} color={palette.primary.default} style={formStyles.notesIcon} />
            <TextInput
              style={formStyles.notesInput}
              placeholder="Pourquoi cet objectif compte et quelle est votre stratégie..."
              placeholderTextColor={palette.onSurface.disabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Carte 2 : Date cible (Deadline) */}
        <View style={formStyles.sectionHeaderRow}>
          <View style={formStyles.sectionHeaderIconBadge}>
            <Ionicons name="calendar-outline" size={14} color={palette.primary.default} />
          </View>
          <Text style={formStyles.sectionHeaderTitle}>Échéance visée</Text>
        </View>

        <View style={formStyles.cardGroup}>
          <TouchableOpacity
            style={formStyles.selectorRow}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={formStyles.selectorLeft}>
              <View style={formStyles.selectorIconBadge}>
                <Ionicons name="flag-outline" size={18} color={palette.primary.default} />
              </View>
              <View>
                <Text style={formStyles.selectorLabel}>DATE BUTOIR</Text>
                <Text style={formStyles.selectorValue}>
                  {deadline
                    ? format(deadline, 'd MMMM yyyy', { locale: fr })
                    : 'Aucune date limite fixée'}
                </Text>
              </View>
            </View>
            {deadline ? (
              <TouchableOpacity
                onPress={() => setDeadline(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color={palette.onSurface.disabled} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={palette.onSurface.disabled} />
            )}
          </TouchableOpacity>
        </View>

        <Button
          label="Créer l'objectif"
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={saving}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={deadline || new Date()}
        onConfirm={date => {
          setShowDatePicker(false);
          setDeadline(date);
        }}
        onCancel={() => setShowDatePicker(false)}
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
        locale="fr_FR"
      />
    </View>
  );
}

function makeNewGoalStyles(theme: ThemePalette) {
  return StyleSheet.create({
    inputErrorBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.error.default,
    },
  });
}
