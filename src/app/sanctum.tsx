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

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
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
import * as Crypto from 'expo-crypto';

import { SanctumRepository, type SanctumNote } from '@/repositories/sanctum-repository';
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
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
  Typography,
  Success,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { PulseLogo } from '@/components/ui/PulseLogo';
import { GlassFloatingActionButton } from '@/components/ui/GlassFloatingActionButton';
import { formStyles } from '@/styles/common/form-styles';
import { getDatabase } from '@/database/sqlite';

// ─── Types locaux ────────────────────────────────────────────────────────────
type SanctumView = 'locked' | 'pin_setup' | 'pin_verify' | 'list' | 'editor';

// ─── Helpers PIN hashé (SHA-256 avec sel fixe par appareil) ──────────────────
async function hashPin(pin: string): Promise<string> {
  const salted = `sanctum_salt_jp_${pin}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salted);
}

async function savePinHash(hash: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sanctum_notes (id, title, content, folder, created_at, updated_at)
     VALUES ('__pin_hash__', '__system__', ?, '__system__', datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    hash
  );
}

async function getSavedPinHashFromDb(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ content: string }>(
    `SELECT content FROM sanctum_notes WHERE id = '__pin_hash__'`
  );
  return row?.content ?? null;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SanctumScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

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

  // ─── Auto-lock quand l'app passe en arrière-plan ───────────────────────
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        if (currentView !== 'locked' && currentView !== 'pin_setup' && currentView !== 'pin_verify') {
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

  // ─── Vérifier les capacités d'authentification ─────────────────────────
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(hasHardware && isEnrolled);

      const existingHash = await getSavedPinHashFromDb();
      setHasPinConfigured(!!existingHash);
    })();
  }, []);

  // ─── Authentification biométrique native ───────────────────────────────
  const authenticateBiometric = useCallback(async () => {
    setAuthenticating(true);
    setAuthError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accéder à votre Sanctuaire',
        fallbackLabel: 'Utiliser le code de l\'appareil',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await onAuthSuccess();
      } else {
        setAuthError('Authentification non réussie.');
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Erreur d\'authentification');
    } finally {
      setAuthenticating(false);
    }
  }, []);

  // ─── Succès d'authentification commun ──────────────────────────────────
  const onAuthSuccess = async () => {
    await SanctumRepository.migrateLegacyNote();
    const allNotes = await SanctumRepository.getAllNotes();
    setNotes(allNotes.filter((n) => n.id !== '__pin_hash__'));
    setCurrentView('list');
  };

  // ─── Déclenchement automatique au premier affichage ────────────────────
  useEffect(() => {
    if (hasBiometrics) {
      authenticateBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBiometrics]);

  // ─── Gestion PIN : configuration initiale ─────────────────────────────
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

    const hash = await hashPin(pinInput);
    await savePinHash(hash);
    setHasPinConfigured(true);
    setPinInput('');
    setPinConfirm('');
    setPinStep('enter');
    setPinError('');
    showSnackbar('Code PIN Sanctuaire configuré');
    await onAuthSuccess();
  };

  // ─── Gestion PIN : vérification ───────────────────────────────────────
  const handlePinVerify = async () => {
    const validation = validateSanctumPin(pinInput);
    if (!validation.valid) {
      setPinError(validation.error ?? '');
      return;
    }

    const hash = await hashPin(pinInput);
    const savedHash = await getSavedPinHashFromDb();

    if (hash === savedHash) {
      setPinInput('');
      setPinError('');
      await onAuthSuccess();
    } else {
      setPinError('Code PIN incorrect');
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
      await SanctumRepository.saveNote({
        id: editingNote?.id,
        title: editorTitle.trim() || 'Sans titre',
        content: editorContent,
        folder: editorFolder,
      });
      const allNotes = await SanctumRepository.getAllNotes();
      setNotes(allNotes.filter((n) => n.id !== '__pin_hash__'));
      showSnackbar(editingNote ? 'Carnet mis à jour' : 'Nouveau carnet créé');
      setCurrentView('list');
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (note: SanctumNote) => {
    Alert.alert(
      'Supprimer ce carnet',
      `"${note.title || 'Sans titre'}" sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await SanctumRepository.deleteNote(note.id);
            const allNotes = await SanctumRepository.getAllNotes();
            setNotes(allNotes.filter((n) => n.id !== '__pin_hash__'));
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
              <Ionicons name="alert-circle-outline" size={16} color="#FF5252" />
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
            >
              <Ionicons name="keypad-outline" size={16} color={OnSurface.variant} />
              <Text style={styles.altAuthText}>Utiliser le code PIN</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
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
            <Ionicons name="key-outline" size={32} color={Primary.default} />
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
            placeholderTextColor={OnSurface.disabled}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
          />

          {!!pinError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color="#FF5252" />
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
            <Ionicons name="keypad-outline" size={32} color={Primary.default} />
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
            placeholderTextColor={OnSurface.disabled}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            autoFocus
          />

          {!!pinError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color="#FF5252" />
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
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
          </TouchableOpacity>
          <View style={formStyles.toolbarCenter}>
            <Text style={formStyles.toolbarTitle}>Sanctuaire</Text>
            <Text style={formStyles.toolbarSubtitle}>Espace Privé Sécurisé</Text>
          </View>
          <TouchableOpacity
            style={[formStyles.toolbarBtn, { alignItems: 'flex-end' }]}
            onPress={handleLock}
            accessibilityLabel="Verrouiller"
          >
            <View style={styles.lockIconBadge}>
              <Ionicons name="lock-closed" size={16} color={Primary.default} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Badge sécurité */}
        <View style={styles.secureBadgeCentered}>
          <Ionicons name="shield-checkmark" size={14} color={Success.default} />
          <Text style={styles.secureBadgeText}>
            Espace chiffré & déverrouillé
          </Text>
        </View>

        {/* Barre de recherche Glassmorphism */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={Primary.default} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher dans vos carnets..."
            placeholderTextColor={OnSurface.disabled}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={OnSurface.disabled} />
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
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBadge}>
                <Ionicons name="document-text-outline" size={40} color={OnSurface.disabled} />
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
            >
              <View style={styles.noteCardHeader}>
                <View style={styles.noteCardTitleRow}>
                  <Ionicons name="lock-closed" size={16} color={Primary.default} />
                  <Text style={styles.noteCardTitle} numberOfLines={1}>
                    {item.title || 'Sans titre'}
                  </Text>
                </View>
                <View style={styles.folderTag}>
                  <Ionicons name="folder-outline" size={12} color={Tertiary.default} />
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
          accessibilityLabel="Retour"
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
              accessibilityLabel="Supprimer"
              style={{ padding: 4 }}
            >
              <Ionicons name="trash-outline" size={20} color="#FF5252" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={formStyles.toolbarBtn}
            onPress={handleSaveNote}
            disabled={saving}
            accessibilityLabel="Enregistrer"
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
            placeholderTextColor={OnSurface.disabled}
            maxLength={100}
            autoFocus
          />

          {/* Sélecteur de dossier */}
          <TouchableOpacity
            style={styles.folderSelector}
            onPress={() => setShowFolderPicker(!showFolderPicker)}
          >
            <View style={styles.folderBadgeSmall}>
              <Ionicons name="folder-outline" size={16} color={Primary.default} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.folderLabelSmall}>DOSSIER</Text>
              <Text style={styles.folderSelectorText}>{editorFolder}</Text>
            </View>
            <Ionicons
              name={showFolderPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={OnSurface.variant}
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
                    <Ionicons name="checkmark" size={16} color={Primary.default} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Carte 2 : Contenu Confidentiel */}
        <View style={formStyles.cardGroup}>
          <View style={styles.editorTextRow}>
            <Ionicons name="key-outline" size={18} color={Primary.default} style={{ marginTop: 2 }} />
            <TextInput
              style={styles.editorTextInput}
              value={editorContent}
              onChangeText={setEditorContent}
              placeholder="Écrivez vos pensées, idées secrètes, réflexions ou informations strictement confidentielles..."
              placeholderTextColor={OnSurface.disabled}
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

// ═════════════════════════════════════════════════════════════════════════════
// STYLES HARMONISÉS MIDNIGHT GLASSMORPHISM
// ═════════════════════════════════════════════════════════════════════════════
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

  // ─── Lock screen Glass Card ─────────────────────────────────────────────
  glassLockCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(24, 28, 42, 0.88)',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.18)',
    gap: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  pinIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    ...Typography.headlineLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  lockSubtitle: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
    textAlign: 'center',
    lineHeight: 22,
  },
  unlockBtn: {
    width: '100%',
    marginTop: Spacing.md,
  },
  altAuthLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  altAuthText: {
    ...Typography.labelMedium,
    color: Primary.default,
    fontWeight: '600',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.30)',
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

  // ─── PIN ────────────────────────────────────────────────────────────────
  pinInput: {
    width: '100%',
    backgroundColor: 'rgba(15, 18, 28, 0.90)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.headlineLarge,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.22)',
    marginTop: Spacing.xs,
  },

  // ─── Security badge ────────────────────────────────────────────────────
  secureBadgeCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(109, 213, 140, 0.10)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(109, 213, 140, 0.25)',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  secureBadgeText: {
    ...Typography.labelSmall,
    color: Success.default,
    fontWeight: '600',
  },

  // ─── Search ─────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 22, 34, 0.85)',
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.14)',
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    padding: 0,
  },

  // ─── Folder chips ──────────────────────────────────────────────────────
  folderChipsScroll: {
    maxHeight: 48,
    marginTop: Spacing.sm,
  },
  folderChipsContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },

  // ─── Note cards ────────────────────────────────────────────────────────
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  noteCard: {
    backgroundColor: 'rgba(24, 28, 42, 0.82)',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.16)',
    gap: Spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  noteCardTitle: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  noteCardSnippet: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
    lineHeight: 18,
  },
  noteCardDate: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
    marginTop: Spacing.xs,
    fontSize: 11,
  },
  folderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(123, 208, 255, 0.12)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(123, 208, 255, 0.25)',
  },
  folderTagText: {
    ...Typography.labelSmall,
    color: Tertiary.default,
    fontWeight: '600',
  },

  // ─── Empty state ───────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
    textAlign: 'center',
  },

  // ─── Editor Elements ───────────────────────────────────────────────────
  folderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(15, 18, 28, 0.80)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.18)',
    marginTop: Spacing.xs,
  },
  folderBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderLabelSmall: {
    ...Typography.labelSmall,
    color: OnSurface.variant,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  folderSelectorText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  folderPickerList: {
    backgroundColor: 'rgba(18, 22, 34, 0.95)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.18)',
    overflow: 'hidden',
    marginTop: 4,
  },
  folderPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  folderPickerItemActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.16)',
  },
  folderPickerItemText: {
    ...Typography.bodyMedium,
    color: OnSurface.variant,
  },
  folderPickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editorTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    minHeight: 220,
  },
  editorTextInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    minHeight: 220,
    lineHeight: 22,
  },
});
