/**
 * Écran Gestion du Planning Personnel (Semaine type).
 * Permet de définir ses blocs récurrents (Travail, Repos, Personnel, Sommeil).
 * BR-013 : le planning est une intention de structure, pas une contrainte rigide.
 * BR-015 : format horaire HH:MM enforced.
 * BR-016 : détection de collision côté use case.
 * BR-017 : fin > début.
 *
 * Vues disponibles :
 *  - "list"  → vue onglet par jour (affichage carte par carte)
 *  - "grid"  → vue matrice 7 jours simultanés (aperçu de la semaine)
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ScheduleUseCases } from '@/use-cases/schedule-use-cases';
import { PlanningBlock, PlanningBlockType } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Spacing, type GlowTone } from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { makeScheduleStyles } from '@/styles/settings/schedule-styles';
import { WeeklyTimetableGrid } from '@/components/schedule/WeeklyTimetableGrid';

const DAYS_OF_WEEK = [
  { num: 1, label: 'Lun', full: 'Lundi' },
  { num: 2, label: 'Mar', full: 'Mardi' },
  { num: 3, label: 'Mer', full: 'Mercredi' },
  { num: 4, label: 'Jeu', full: 'Jeudi' },
  { num: 5, label: 'Ven', full: 'Vendredi' },
  { num: 6, label: 'Sam', full: 'Samedi' },
  { num: 0, label: 'Dim', full: 'Dimanche' },
];

type IoniconName = keyof typeof Ionicons.glyphMap;
type ViewMode = 'list' | 'grid';

/** Regex HH:MM côté UI — donne un retour immédiat avant de toucher le use case */
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function PersonalScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeScheduleStyles);

  const BLOCK_TYPES: { type: PlanningBlockType; label: string; icon: IoniconName; color: string }[] = [
    { type: 'WORK', label: 'Travail', icon: 'briefcase', color: palette.primary.default },
    { type: 'STUDY', label: 'Études', icon: 'book', color: palette.tertiary.default },
    { type: 'REST', label: 'Repos / Loisirs', icon: 'cafe', color: '#4CAF50' },
    { type: 'SPORT', label: 'Sport', icon: 'fitness', color: '#FF9800' },
    { type: 'HOUSE', label: 'Maison / Famille', icon: 'home', color: '#9C27B0' },
    { type: 'FREE', label: 'Temps libre', icon: 'sparkles', color: '#00BCD4' },
    { type: 'OTHER', label: 'Autre', icon: 'ellipsis-horizontal', color: palette.onSurface.variant },
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDay, setSelectedDay] = useState<number>(1); // Lundi par défaut
  const [allBlocks, setAllBlocks] = useState<PlanningBlock[]>([]);

  // Formulaire d'ajout
  const [showModal, setShowModal] = useState(false);
  const [blockLabel, setBlockLabel] = useState('');
  const [customLabel, setCustomLabel] = useState(''); // Champ libre quand type === 'OTHER'
  const [blockType, setBlockType] = useState<PlanningBlockType>('WORK');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const blocks = await ScheduleUseCases.getActiveScheduleBlocks();
      setAllBlocks(blocks);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement du planning.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const resetForm = () => {
    setBlockLabel('');
    setCustomLabel('');
    setBlockType('WORK');
    setStartTime('08:00');
    setEndTime('12:00');
  };

  const handleAddBlock = async () => {
    // BR-015 : validation UI avant d'appeler le use case
    const labelToUse = blockType === 'OTHER' ? customLabel.trim() : blockLabel.trim();
    if (!labelToUse) {
      Alert.alert(
        'Champ requis',
        blockType === 'OTHER'
          ? 'Veuillez préciser le type d\'activité (champ "Autre").'
          : 'Veuillez saisir un nom pour ce bloc.'
      );
      return;
    }

    if (!HH_MM_REGEX.test(startTime)) {
      Alert.alert('Format invalide', 'L\'heure de début doit être au format HH:MM (ex: 08:30).');
      return;
    }
    if (!HH_MM_REGEX.test(endTime)) {
      Alert.alert('Format invalide', 'L\'heure de fin doit être au format HH:MM (ex: 12:00).');
      return;
    }

    try {
      setSaving(true);
      await ScheduleUseCases.createBlock({
        label: blockType === 'OTHER' ? 'Autre' : labelToUse,
        customLabel: blockType === 'OTHER' ? customLabel.trim() : undefined,
        type: blockType,
        dayOfWeek: selectedDay,
        startTime,
        endTime,
      });

      showSnackbar('Bloc planning ajouté !');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: unknown) {
      // Les erreurs de collision et de format remontent depuis le use case
      Alert.alert('Impossible d\'ajouter', error instanceof Error ? error.message : 'Erreur inconnue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId: string, label: string) => {
    Alert.alert('Supprimer', `Supprimer le bloc "${label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await ScheduleUseCases.deleteBlock(blockId);
          showSnackbar('Bloc supprimé');
          loadData();
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingState message="Chargement de votre emploi du temps..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const currentDayBlocks = allBlocks
    .filter(b => b.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const selectedDayInfo = DAYS_OF_WEEK.find(d => d.num === selectedDay)!;

  return (
    <View style={styles.container}>
      {/* ─── Header R-09 (Standardisé selon le modèle Personnes) ───────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.circularBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour aux réglages"
          >
            <Ionicons name="arrow-back" size={20} color={palette.onSurface.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Planning Personnel</Text>
            <Text style={styles.subtitle}>Semaine type • Blocs récurrents</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.circularBtn}
          onPress={() => setShowModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un bloc hebdomadaire"
        >
          <Ionicons name="add" size={22} color={palette.primary.default} />
        </TouchableOpacity>
      </View>

      {/* ─── Segmented Control PillTopBar (Modèle Personnes) ─────────────────── */}
      <PillTopBar
        tabs={[
          {
            key: 'list',
            label: 'Liste',
            count: allBlocks.length,
            icon: 'list-outline',
          },
          {
            key: 'grid',
            label: 'Semaine',
            icon: 'grid-outline',
          },
        ]}
        activeTab={viewMode}
        onTabChange={(k) => setViewMode(k as ViewMode)}
      />

      {viewMode === 'list' ? (
        /* ─── VUE LISTE ─────────────────────────────────────────────────────────── */
        <>
          {/* Barre des jours */}
          <View style={styles.daysBar}>
            {DAYS_OF_WEEK.map(d => (
              <TouchableOpacity
                key={d.num}
                style={[styles.dayTab, selectedDay === d.num && styles.dayTabActive]}
                onPress={() => setSelectedDay(d.num)}
                accessibilityRole="tab"
                accessibilityState={{ selected: selectedDay === d.num }}
                accessibilityLabel={`${d.label}${selectedDay === d.num ? ', sélectionné' : ''}`}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    selectedDay === d.num && styles.dayTabTextActive,
                  ]}
                >
                  {d.label}
                </Text>
                {/* Badge nombre de blocs */}
                {allBlocks.filter(b => b.dayOfWeek === d.num).length > 0 && (
                  <View style={styles.dayTabBadge}>
                    <Text style={styles.dayTabBadgeText}>
                      {allBlocks.filter(b => b.dayOfWeek === d.num).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{selectedDayInfo.full}</Text>
              <Text style={styles.daySub}>
                {currentDayBlocks.length} bloc{currentDayBlocks.length !== 1 ? 's' : ''} planifié{currentDayBlocks.length !== 1 ? 's' : ''} • trié par heure
              </Text>
            </View>

            {currentDayBlocks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={36} color={palette.onSurface.disabled} />
                <Text style={styles.emptyTitle}>Aucun bloc pour {selectedDayInfo.full}</Text>
                <Text style={styles.emptyDesc}>
                  Ajoutez des blocs de travail, repos ou loisirs pour structurer vos journées.
                </Text>
                <Button
                  label="Ajouter un bloc"
                  onPress={() => setShowModal(true)}
                  variant="secondary"
                  size="sm"
                  style={{ marginTop: Spacing.md }}
                />
              </View>
            ) : (
              currentDayBlocks.map((block, idx) => {
                const typeConfig = BLOCK_TYPES.find(t => t.type === block.type) || BLOCK_TYPES[0];
                const tone: GlowTone =
                  block.type === 'WORK' || block.type === 'HOUSE'
                    ? 'primary'
                    : block.type === 'SPORT'
                    ? 'attention'
                    : block.type === 'REST'
                    ? 'success'
                    : block.type === 'STUDY' || block.type === 'FREE'
                    ? 'info'
                    : 'neutral';

                return (
                  <GlowCard
                    key={block.id}
                    index={idx}
                    tone={tone}
                    intensity="default"
                    style={styles.listGlowCard}
                    onPress={() => {
                      Alert.alert(
                        block.label,
                        `Horaire : ${block.startTime} à ${block.endTime}\nType : ${typeConfig.label}`,
                        [
                          { text: 'Fermer', style: 'cancel' },
                          {
                            text: 'Supprimer',
                            style: 'destructive',
                            onPress: () => handleDeleteBlock(block.id, block.label),
                          },
                        ]
                      );
                    }}
                  >
                    <View style={styles.blockCardHeader}>
                      <View style={styles.blockBadgeGroup}>
                        <View style={[styles.blockBadge, { backgroundColor: typeConfig.color + '22' }]}>
                          <Ionicons name={typeConfig.icon} size={13} color={typeConfig.color} />
                          <Text style={[styles.blockBadgeText, { color: typeConfig.color }]}>
                            {typeConfig.label}
                          </Text>
                        </View>
                        <Text style={styles.cardTimeText}>
                          {block.startTime} – {block.endTime}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteBlock(block.id, block.label)}
                        style={styles.deleteIconBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer le bloc ${block.label}`}
                      >
                        <Ionicons name="trash-outline" size={17} color={palette.error.default} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.blockTitle}>{block.label}</Text>

                    <View style={styles.blockMetaRow}>
                      <Text style={styles.blockMetaText}>
                        {selectedDayInfo.full} • Créneau récurrent
                      </Text>
                      <Ionicons name="repeat-outline" size={14} color={palette.onSurface.disabled} />
                    </View>
                  </GlowCard>
                );
              })
            )}
          </ScrollView>
        </>
      ) : (
        /* ─── VUE GRILLE 7 JOURS (Stitch Emploi du Temps - Grille Hebdomadaire) ─── */
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <WeeklyTimetableGrid
            blocks={allBlocks}
            onAddBlock={(dayNum, defaultTime) => {
              setSelectedDay(dayNum);
              if (defaultTime) {
                setStartTime(defaultTime);
                const [h] = defaultTime.split(':').map(Number);
                setEndTime(`${String(Math.min(22, h + 2)).padStart(2, '0')}:00`);
              }
              setShowModal(true);
            }}
            onDeleteBlock={handleDeleteBlock}
            onSelectBlock={(block) => {
              Alert.alert(
                block.label,
                `Horaire : ${block.startTime} à ${block.endTime}\nType : ${block.type}\nJour : ${DAYS_OF_WEEK.find(d => d.num === block.dayOfWeek)?.full}`,
                [
                  { text: 'Fermer', style: 'cancel' },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => handleDeleteBlock(block.id, block.label),
                  },
                ]
              );
            }}
          />
        </ScrollView>
      )}

      {/* ─── Modal d'ajout de bloc ─────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Nouveau bloc — {DAYS_OF_WEEK.find(d => d.num === selectedDay)?.full}
              </Text>
              <TouchableOpacity
                onPress={() => { setShowModal(false); resetForm(); }}
                accessibilityRole="button"
                accessibilityLabel="Fermer la boîte de dialogue"
              >
                <Ionicons name="close" size={24} color={palette.onSurface.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type d'activité d'abord — conditionne le label */}
              <Text style={styles.label}>Type d'activité</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                {BLOCK_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.typePill,
                      blockType === t.type && { backgroundColor: t.color, borderColor: t.color },
                    ]}
                    onPress={() => setBlockType(t.type)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: blockType === t.type }}
                    accessibilityLabel={`${t.label}${blockType === t.type ? ', sélectionné' : ''}`}
                  >
                    <Ionicons
                      name={t.icon}
                      size={16}
                      color={blockType === t.type ? palette.surface.base : palette.onSurface.primary}
                    />
                    <Text
                      style={[
                        styles.typePillText,
                        blockType === t.type && { color: palette.surface.base, fontWeight: '700' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Nom du bloc — masqué quand type = 'OTHER' car customLabel prend le relais */}
              {blockType !== 'OTHER' ? (
                <>
                  <Text style={[styles.label, { marginTop: Spacing.md }]}>Nom du bloc *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex: Session Code, Sport du matin..."
                    placeholderTextColor={palette.onSurface.disabled}
                    value={blockLabel}
                    onChangeText={setBlockLabel}
                    returnKeyType="next"
                  />
                </>
              ) : (
                /* Champ libre pour 'OTHER' — BR : préciser obligatoirement le type */
                <>
                  <Text style={[styles.label, { marginTop: Spacing.md }]}>
                    Précisez l'activité *
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex: Méditation, Lecture, Cuisine..."
                    placeholderTextColor={palette.onSurface.disabled}
                    value={customLabel}
                    onChangeText={setCustomLabel}
                    returnKeyType="next"
                    autoFocus
                  />
                  <Text style={styles.fieldHint}>
                    Ce libellé sera utilisé comme nom du bloc dans votre emploi du temps.
                  </Text>
                </>
              )}

              {/* Horaires HH:MM */}
              <Text style={[styles.label, { marginTop: Spacing.md }]}>
                Horaires (format HH:MM) *
              </Text>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[
                      styles.input,
                      !HH_MM_REGEX.test(startTime) && startTime.length > 0 && styles.inputError,
                    ]}
                    placeholder="08:00"
                    placeholderTextColor={palette.onSurface.disabled}
                    value={startTime}
                    onChangeText={setStartTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
                <Text style={styles.timeSep}>à</Text>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[
                      styles.input,
                      !HH_MM_REGEX.test(endTime) && endTime.length > 0 && styles.inputError,
                    ]}
                    placeholder="12:00"
                    placeholderTextColor={palette.onSurface.disabled}
                    value={endTime}
                    onChangeText={setEndTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
              <Text style={styles.fieldHint}>
                Format 24 h — ex: 08:30, 13:00, 22:15
              </Text>

              <Button
                label={saving ? 'Ajout en cours...' : 'Ajouter le bloc'}
                onPress={handleAddBlock}
                disabled={saving}
                style={{ marginTop: Spacing.xl, marginBottom: Spacing.lg }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
