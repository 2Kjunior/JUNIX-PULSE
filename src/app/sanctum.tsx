/**
 * Ecran R-12 — Sanctuaire (V2 — Multi-carnets + fallback PIN).
 * Harmonisé avec le système Midnight Glassmorphism Junix Pulse.
 *
 * Architecture en 3 vues :
 *  1. Vue verrouillée    — Authentification biométrique ou PIN applicatif
 *  2. Vue liste          — Carnets secrets filtrables par dossier/recherche avec GlassFAB 3D
 *  3. Vue éditeur        — Création / édition d'un carnet secret dans des cartes de verre
 *
 * Règle R-12 : pas de cryptographie maison, délégation native (expo-secure-store).
 * Le code PIN protège toujours le coffre ; la biométrie est un raccourci proposé à l'utilisateur.
 * Auto-verrouillage au passage en arrière-plan (AppState listener).
 * Captures d'écran et aperçu des applications récentes bloqués tant que l'écran est ouvert.
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';

import { SanctumRepository, type SanctumNote } from '@/repositories/sanctum-repository';
import { SanctumAuthService } from '@/services/sanctum-auth-service';
import { useAppStore } from '@/store/app-store';
import { useLanguage, useT, type TFunction } from '@/i18n';
import { sanctumFolderLabel, translateSanctumError } from '@/i18n/sanctum-text';
import {
  filterSanctumNotes,
  extractUniqueFolders,
  formatSanctumSnippet,
  validateSanctumPin,
  validateNewSanctumPin,
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
type SanctumView = 'locked' | 'pin_setup' | 'pin_verify' | 'pin_change' | 'list' | 'editor';

// ═════════════════════════════════════════════════════════════════════════════
export default function SanctumScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ action?: string }>();
  const { showSnackbar } = useAppStore();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeSanctumStyles);
  const formStyles = useThemedStyles(makeFormStyles);
  const t = useT();
  const language = useLanguage();

  // ─── Clé cryptographique active en mémoire volatile (jamais persistée en clair) ───
  const activeKeyRef = useRef<Uint8Array | null>(null);

  // ─── Etat global ────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<SanctumView>('locked');
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [hasPinConfigured, setHasPinConfigured] = useState(false);

  // ─── PIN state (Création & Déverrouillage) ──────────────────────────────
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // ─── Décompte du verrouillage temporaire (Lockout V-03) ────────────────
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPinError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  useEffect(() => {
    if (currentView === 'pin_verify') {
      SanctumAuthService.getLockoutStatus().then((status) => {
        if (status.isLocked) {
          setLockoutRemaining(status.remainingSeconds);
          setPinError(t('sanctum.lockedRetry', { seconds: status.remainingSeconds }));
        }
      });
    }
  }, [currentView, t]);

  // ─── PIN Change state (Modification depuis le Sanctuaire) ──────────────
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const [pinChangeError, setPinChangeError] = useState('');

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

  // ─── Le contenu du coffre ne doit apparaître ni en capture ni dans les applications récentes ──
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync('sanctum').catch(() => {});
    if (Platform.OS === 'ios') ScreenCapture.enableAppSwitcherProtectionAsync().catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync('sanctum').catch(() => {});
      if (Platform.OS === 'ios') ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);

  // ─── Auto-lock quand l'app passe en arrière-plan (purge la clé en RAM) ──
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        if (
          currentView !== 'locked' &&
          currentView !== 'pin_setup' &&
          currentView !== 'pin_verify'
        ) {
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
        const biometricsEnabled = await SanctumAuthService.isBiometricUnlockEnabled();
        setHasBiometrics(biometricsEnabled);

        const pinConfigured = await SanctumAuthService.isPinConfigured();
        setHasPinConfigured(pinConfigured);

        if (!pinConfigured) {
          // Premier accès obligatoire : l'utilisateur doit d'abord enregistrer son code PIN
          setCurrentView('pin_setup');
          return;
        }

        // Si la biométrie a été activée, tenter le déverrouillage direct
        if (biometricsEnabled) {
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
      // Le système exige lui-même l'authentification avant de rendre la clé
      const result = await SanctumAuthService.unlockWithBiometrics();
      if (result.status === 'unlocked') {
        activeKeyRef.current = result.key;
        await onAuthSuccess(result.key);
      } else if (result.status === 'unavailable') {
        setHasBiometrics(false);
        setAuthError(t('sanctum.biometricChanged'));
      }
    } catch {
      setAuthError(t('sanctum.biometricError'));
    } finally {
      setAuthenticating(false);
    }
  };

  // ─── Biométrie : proposée après un code PIN correct, jamais activée sans accord ──
  const offerBiometricUnlock = async (key: Uint8Array) => {
    if (!(await SanctumAuthService.shouldOfferBiometricUnlock())) return;
    Alert.alert(
      t('sanctum.offerTitle'),
      t('sanctum.offerBody'),
      [
        { text: t('sanctum.noThanks'), style: 'cancel', onPress: () => void SanctumAuthService.declineBiometricUnlock() },
        {
          text: t('sanctum.enable'),
          onPress: async () => {
            const enabled = await SanctumAuthService.enableBiometricUnlock(key);
            setHasBiometrics(enabled);
            if (!enabled) showSnackbar(t('sanctum.biometricOff'));
          },
        },
      ]
    );
  };

  // ─── Transition succès d'authentification ─────────────────────────────
  const onAuthSuccess = async (key: Uint8Array) => {
    try {
      await SanctumRepository.encryptLegacyFields(key);
      const allNotes = await SanctumRepository.getAllNotes(key);
      setNotes(allNotes);
      if (params.action === 'change_pin') {
        setCurrentView('pin_change');
      } else {
        setCurrentView('list');
      }
      setAuthError('');
    } catch {
      showSnackbar(t('sanctum.decryptError'));
    }
  };

  // ─── Gestion PIN : configuration scrypt + SecureStore ─────────────────
  const handlePinSetup = async () => {
    if (pinStep === 'enter') {
      const validation = validateNewSanctumPin(pinInput);
      if (!validation.valid) {
        setPinError(translateSanctumError(validation.error ?? '', t));
        return;
      }
      setPinStep('confirm');
      setPinError('');
      setPinConfirm('');
      return;
    }

    if (pinInput !== pinConfirm) {
      setPinError(t('sanctum.pinMismatch'));
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
      showSnackbar(t('sanctum.pinCreated'));
      await onAuthSuccess(masterKey);
      void offerBiometricUnlock(masterKey);
    } catch {
      setPinError(t('sanctum.pinSetupError'));
    }
  };

  // ─── Gestion PIN : modification depuis le Sanctuaire ──────────────────
  const handleChangePin = async () => {
    setPinChangeError('');
    if (!oldPinInput) {
      setPinChangeError(t('sanctum.enterCurrent'));
      return;
    }
    const validation = validateNewSanctumPin(newPinInput);
    if (!validation.valid) {
      setPinChangeError(validation.error ? translateSanctumError(validation.error, t) : t('sanctum.newPinInvalid'));
      return;
    }
    if (newPinInput !== newPinConfirm) {
      setPinChangeError(t('sanctum.newMismatch'));
      return;
    }
    if (oldPinInput === newPinInput) {
      setPinChangeError(t('sanctum.mustDiffer'));
      return;
    }

    setChangingPin(true);
    try {
      const result = await SanctumAuthService.changePin(oldPinInput, newPinInput);
      if (result.success && result.newKey) {
        activeKeyRef.current = result.newKey;
        setOldPinInput('');
        setNewPinInput('');
        setNewPinConfirm('');
        setPinChangeError('');
        showSnackbar(t('sanctum.pinChanged'));
        const allNotes = await SanctumRepository.getAllNotes(result.newKey);
        setNotes(allNotes);
        setHasBiometrics(false);
        setCurrentView('list');
        void offerBiometricUnlock(result.newKey);
      } else {
        setPinChangeError(translateSanctumError(result.error ?? 'Échec lors du changement de code PIN', t));
      }
    } catch {
      setPinChangeError(t('sanctum.changeUnexpected'));
    } finally {
      setChangingPin(false);
    }
  };

  // ─── Gestion PIN : vérification scrypt + Poly1305 avec Lockout ─────────
  const handlePinVerify = async () => {
    if (lockoutRemaining > 0) {
      setPinError(t('sanctum.lockedRetry', { seconds: lockoutRemaining }));
      return;
    }

    const validation = validateSanctumPin(pinInput);
    if (!validation.valid) {
      setPinError(translateSanctumError(validation.error ?? '', t));
      return;
    }

    try {
      const result = await SanctumAuthService.verifyAndUnlockWithPin(pinInput);
      if (result.success && result.key) {
        activeKeyRef.current = result.key;
        setPinInput('');
        setPinError('');
        setLockoutRemaining(0);
        await onAuthSuccess(result.key);
        void offerBiometricUnlock(result.key);
      } else {
        if (result.isLocked && result.remainingSeconds) {
          setLockoutRemaining(result.remainingSeconds);
        }
        setPinError(translateSanctumError(result.error ?? 'Code PIN incorrect', t));
        setPinInput('');
      }
    } catch {
      setPinError(t('sanctum.verifyError'));
      setPinInput('');
    }
  };

  // ─── Actions CRUD carnets ─────────────────────────────────────────────
  const handleNewNote = () => {
    setEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorFolder(DEFAULT_SANCTUM_FOLDERS[0]);
    setCurrentView('editor');
  };

  const handleEditNote = (note: SanctumNote) => {
    // L'enregistrer écraserait définitivement le contenu d'origine
    if (note.unreadable) {
      showSnackbar(t('sanctum.unreadable'));
      return;
    }
    setEditingNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorFolder(note.folder);
    setCurrentView('editor');
  };

  const handleSaveNote = async () => {
    const validation = validateSanctumNoteInput(editorTitle, editorContent);
    if (!validation.valid) {
      showSnackbar(validation.error ? translateSanctumError(validation.error, t) : t('sanctum.validationError'));
      return;
    }

    const key = activeKeyRef.current;
    if (!key) {
      handleLock();
      return;
    }

    setSaving(true);
    try {
      await SanctumRepository.saveNote(
        {
          id: editingNote?.id,
          title: editorTitle.trim() || t('sanctum.untitled'),
          content: editorContent,
          folder: editorFolder,
        },
        key
      );
      const allNotes = await SanctumRepository.getAllNotes(key);
      setNotes(allNotes);
      showSnackbar(editingNote ? t('sanctum.noteUpdated') : t('sanctum.noteCreated'));
      setCurrentView('list');
    } catch {
      showSnackbar(t('sanctum.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (note: SanctumNote) => {
    Alert.alert(
      t('sanctum.deleteTitle'),
      t('sanctum.deleteBody', { title: note.title || t('sanctum.thisNote') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await SanctumRepository.deleteNote(note.id);
            setNotes(current => current.filter(item => item.id !== note.id));
            showSnackbar(t('sanctum.noteDeleted'));
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
    showSnackbar(t('sanctum.locked'));
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
          <Text style={styles.lockTitle}>{t('sanctum.title')}</Text>
          <Text style={styles.lockSubtitle}>
            {t('sanctum.lockSubtitle')}
          </Text>

          {!!authError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.error.default} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          {/* Premier accès : configuration obligatoire du code PIN */}
          {!hasPinConfigured && (
            <Button
              label={t('sanctum.setupPin')}
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

          {/* Biométrie disponible avec PIN déjà configuré : accès direct en 1 touche */}
          {hasPinConfigured && hasBiometrics && (
            <Button
              label={authenticating ? t('sanctum.verifying') : t('sanctum.unlockBiometric')}
              onPress={authenticateBiometric}
              variant="primary"
              size="lg"
              loading={authenticating}
              icon={<Ionicons name="finger-print" size={20} color="#FFFFFF" />}
              style={styles.unlockBtn}
            />
          )}

          {/* Appareil sans biométrie : saisie directe du code PIN */}
          {hasPinConfigured && !hasBiometrics && (
            <Button
              label={t('sanctum.enterPin')}
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

          {/* Fallback de secours : si la biométrie échoue ou n'est pas souhaitée */}
          {hasBiometrics && hasPinConfigured && (
            <TouchableOpacity
              style={styles.altAuthLink}
              onPress={() => {
                setPinInput('');
                setPinError('');
                setCurrentView('pin_verify');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('sanctum.usePinBackup')}
            >
              <Ionicons name="keypad-outline" size={16} color={theme.onSurface.variant} />
              <Text style={styles.altAuthText}>{t('sanctum.usePinBackup')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('sanctum.backToApp')}
          >
            <Text style={styles.backLinkText}>{t('sanctum.backToApp')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE PIN SETUP (Premier accès ou initialisation)
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === 'pin_setup') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.glassLockCard}>
          <View style={styles.pinIconBadge}>
            <Ionicons name="key-outline" size={32} color={theme.primary.default} />
          </View>
          <Text style={styles.lockTitle}>
            {pinStep === 'enter' ? t('sanctum.initPin') : t('sanctum.confirmPin')}
          </Text>
          <Text style={styles.lockSubtitle}>
            {pinStep === 'enter'
              ? t('sanctum.chooseCode')
              : t('sanctum.reenterCode')}
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
            label={pinStep === 'enter' ? t('common.next') : t('sanctum.confirmEncrypt')}
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
              if (!hasPinConfigured) {
                router.back();
              } else {
                setCurrentView('locked');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={t('sanctum.cancelSetupA11y')}
          >
            <Text style={styles.backLinkText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE PIN CHANGE (Modification depuis le Sanctuaire déverrouillé)
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === 'pin_change') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.glassLockCard}>
          <View style={styles.pinIconBadge}>
            <Ionicons name="key-outline" size={32} color={theme.primary.default} />
          </View>
          <Text style={styles.lockTitle}>{t('sanctum.changePin')}</Text>
          <Text style={styles.lockSubtitle}>
            {t('sanctum.changeSubtitle')}
          </Text>

          <View style={styles.pinFormGroup}>
            <Text style={styles.pinFieldLabel}>{t('sanctum.currentPin')}</Text>
            <TextInput
              style={styles.pinFieldInput}
              value={oldPinInput}
              onChangeText={setOldPinInput}
              placeholder="••••"
              placeholderTextColor={theme.onSurface.disabled}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
          </View>

          <View style={styles.pinFormGroup}>
            <Text style={styles.pinFieldLabel}>{t('sanctum.newPin')}</Text>
            <TextInput
              style={styles.pinFieldInput}
              value={newPinInput}
              onChangeText={setNewPinInput}
              placeholder="••••"
              placeholderTextColor={theme.onSurface.disabled}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
          </View>

          <View style={styles.pinFormGroup}>
            <Text style={styles.pinFieldLabel}>{t('sanctum.confirmNew')}</Text>
            <TextInput
              style={styles.pinFieldInput}
              value={newPinConfirm}
              onChangeText={setNewPinConfirm}
              placeholder="••••"
              placeholderTextColor={theme.onSurface.disabled}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
          </View>

          {!!pinChangeError && (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.error.default} />
              <Text style={styles.errorText}>{pinChangeError}</Text>
            </View>
          )}

          <Button
            label={changingPin ? 'Modification...' : 'Enregistrer le nouveau PIN'}
            onPress={handleChangePin}
            variant="primary"
            size="lg"
            loading={changingPin}
            style={styles.unlockBtn}
          />

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => {
              setOldPinInput('');
              setNewPinInput('');
              setNewPinConfirm('');
              setPinChangeError('');
              setCurrentView('list');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('sanctum.cancelChangeA11y')}
          >
            <Text style={styles.backLinkText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE PIN VERIFY (Déverrouillage par code de secours)
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === 'pin_verify') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.glassLockCard}>
          <View style={styles.pinIconBadge}>
            <Ionicons name="keypad-outline" size={32} color={theme.primary.default} />
          </View>
          <Text style={styles.lockTitle}>{t('sanctum.pinTitle')}</Text>
          <Text style={styles.lockSubtitle}>
            {t('sanctum.pinSubtitle')}
          </Text>

          <TextInput
            style={[styles.pinInput, lockoutRemaining > 0 && { opacity: 0.5 }]}
            value={pinInput}
            onChangeText={setPinInput}
            placeholder={lockoutRemaining > 0 ? t('sanctum.lockedShort') : t('sanctum.pinTitle')}
            placeholderTextColor={theme.onSurface.disabled}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            editable={lockoutRemaining === 0}
            autoFocus={lockoutRemaining === 0}
          />

          {lockoutRemaining > 0 ? (
            <View style={[styles.errorBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="time-outline" size={16} color={theme.error.default} />
              <Text style={styles.errorText}>
                {t('sanctum.lockedRetryShort', { seconds: lockoutRemaining })}
              </Text>
            </View>
          ) : (
            !!pinError && (
              <View style={styles.errorBadge}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.error.default} />
                <Text style={styles.errorText}>{pinError}</Text>
              </View>
            )
          )}

          <Button
            label={lockoutRemaining > 0 ? t('sanctum.lockedBtn', { seconds: lockoutRemaining }) : t('sanctum.unlock')}
            onPress={handlePinVerify}
            variant="primary"
            size="lg"
            disabled={lockoutRemaining > 0}
            icon={
              <Ionicons
                name={lockoutRemaining > 0 ? 'time-outline' : 'lock-open-outline'}
                size={20}
                color="#FFFFFF"
              />
            }
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
            accessibilityLabel={t('sanctum.backToLockA11y')}
          >
            <Text style={styles.backLinkText}>{t('common.back')}</Text>
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
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="arrow-back" size={24} color={theme.onSurface.primary} />
          </TouchableOpacity>
          <View style={formStyles.toolbarCenter}>
            <Text style={formStyles.toolbarTitle}>{t('sanctum.title')}</Text>
            <Text style={formStyles.toolbarSubtitle}>{t('sanctum.secureSpace')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <TouchableOpacity
              style={formStyles.toolbarBtn}
              onPress={() => {
                setOldPinInput('');
                setNewPinInput('');
                setNewPinConfirm('');
                setPinChangeError('');
                setCurrentView('pin_change');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('sanctum.changePin')}
            >
              <View style={styles.lockIconBadge}>
                <Ionicons name="key-outline" size={16} color={theme.primary.default} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={formStyles.toolbarBtn}
              onPress={handleLock}
              accessibilityRole="button"
              accessibilityLabel={t('sanctum.lockA11y')}
            >
              <View style={styles.lockIconBadge}>
                <Ionicons name="lock-closed" size={16} color={theme.primary.default} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Badge sécurité */}
        <View style={styles.secureBadgeCentered}>
          <Ionicons name="shield-checkmark" size={14} color={theme.success.default} />
          <Text style={styles.secureBadgeText}>
            {t('sanctum.unlockedBadge')}
          </Text>
        </View>

        {/* Barre de recherche Glassmorphism */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={theme.primary.default} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('sanctum.search')}
            placeholderTextColor={theme.onSurface.disabled}
          />
          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('sanctum.clearSearch')}
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
                key={sanctumFolderLabel(folder, t)}
                style={[formStyles.chip, isActive && formStyles.chipActive]}
                onPress={() => setActiveFolder(folder)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t('sanctum.folderA11y', { folder: sanctumFolderLabel(folder, t), selected: isActive ? t('settingsScreen.selectedSuffix') : '' })}
              >
                <Text style={[formStyles.chipText, isActive && formStyles.chipTextActive]}>
                  {sanctumFolderLabel(folder, t)}
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
                {searchQuery ? t('search.noResult') : t('sanctum.emptyTitle')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? t('sanctum.emptySearch')
                  : t('sanctum.emptyHint')}
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
              accessibilityLabel={t('sanctum.noteA11y', { title: item.title || t('sanctum.untitled'), folder: sanctumFolderLabel(item.folder, t) })}
            >
              <View style={styles.noteCardHeader}>
                <View style={styles.noteCardTitleRow}>
                  <Ionicons name="lock-closed" size={16} color={theme.primary.default} />
                  <Text style={styles.noteCardTitle} numberOfLines={1}>
                    {item.title || t('sanctum.untitled')}
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
                {t('sanctum.modified', { when: formatRelativeDate(item.updated_at, t, language) })}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Bouton Nouveau carnet 3D Glassmorphism */}
        <GlassFloatingActionButton
          label={t('sanctum.newNote')}
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
          accessibilityLabel={t('sanctum.cancelBackA11y')}
        >
          <Text style={formStyles.toolbarCancel}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <Text style={formStyles.toolbarTitle}>
            {editingNote ? t('sanctum.edit') : t('sanctum.newNote')}
          </Text>
          <Text style={formStyles.toolbarSubtitle}>{t('sanctum.privateTitle')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {editingNote && (
            <TouchableOpacity
              onPress={() => handleDeleteNote(editingNote)}
              accessibilityRole="button"
              accessibilityLabel={t('sanctum.deleteA11y')}
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
            accessibilityLabel={t('sanctum.saveA11y')}
          >
            <Text style={[formStyles.toolbarSave, saving && formStyles.toolbarSaveDisabled]}>
              {saving ? t('sanctum.saving') : t('taskNew.create')}
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
            placeholder={t('sanctum.titlePlaceholder')}
            placeholderTextColor={theme.onSurface.disabled}
            maxLength={100}
            autoFocus
          />

          {/* Sélecteur de dossier */}
          <TouchableOpacity
            style={styles.folderSelector}
            onPress={() => setShowFolderPicker(!showFolderPicker)}
            accessibilityRole="button"
            accessibilityLabel={t('sanctum.folderPickA11y', { folder: sanctumFolderLabel(editorFolder, t) })}
          >
            <View style={styles.folderBadgeSmall}>
              <Ionicons name="folder-outline" size={16} color={theme.primary.default} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.folderLabelSmall}>{t('sanctum.folderLabel')}</Text>
              <Text style={styles.folderSelectorText}>{sanctumFolderLabel(editorFolder, t)}</Text>
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
                  key={sanctumFolderLabel(folder, t)}
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
                  accessibilityLabel={t('sanctum.folderA11y', { folder: sanctumFolderLabel(folder, t), selected: editorFolder === folder ? t('settingsScreen.selectedSuffix') : '' })}
                >
                  <Text
                    style={[
                      styles.folderPickerItemText,
                      editorFolder === folder && styles.folderPickerItemTextActive,
                    ]}
                  >
                    {sanctumFolderLabel(folder, t)}
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
              placeholder={t('sanctum.contentPlaceholder')}
              placeholderTextColor={theme.onSurface.disabled}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Bouton de sauvegarde */}
        <Button
          label={editingNote ? t('sanctum.update') : t('sanctum.create')}
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
function formatRelativeDate(iso: string, t: TFunction, localeCode: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return t('sanctum.justNow');
  if (diffMin < 60) return t('sanctum.minAgo', { count: diffMin });
  if (diffH < 24) return t('sanctum.hoursAgo', { count: diffH });
  if (diffD < 7) return t('sanctum.daysAgo', { count: diffD });
  return date.toLocaleDateString(localeCode === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
}
