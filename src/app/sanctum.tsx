/**
 * Ecran R-12 — Sanctuaire (V2 — Multi-carnets + fallback PIN).
 *
 * Architecture en 3 vues :
 *  1. Vue verrouillée    — Authentification biométrique ou PIN applicatif
 *  2. Vue liste          — Carnets secrets filtrables par dossier/recherche
 *  3. Vue éditeur        — Création / édition d'un carnet secret
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
import { getDatabase } from '@/database/sqlite';

// ─── Types locaux ────────────────────────────────────────────────────────────
type SanctumView = 'locked' | 'pin_setup' | 'pin_verify' | 'list' | 'editor';

// ─── Helpers PIN hashé (SHA-256 avec sel fixe par appareil) ──────────────────
async function hashPin(pin: string): Promise<string> {
  const salted = `sanctum_salt_jp_${pin}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salted);
}

async function getSavedPinHash(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ display_name: string }>(
    `SELECT display_name FROM settings WHERE id = '1'`
  );
  // On réutilise un champ de settings peu critique pour stocker le hash PIN sanctum
  // dans un vrai prod on utiliserait expo-secure-store, mais le package n'est pas installé
  // Ici on stocke dans un champ dédié qu'on va ajouter
  if (!row) return null;
  // Stocké dans un préfixe spécial pour différencier du display_name
  const val = row.display_name;
  if (val && val.startsWith('__sanctum_pin__:')) {
    return val.slice('__sanctum_pin__:'.length);
  }
  return null;
}

async function savePinHash(hash: string): Promise<void> {
  const db = await getDatabase();
  // Note : on ne touche pas au display_name utilisateur ici.
  // On stocke le PIN hashé dans une entrée dédiée de sanctum_notes avec id spécial.
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
        // Verrouiller automatiquement
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
    // Migrer l'ancienne note unique si nécessaire
    await SanctumRepository.migrateLegacyNote();
    // Charger toutes les notes
    const allNotes = await SanctumRepository.getAllNotes();
    // Filtrer les notes système (hash PIN)
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

    // Etape confirmation
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
      // Recharger
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

          {/* Bouton biométrie (toujours affiché si disponible) */}
          {hasBiometrics && (
            <Button
              label={authenticating ? 'Vérification...' : 'Déverrouiller'}
              onPress={authenticateBiometric}
              variant="primary"
              size="lg"
              loading={authenticating}
              icon={<Ionicons name="finger-print" size={20} color="#141317" />}
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
              icon={<Ionicons name="keypad-outline" size={20} color="#141317" />}
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
              icon={<Ionicons name="key-outline" size={20} color="#141317" />}
              style={styles.unlockBtn}
            />
          )}

          {/* Si biométrie disponible mais PIN aussi configuré, offrir le choix */}
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
        <View style={styles.lockBox}>
          <Ionicons name="key-outline" size={48} color={Primary.default} />
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
        <View style={styles.lockBox}>
          <Ionicons name="keypad-outline" size={48} color={Primary.default} />
          <Text style={styles.lockTitle}>Code PIN</Text>
          <Text style={styles.lockSubtitle}>
            Entrez votre code PIN pour accéder au Sanctuaire.
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
            icon={<Ionicons name="lock-open-outline" size={20} color="#141317" />}
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sanctuaire</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleLock} accessibilityLabel="Verrouiller">
            <Ionicons name="lock-closed" size={20} color={Primary.default} />
          </TouchableOpacity>
        </View>

        {/* Badge sécurité */}
        <View style={styles.secureBadgeCentered}>
          <Ionicons name="shield-checkmark" size={14} color={Success.default} />
          <Text style={styles.secureBadgeText}>
            Espace privé déverrouillé
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={OnSurface.disabled} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un carnet..."
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
                style={[styles.folderChip, isActive && styles.folderChipActive]}
                onPress={() => setActiveFolder(folder)}
              >
                <Text style={[styles.folderChipText, isActive && styles.folderChipTextActive]}>
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
              <Ionicons name="document-text-outline" size={48} color={OnSurface.disabled} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Aucun résultat' : 'Aucun carnet secret'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Essayez un autre terme de recherche.'
                  : 'Créez votre premier carnet confidentiel.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.noteCard}
              onPress={() => handleEditNote(item)}
              onLongPress={() => handleDeleteNote(item)}
              activeOpacity={0.7}
            >
              <View style={styles.noteCardHeader}>
                <View style={styles.noteCardTitleRow}>
                  <Ionicons name="document-lock-outline" size={18} color={Primary.default} />
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
                {formatRelativeDate(item.updated_at)}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Bouton Nouveau carnet (FAB) */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 24 }]}
          onPress={handleNewNote}
          activeOpacity={0.8}
          accessibilityLabel="Nouveau carnet secret"
        >
          <Ionicons name="add" size={28} color="#141317" />
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE 3 : EDITEUR DE CARNET
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* En-tête éditeur */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setCurrentView('list')}
          accessibilityLabel="Retour à la liste"
        >
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingNote ? 'Modifier' : 'Nouveau carnet'}
        </Text>
        <View style={styles.headerActions}>
          {editingNote && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => handleDeleteNote(editingNote)}
              accessibilityLabel="Supprimer ce carnet"
            >
              <Ionicons name="trash-outline" size={20} color="#FF5252" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerBtn} onPress={handleLock} accessibilityLabel="Verrouiller">
            <Ionicons name="lock-closed" size={20} color={Primary.default} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.editorContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Titre */}
        <TextInput
          style={styles.editorTitleInput}
          value={editorTitle}
          onChangeText={setEditorTitle}
          placeholder="Titre du carnet"
          placeholderTextColor={OnSurface.disabled}
          maxLength={100}
        />

        {/* Sélecteur de dossier */}
        <TouchableOpacity
          style={styles.folderSelector}
          onPress={() => setShowFolderPicker(!showFolderPicker)}
        >
          <Ionicons name="folder-outline" size={16} color={Tertiary.default} />
          <Text style={styles.folderSelectorText}>{editorFolder}</Text>
          <Ionicons
            name={showFolderPicker ? 'chevron-up' : 'chevron-down'}
            size={16}
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
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Contenu */}
        <View style={styles.editorCard}>
          <TextInput
            style={styles.editorTextInput}
            value={editorContent}
            onChangeText={setEditorContent}
            placeholder="Ecrivez librement vos pensées, idées secrètes ou codes personnels..."
            placeholderTextColor={OnSurface.disabled}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
          />
        </View>

        {/* Bouton sauvegarder */}
        <Button
          label={editingNote ? 'Mettre à jour' : 'Créer le carnet'}
          onPress={handleSaveNote}
          variant="primary"
          size="lg"
          loading={saving}
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

  if (diffMin < 1) return 'A l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
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

  // ─── Lock screen ────────────────────────────────────────────────────────
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
  altAuthLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  altAuthText: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
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

  // ─── PIN ────────────────────────────────────────────────────────────────
  pinInput: {
    width: '100%',
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Typography.headlineLarge,
    color: OnSurface.primary,
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: Outline.variant,
    marginTop: Spacing.md,
  },

  // ─── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  headerBtn: {
    padding: Spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.titleLarge,
    color: OnSurface.primary,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  // ─── Security badge ────────────────────────────────────────────────────
  secureBadgeCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(109, 213, 140, 0.1)',
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
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    padding: 0,
  },

  // ─── Folder chips ──────────────────────────────────────────────────────
  folderChipsScroll: {
    maxHeight: 48,
    marginTop: Spacing.sm,
  },
  folderChipsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  folderChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Surface.container,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  folderChipActive: {
    backgroundColor: Primary.container,
    borderColor: Primary.default,
  },
  folderChipText: {
    ...Typography.labelMedium,
    color: OnSurface.variant,
  },
  folderChipTextActive: {
    color: Primary.onContainer,
  },

  // ─── Note cards ────────────────────────────────────────────────────────
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  noteCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
    gap: Spacing.xs,
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
    color: OnSurface.primary,
    fontWeight: '600',
    flex: 1,
  },
  noteCardSnippet: {
    ...Typography.bodySmall,
    color: OnSurface.variant,
    marginTop: 2,
  },
  noteCardDate: {
    ...Typography.labelSmall,
    color: OnSurface.disabled,
    marginTop: Spacing.xs,
  },
  folderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(123, 208, 255, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  folderTagText: {
    ...Typography.labelSmall,
    color: Tertiary.default,
  },

  // ─── Empty state ───────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: OnSurface.variant,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: OnSurface.disabled,
    textAlign: 'center',
  },

  // ─── FAB ───────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Primary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // ─── Editor ────────────────────────────────────────────────────────────
  editorContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  editorTitleInput: {
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Typography.headlineMedium,
    color: OnSurface.primary,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  folderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Surface.container,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  folderSelectorText: {
    ...Typography.labelLarge,
    color: Tertiary.default,
    flex: 1,
  },
  folderPickerList: {
    backgroundColor: Surface.high,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    overflow: 'hidden',
  },
  folderPickerItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  folderPickerItemActive: {
    backgroundColor: Primary.container,
  },
  folderPickerItemText: {
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  folderPickerItemTextActive: {
    color: Primary.onContainer,
    fontWeight: '600',
  },
  editorCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  editorTextInput: {
    padding: Spacing.lg,
    ...Typography.bodyMedium,
    color: OnSurface.primary,
    minHeight: 240,
  },
});
