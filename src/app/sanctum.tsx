/**
 * Ecran R-12 — Sanctuaire (V2 — Multi-carnets + fallback PIN).
 * Harmonisé avec le système Midnight Glassmorphism Junix Pulse.
 *
 * Architecture en 3 vues :
 *  1. Vue verrouillée    — Authentification biométrique ou PIN applicatif
 *  2. Vue liste          — Carnets secrets filtrables par dossier/recherche avec GlassFAB 3D
 *  3. Vue éditeur        — Création / édition d'un carnet secret dans des cartes de verre
 *
 * Règle R-12 : pas de cryptographie maison, délégation native (expo-local-authentication).
 * Fallback PIN : si le téléphone n'a ni biométrie ni écran de verrouillage,
 * on propose un code PIN applicatif de 4 à 8 chiffres (stocké hashé en settings).
 * Auto-verrouillage au passage en arrière-plan (AppState listener).
 */

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Alert,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { SanctumRepository, type SanctumNote } from '@/repositories/sanctum-repository';
import { SanctumAuthService } from '@/services/sanctum-auth-service';
import { useAppStore } from '@/store/app-store';
import {
  filterSanctumNotes,
  extractUniqueFolders,
  formatSanctumSnippet,
  validateSanctumPin,
  validateSanctumNoteInput,
  DEFAULT_SANCTUM_FOLDERS,
  type SanctumNoteItem,
} from '@/domain/rules/sanctum-rules';
import { Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { PulseLogo } from '@/components/ui/PulseLogo';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { makeSanctumStyles } from '@/styles/sanctum/sanctum-styles';
import { makeFormStyles } from '@/styles/common/form-styles';

// ─── Types locaux ────────────────────────────────────────────────────────────
type SanctumView = 'locked' | 'pin_setup' | 'pin_verify' | 'list' | 'editor';

// ═════════════════════════════════════════════════════════════════════════════
export default function SanctumScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeSanctumStyles);
  const formStyles = useThemedStyles(makeFormStyles);

  // ─── Clé cryptographique active en mémoire volatile (jamais persistée en clair) ───
  const activeKeyRef = useRef<Uint8Array | null>(null);

  // ─── Etat global ────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<SanctumView>('locked');
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(true);
  const [hasPinConfigured, setHasPinConfigured] = useState(false);

  // ─── PIN state ──────────────────────────────────────────────────────────
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState('');

  // ─── Liste carnets ─────────────────────────────────────────────────────
  const [notes, setNotes] = useState<SanctumNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState('Tous');

  // ─── Editeur ────────────────────────────────────────────────────────────
  const [editingNote, setEditingNote] = useState<SanctumNote | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorFolder, setEditorFolder] = useState('Général');
  const [saving, setSaving] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  // ─── Auto-lock quand l'app passe en arrière-plan (purge la clé en RAM) ──
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        if (currentView !== 'locked' && currentView !== 'pin_setup' && currentView !== 'pin_verify') {
          activeKeyRef.current = null;
          setCurrentView('locked');
          setNotes([]);
          setEditingNote(null);
          setSearchQuery('');
        }
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [currentView]);

  // ─── Détection capacités de l'appareil à l'ouverture ───────────────────
  useEffect(() => {
    async function checkSecurityCapabilities() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const biometricsAvailable = hasHardware && isEnrolled;
        setHasBiometrics(biometricsAvailable);

        const pinConfigured = await SanctumAuthService.isPinConfigured();
        setHasPinConfigured(pinConfigured);

        // Si biométrie disponible et configurée, déclencher authentification automatique
        if (biometricsAvailable && pinConfigured) {
          authenticateBiometric();
        }
      } catch {
        setHasBiometrics(false);
      }
    }
    checkSecurityCapabilities();
  }, []);

  // ─── Authentification Biométrique native ──────────────────────────────
  const authenticateBiometric = async () => {
    setAuthenticating(true);
    setAuthError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accéder au Sanctuaire privé',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const bioKey = await SanctumAuthService.getStoredBiometricKey();
        if (bioKey) {
          activeKeyRef.current = bioKey;
          await onAuthSuccess(bioKey);
        } else {
          // Si aucune clé biométrique stockée, demander la saisie du PIN
          setCurrentView('pin_verify');
        }
      } else {
        if (result.error !== 'user_cancel') {
          setAuthError('Authentification échouée');
        }
      }
    } catch {
      setAuthError('Erreur d’authentification biométrique');
    } finally {
      setAuthenticating(false);
    }
  };

  // ─── Transition succès d'authentification ─────────────────────────────
  const onAuthSuccess = async (key?: Uint8Array) => {
    try {
      const currentKey = key ?? activeKeyRef.current;
      const allNotes = await SanctumRepository.getAllNotes(currentKey ?? undefined);
      setNotes(allNotes);
      setCurrentView('list');
      setAuthError('');
    } catch {
      showSnackbar('Erreur lors du déchiffrement des notes');
    }
  };

  // ─── Gestion PIN : configuration scrypt + SecureStore ─────────────────
  const handlePinSetup = async () => {
    if (pinStep === 'enter') {
      const validation = validateSanctumPin(pinInput);
      if (!validation.valid) {
        setPinError(validation.error ?? '');
        return;
      }
      setPinStep('confirm');
      setPinError('');
      setPinConfirm('');
      return;
    }

    if (pinInput !== pinConfirm) {
      setPinError('Les codes ne correspondent pas');
      setPinConfirm('');
      return;
    }

    try {
      const masterKey = await SanctumAuthService.setupPin(pinInput);
      activeKeyRef.current = masterKey;
      setHasPinConfigured(true);
      setPinInput('');
      setPinConfirm('');
      setPinStep('enter');
      setPinError('');
      showSnackbar('Code PIN Sanctuaire configuré & espace chiffré');
      await onAuthSuccess(masterKey);
    } catch {
      setPinError('Erreur lors de la configuration du code PIN');
    }
  };

  // ─── Gestion PIN : vérification scrypt + Poly1305 ──────────────────────
  const handlePinVerify = async () => {
    const validation = validateSanctumPin(pinInput);
    if (!validation.valid) {
      setPinError(validation.error ?? '');
      return;
    }

    try {
      const result = await SanctumAuthService.verifyAndUnlockWithPin(pinInput);
      if (result.success && result.key) {
        activeKeyRef.current = result.key;
        setPinInput('');
        setPinError('');
        await onAuthSuccess(result.key);
      } else {
        setPinError(result.error ?? 'Code PIN incorrect');
        setPinInput('');
      }
    } catch {
      setPinError('Erreur lors de la vérification du code PIN');
      setPinInput('');
    }
  };

  // ─── Actions CRUD carnets ─────────────────────────────────────────────
  const handleNewNote = () => {
    setEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorFolder('Général');
    setCurrentView('editor');
  };

  const handleEditNote = (note: SanctumNote) => {
    setEditingNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorFolder(note.folder);
    setCurrentView('editor');
  };

  const handleSaveNote = async () => {
    const validation = validateSanctumNoteInput(editorTitle, editorContent);
    if (!validation.valid) {
      showSnackbar(validation.error ?? 'Erreur de validation');
      return;
    }

    setSaving(true);
    try {
      await SanctumRepository.saveNote(
        {
          id: editingNote?.id,
          title: editorTitle.trim() || 'Sans titre',
          content: editorContent,
          folder: editorFolder,
        },
        activeKeyRef.current ?? undefined
      );
      const allNotes = await SanctumRepository.getAllNotes(activeKeyRef.current ?? undefined);
      setNotes(allNotes);
      showSnackbar(editingNote ? 'Carnet mis à jour' : 'Nouveau carnet chiffré créé');
      setCurrentView('list');
    } catch {
      showSnackbar('Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (note: SanctumNote) => {
    Alert.alert(
      'Supprimer le carnet',
      `Êtes-vous sûr de vouloir supprimer définitivement « ${note.title || 'ce carnet'} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await SanctumRepository.deleteNote(note.id);
            const allNotes = await SanctumRepository.getAllNotes(activeKeyRef.current ?? undefined);
            setNotes(allNotes);
            showSnackbar('Carnet supprimé');
            if (currentView === 'editor') {
              setCurrentView('list');
            }
          },
        },
      ]
    );
  };

  // ─── Verrouillage manuel ──────────────────────────────────────────────
  const handleLock = () => {
    activeKeyRef.current = null;
    setCurrentView('locked');
    setNotes([]);
    setEditingNote(null);
    setSearchQuery('');
    showSnackbar('Sanctuaire verrouillé');
  };

  // ─── Dérivations ──────────────────────────────────────────────────────
  const filteredNotes = filterSanctumNotes(notes as SanctumNoteItem[], searchQuery, activeFolder);
  const folders = extractUniqueFolders(notes as SanctumNoteItem[]);

  // ═══════════════════════════════════════════════════════════════════════
  // VUE 1 : VERROUILLÉ
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === 'locked') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.glassLockCard}>
          <PulseLogo size={76} mode="idle" />
          <Text style={styles.lockTitle}>Sanctuaire</Text>
          <Text style={styles.lockSubtitle}>
            Cet espace privé est protégé par l'authentification sécurisée de votre appareil.
          </Text>

          {!!authError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.error.default} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          {/* Bouton biométrie (toujours affiché si disponible) */}
          {hasBiometrics && (
            <Button
              label={authenticating ? 'Vérification...' : 'Déverrouiller'}
              onPress={authenticateBiometric}
              variant="primary"
              size="lg"
              loading={authenticating}
              icon={<Ionicons name="finger-print" size={20} color="#FFFFFF" />}
              style={styles.unlockBtn}
            />
          )}

          {/* Fallback PIN */}
          {!hasBiometrics && hasPinConfigured && (
            <Button
              label="Entrer le code PIN"
              onPress={() => {
                setPinInput('');
                setPinError('');
                setCurrentView('pin_verify');
              }}
              variant="primary"
              size="lg"
              icon={<Ionicons name="keypad-outline" size={20} color="#FFFFFF" />}
              style={styles.unlockBtn}
            />
          )}

          {!hasBiometrics && !hasPinConfigured && (
            <Button
              label="Configurer un code PIN"
              onPress={() => {
                setPinInput('');
                setPinConfirm('');
                setPinStep('enter');
                setPinError('');
                setCurrentView('pin_setup');
              }}
              variant="primary"
              size="lg"
              icon={<Ionicons name="key-outline" size={20} color="#FFFFFF" />}
              style={styles.unlockBtn}
            />
          )}

          {/* Si biométrie disponible mais PIN aussi configuré */}
          {hasBiometrics && hasPinConfigured && (
            <TouchableOpacity
              style={styles.altAuthLink}
              onPress={() => {
                setPinInput('');
                setPinError('');
                setCurrentView('pin_verify');
              }}
              accessibilityRole="button"
              accessibilityLabel="Utiliser le code PIN"
            >
              <Ionicons name="keypad-outline" size={16} color={theme.onSurface.variant} />
              <Text style={styles.altAuthText}>Utiliser le code PIN</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retourner à l'application"
          >
            <Text style={styles.backLinkText}>Retourner à l'application</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE PIN SETUP
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === 'pin_setup') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.glassLockCard}>
          <View style={styles.pinIconBadge}>
            <Ionicons name="key-outline" size={32} color={theme.primary.default} />
          </View>
          <Text style={styles.lockTitle}>
            {pinStep === 'enter' ? 'Créer un code PIN' : 'Confirmer le code'}
          </Text>
          <Text style={styles.lockSubtitle}>
            {pinStep === 'enter'
              ? 'Choisissez un code de 4 à 8 chiffres pour protéger votre Sanctuaire.'
              : 'Entrez à nouveau votre code pour le confirmer.'}
          </Text>

          <TextInput
            style={styles.pinInput}
            value={pinStep === 'enter' ? pinInput : pinConfirm}
            onChangeText={pinStep === 'enter' ? setPinInput : setPinConfirm}
            placeholder="Code PIN"
            placeholderTextColor={theme.onSurface.disabled}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
          />

          {!!pinError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.error.default} />
              <Text style={styles.errorText}>{pinError}</Text>
            </View>
          )}

          <Button
            label={pinStep === 'enter' ? 'Suivant' : 'Confirmer et créer'}
            onPress={handlePinSetup}
            variant="primary"
            size="lg"
            style={styles.unlockBtn}
          />

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => {
              setPinInput('');
              setPinConfirm('');
              setPinStep('enter');
              setPinError('');
              setCurrentView('locked');
            }}
            accessibilityRole="button"
            accessibilityLabel="Annuler la configuration du code PIN"
          >
            <Text style={styles.backLinkText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE PIN VERIFY
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === 'pin_verify') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.glassLockCard}>
          <View style={styles.pinIconBadge}>
            <Ionicons name="keypad-outline" size={32} color={theme.primary.default} />
          </View>
          <Text style={styles.lockTitle}>Code PIN</Text>
          <Text style={styles.lockSubtitle}>
            Entrez votre code confidentiel pour déverrouiller le Sanctuaire.
          </Text>

          <TextInput
            style={styles.pinInput}
            value={pinInput}
            onChangeText={setPinInput}
            placeholder="Code PIN"
            placeholderTextColor={theme.onSurface.disabled}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
          />

          {!!pinError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.error.default} />
              <Text style={styles.errorText}>{pinError}</Text>
            </View>
          )}

          <Button
            label="Déverrouiller"
            onPress={handlePinVerify}
            variant="primary"
            size="lg"
            icon={<Ionicons name="lock-open-outline" size={20} color="#FFFFFF" />}
            style={styles.unlockBtn}
          />

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => {
              setPinInput('');
              setPinError('');
              setCurrentView('locked');
            }}
            accessibilityRole="button"
            accessibilityLabel="Retour à l'écran de verrouillage"
          >
            <Text style={styles.backLinkText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE 2 : LISTE DES CARNETS
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === 'list') {
    return (
      <View style={[formStyles.container, { paddingTop: insets.top }]}>
        {/* En-tête toolbar harmonisé */}
        <View style={formStyles.toolbar}>
          <TouchableOpacity
            style={formStyles.toolbarBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={theme.onSurface.primary} />
          </TouchableOpacity>
          <View style={formStyles.toolbarCenter}>
            <Text style={formStyles.toolbarTitle}>Sanctuaire</Text>
            <Text style={formStyles.toolbarSubtitle}>Espace Privé Sécurisé</Text>
          </View>
          <TouchableOpacity
            style={[formStyles.toolbarBtn, { alignItems: 'flex-end' }]}
            onPress={handleLock}
            accessibilityRole="button"
            accessibilityLabel="Verrouiller le Sanctuaire"
          >
            <View style={styles.lockIconBadge}>
              <Ionicons name="lock-closed" size={16} color={theme.primary.default} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Badge sécurité */}
        <View style={styles.secureBadgeCentered}>
          <Ionicons name="shield-checkmark" size={14} color={theme.success.default} />
          <Text style={styles.secureBadgeText}>
            Espace chiffré & déverrouillé
          </Text>
        </View>

        {/* Barre de recherche Glassmorphism */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={theme.primary.default} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher dans vos carnets..."
            placeholderTextColor={theme.onSurface.disabled}
          />
          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <Ionicons name="close-circle" size={18} color={theme.onSurface.disabled} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chips dossiers */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.folderChipsScroll}
          contentContainerStyle={styles.folderChipsContent}
        >
          {folders.map((folder) => {
            const isActive = folder === activeFolder;
            return (
              <TouchableOpacity
                key={folder}
                style={[formStyles.chip, isActive && formStyles.chipActive]}
                onPress={() => setActiveFolder(folder)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Dossier ${folder}${isActive ? ', sélectionné' : ''}`}
              >
                <Text style={[formStyles.chipText, isActive && formStyles.chipTextActive]}>
                  {folder}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Liste des carnets */}
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBadge}>
                <Ionicons name="document-text-outline" size={40} color={theme.onSurface.disabled} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Aucun résultat trouvé' : 'Aucun carnet secret'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Essayez un autre mot-clé ou changez de dossier.'
                  : 'Créez votre premier carnet privé protégé.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.noteCard}
              onPress={() => handleEditNote(item)}
              onLongPress={() => handleDeleteNote(item)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Carnet ${item.title || 'Sans titre'}, dossier ${item.folder}`}
            >
              <View style={styles.noteCardHeader}>
                <View style={styles.noteCardTitleRow}>
                  <Ionicons name="lock-closed" size={16} color={theme.primary.default} />
                  <Text style={styles.noteCardTitle} numberOfLines={1}>
                    {item.title || 'Sans titre'}
                  </Text>
                </View>
                <View style={styles.folderTag}>
                  <Ionicons name="folder-outline" size={12} color={theme.tertiary.default} />
                  <Text style={styles.folderTagText}>{item.folder}</Text>
                </View>
              </View>
              {!!item.content && (
                <Text style={styles.noteCardSnippet} numberOfLines={2}>
                  {formatSanctumSnippet(item.content, 120)}
                </Text>
              )}
              <Text style={styles.noteCardDate}>
                Modifié {formatRelativeDate(item.updated_at)}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Bouton Nouveau carnet 3D Glassmorphism */}
        <GlassFloatingActionButton
          label="Nouveau carnet"
          icon="add"
          bottomOffset={insets.bottom + 20}
          onPress={handleNewNote}
        />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE 3 : EDITEUR DE CARNET
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={[formStyles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête toolbar harmonisé */}
      <View style={formStyles.toolbar}>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={() => setCurrentView('list')}
          accessibilityRole="button"
          accessibilityLabel="Annuler et retourner à la liste"
        >
          <Text style={formStyles.toolbarCancel}>Annuler</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <Text style={formStyles.toolbarTitle}>
            {editingNote ? 'Modifier' : 'Nouveau carnet'}
          </Text>
          <Text style={formStyles.toolbarSubtitle}>Sanctuaire Privé</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {editingNote && (
            <TouchableOpacity
              onPress={() => handleDeleteNote(editingNote)}
              accessibilityRole="button"
              accessibilityLabel="Supprimer ce carnet secret"
              style={{ padding: 4 }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.error.default} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={formStyles.toolbarBtn}
            onPress={handleSaveNote}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer le carnet secret"
          >
            <Text style={[formStyles.toolbarSave, saving && formStyles.toolbarSaveDisabled]}>
              {saving ? 'Enregistrement...' : 'Créer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={formStyles.scroll}
        contentContainerStyle={[formStyles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Carte 1 : Titre et Dossier */}
        <View style={formStyles.cardGroup}>
          <TextInput
            style={formStyles.titleInput}
            value={editorTitle}
            onChangeText={setEditorTitle}
            placeholder="Titre du carnet secret..."
            placeholderTextColor={theme.onSurface.disabled}
            maxLength={100}
            autoFocus
          />

          {/* Sélecteur de dossier */}
          <TouchableOpacity
            style={styles.folderSelector}
            onPress={() => setShowFolderPicker(!showFolderPicker)}
            accessibilityRole="button"
            accessibilityLabel={`Dossier sélectionné : ${editorFolder}. Appuyer pour changer de dossier.`}
          >
            <View style={styles.folderBadgeSmall}>
              <Ionicons name="folder-outline" size={16} color={theme.primary.default} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.folderLabelSmall}>DOSSIER</Text>
              <Text style={styles.folderSelectorText}>{editorFolder}</Text>
            </View>
            <Ionicons
              name={showFolderPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.onSurface.variant}
            />
          </TouchableOpacity>

          {showFolderPicker && (
            <View style={styles.folderPickerList}>
              {DEFAULT_SANCTUM_FOLDERS.map((folder) => (
                <TouchableOpacity
                  key={folder}
                  style={[
                    styles.folderPickerItem,
                    editorFolder === folder && styles.folderPickerItemActive,
                  ]}
                  onPress={() => {
                    setEditorFolder(folder);
                    setShowFolderPicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: editorFolder === folder }}
                  accessibilityLabel={`Dossier ${folder}${editorFolder === folder ? ', sélectionné' : ''}`}
                >
                  <Text
                    style={[
                      styles.folderPickerItemText,
                      editorFolder === folder && styles.folderPickerItemTextActive,
                    ]}
                  >
                    {folder}
                  </Text>
                  {editorFolder === folder && (
                    <Ionicons name="checkmark" size={16} color={theme.primary.default} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Carte 2 : Contenu Confidentiel */}
        <View style={formStyles.cardGroup}>
          <View style={styles.editorTextRow}>
            <Ionicons name="key-outline" size={18} color={theme.primary.default} style={{ marginTop: 2 }} />
            <TextInput
              style={styles.editorTextInput}
              value={editorContent}
              onChangeText={setEditorContent}
              placeholder="Écrivez vos pensées, idées secrètes, réflexions ou informations strictement confidentielles..."
              placeholderTextColor={theme.onSurface.disabled}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Bouton de sauvegarde */}
        <Button
          label={editingNote ? 'Mettre à jour le carnet' : 'Créer le carnet secret'}
          onPress={handleSaveNote}
          variant="primary"
          size="lg"
          loading={saving}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Helper date relative ────────────────────────────────────────────────────
function formatRelativeDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
