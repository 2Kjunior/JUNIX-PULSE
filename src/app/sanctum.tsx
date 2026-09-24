/**
 * Écran R-12 — Verrouillage biométrique (Sanctum simplifié — V1).
 * Authentification biométrique native (Face ID / Empreinte / Code OS)
 * pour accéder à un espace de note personnelle chiffré/sécurisé en local.
 * Règle R-12 : Pas de cryptographie maison, délégation 100% native à expo-local-authentication.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { SanctumRepository } from '@/repositories/sanctum-repository';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { PulseLogo } from '@/components/ui/PulseLogo';

export default function SanctumScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [_hasBiometrics, setHasBiometrics] = useState(true);

  // Déclencher l'authentification native
  const authenticate = useCallback(async () => {
    setAuthenticating(true);
    setAuthError('');

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setHasBiometrics(false);
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accéder à votre Sanctuaire',
        fallbackLabel: 'Utiliser le code de l’appareil',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsUnlocked(true);
        // Charger la note stockée
        const note = await SanctumRepository.getNote();
        setNoteContent(note);
      } else {
        setAuthError('Authentification non réussie.');
      }
    } catch (e: any) {
      setAuthError(e.message || 'Erreur d’authentification');
    } finally {
      setAuthenticating(false);
    }
  }, []);

  // Déclenchement automatique au premier affichage
  useEffect(() => {
    authenticate();
  }, [authenticate]);

  // Sauvegarde de la note
  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await SanctumRepository.saveNote(noteContent);
      showSnackbar('Note sécurisée enregistrée');
    } catch (e: any) {
      showSnackbar(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingNote(false);
    }
  };

  // Verrouillage manuel
  const handleLock = () => {
    setIsUnlocked(false);
    setNoteContent('');
    showSnackbar('Sanctuaire reverrouillé');
  };

  // ─── Vue Verrouillée ───────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.lockBox}>
          <PulseLogo size={80} mode="idle" />
          <Text style={styles.lockTitle}>Sanctuaire</Text>
          <Text style={styles.lockSubtitle}>
            Cet espace privé est protégé par l'authentification de votre appareil.
          </Text>

          {!!authError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color="#FF5252" />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <Button
            label={authenticating ? 'Vérification...' : 'Déverrouiller'}
            onPress={authenticate}
            variant="primary"
            size="lg"
            loading={authenticating}
            icon={<Ionicons name="finger-print" size={20} color="#141317" />}
            style={styles.unlockBtn}
          />

          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Retourner à l'application</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Vue Déverrouillée (Espace Note Privée) ─────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sanctuaire</Text>
        <TouchableOpacity style={styles.lockIconBtn} onPress={handleLock} accessibilityLabel="Verrouiller">
          <Ionicons name="lock-closed" size={20} color={Primary.default} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Badge de sécurité */}
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#6DD58C" />
          <Text style={styles.secureBadgeText}>
            Espace privé déverrouillé • Stocké localement sur l'appareil
          </Text>
        </View>

        {/* Bloc d'édition de la note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteCardTitle}>Note confidentielle</Text>
          <Text style={styles.noteCardSub}>
            Écrivez librement vos pensées, idées secrètes ou codes personnels.
          </Text>

          <TextInput
            style={styles.noteInput}
            value={noteContent}
            onChangeText={setNoteContent}
            placeholder="Écrivez votre note privée ici..."
            placeholderTextColor={OnSurface.disabled}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
        </View>

        {/* Bouton de sauvegarde dégradé */}
        <Button
          label="Sauvegarder la note"
          onPress={handleSaveNote}
          variant="primary"
          size="lg"
          loading={savingNote}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  lockBox: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: Spacing.md,
  },
  lockTitle: {
    ...Typography.headlineLarge,
    color: OnSurface.primary,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  lockSubtitle: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 22,
  },
  unlockBtn: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  errorText: {
    ...Typography.labelSmall,
    color: '#FF5252',
  },
  backLink: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  backLinkText: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  lockIconBtn: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(109, 213, 140, 0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(109, 213, 140, 0.25)',
  },
  secureBadgeText: {
    ...Typography.labelSmall,
    color: '#6DD58C',
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.xs,
  },
  noteCardTitle: {
    ...Typography.titleMedium,
    color: OnSurface.primary,
    fontWeight: '600',
  },
  noteCardSub: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginBottom: Spacing.sm,
  },
  noteInput: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: OnSurface.primary,
    ...Typography.bodyMedium,
    minHeight: 180,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
});
