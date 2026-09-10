/**
 * Écran Gestion du Planning Personnel (Semaine type).
 * Permet de définir ses blocs récurrents (Travail, Repos, Personnel, Sommeil).
 * BR-013 : le planning est une intention de structure, pas une contrainte rigide.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScheduleUseCases } from '@/use-cases/schedule-use-cases';
import { PlanningBlock, PlanningBlockType } from '@/domain/entities';
import { useAppStore } from '@/store/app-store';
import {
  Surface,
  Primary,
  Tertiary,
  OnSurface,
  Outline,
  Error as ErrorColors,
  Spacing,
  Radius,
  Typography,
} from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';

const DAYS_OF_WEEK = [
  { num: 1, label: 'Lun', full: 'Lundi' },
  { num: 2, label: 'Mar', full: 'Mardi' },
  { num: 3, label: 'Mer', full: 'Mercredi' },
  { num: 4, label: 'Jeu', full: 'Jeudi' },
  { num: 5, label: 'Ven', full: 'Vendredi' },
  { num: 6, label: 'Sam', full: 'Samedi' },
  { num: 0, label: 'Dim', full: 'Dimanche' },
];

const BLOCK_TYPES: { type: PlanningBlockType; label: string; icon: string; color: string }[] = [
  { type: 'WORK', label: 'Travail', icon: 'briefcase', color: Primary.default },
  { type: 'STUDY', label: 'Études', icon: 'book', color: Tertiary.default },
  { type: 'REST', label: 'Repos / Loisirs', icon: 'cafe', color: '#4CAF50' },
  { type: 'SPORT', label: 'Sport', icon: 'fitness', color: '#FF9800' },
  { type: 'HOUSE', label: 'Maison / Famille', icon: 'home', color: '#9C27B0' },
  { type: 'FREE', label: 'Temps libre', icon: 'sparkles', color: '#00BCD4' },
  { type: 'OTHER', label: 'Autre', icon: 'ellipsis-horizontal', color: OnSurface.variant },
];

export default function PersonalScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(1); // Lundi par défaut
  const [allBlocks, setAllBlocks] = useState<PlanningBlock[]>([]);

  // Formulaire d'ajout
  const [showModal, setShowModal] = useState(false);
  const [blockLabel, setBlockLabel] = useState('');
  const [blockType, setBlockType] = useState<PlanningBlockType>('WORK');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const blocks = await ScheduleUseCases.getActiveScheduleBlocks();
      setAllBlocks(blocks);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement du planning.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddBlock = async () => {
    if (!blockLabel.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un nom pour ce bloc.');
      return;
    }

    try {
      setSaving(true);
      await ScheduleUseCases.createBlock({
        label: blockLabel.trim(),
        type: blockType,
        dayOfWeek: selectedDay,
        startTime,
        endTime,
      });

      showSnackbar('Bloc planning ajouté !');
      setShowModal(false);
      setBlockLabel('');
      loadData();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
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

  const currentDayBlocks = allBlocks.filter(b => b.dayOfWeek === selectedDay);
  const selectedDayInfo = DAYS_OF_WEEK.find(d => d.num === selectedDay)!;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={OnSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emploi du temps type</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color={Surface.base} />
        </TouchableOpacity>
      </View>

      {/* Barre des jours */}
      <View style={styles.daysBar}>
        {DAYS_OF_WEEK.map(d => (
          <TouchableOpacity
            key={d.num}
            style={[
              styles.dayTab,
              selectedDay === d.num && styles.dayTabActive,
            ]}
            onPress={() => setSelectedDay(d.num)}
          >
            <Text
              style={[
                styles.dayTabText,
                selectedDay === d.num && styles.dayTabTextActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{selectedDayInfo.full}</Text>
          <Text style={styles.daySub}>
            {currentDayBlocks.length} blocs planifiés
          </Text>
        </View>

        {currentDayBlocks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={36} color={OnSurface.disabled} />
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
          currentDayBlocks.map(block => {
            const typeConfig = BLOCK_TYPES.find(t => t.type === block.type) || BLOCK_TYPES[0];
            return (
              <View key={block.id} style={styles.blockCard}>
                <View
                  style={[
                    styles.blockTypeIcon,
                    { backgroundColor: typeConfig.color + '20' },
                  ]}
                >
                  <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
                </View>

                <View style={styles.blockInfo}>
                  <Text style={styles.blockLabel}>{block.label}</Text>
                  <Text style={styles.blockTime}>
                    {block.startTime} — {block.endTime} ({typeConfig.label})
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteBlock(block.id, block.label)}
                  style={{ padding: Spacing.xs }}
                >
                  <Ionicons name="trash-outline" size={18} color={ErrorColors.default} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal d'ajout de bloc */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Nouveau bloc — {selectedDayInfo.full}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={OnSurface.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Nom du bloc *</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Session Code, Sport, Repos..."
                placeholderTextColor={OnSurface.disabled}
                value={blockLabel}
                onChangeText={setBlockLabel}
              />

              <Text style={[styles.label, { marginTop: Spacing.md }]}>Horaires (HH:MM)</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Début (08:00)"
                  placeholderTextColor={OnSurface.disabled}
                  value={startTime}
                  onChangeText={setStartTime}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.timeSep}>à</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Fin (12:00)"
                  placeholderTextColor={OnSurface.disabled}
                  value={endTime}
                  onChangeText={setEndTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <Text style={[styles.label, { marginTop: Spacing.md }]}>Type d'activité</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                {BLOCK_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.typePill,
                      blockType === t.type && { backgroundColor: t.color, borderColor: t.color },
                    ]}
                    onPress={() => setBlockType(t.type)}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={16}
                      color={blockType === t.type ? Surface.base : OnSurface.primary}
                    />
                    <Text
                      style={[
                        styles.typePillText,
                        blockType === t.type && { color: Surface.base, fontWeight: '700' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Button
                label={saving ? 'Ajout...' : 'Ajouter le bloc'}
                onPress={handleAddBlock}
                disabled={saving}
                style={{ marginTop: Spacing.xl }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Surface.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Surface.container,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.titleLarge, color: OnSurface.primary },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Primary.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysBar: {
    flexDirection: 'row',
    backgroundColor: Surface.container,
    borderBottomWidth: 1,
    borderBottomColor: Outline.variant,
    paddingHorizontal: Spacing.xs,
  },
  dayTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dayTabActive: { borderBottomColor: Primary.default },
  dayTabText: { ...Typography.labelMedium, color: OnSurface.disabled },
  dayTabTextActive: { color: Primary.default, fontWeight: '700' },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  dayHeader: { marginBottom: Spacing.lg },
  dayTitle: { ...Typography.headlineMedium, color: OnSurface.primary },
  daySub: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  emptyCard: {
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  emptyTitle: { ...Typography.titleMedium, color: OnSurface.primary, marginTop: Spacing.md },
  emptyDesc: { ...Typography.bodySmall, color: OnSurface.variant, textAlign: 'center', marginTop: 4 },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.container,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Outline.variant,
  },
  blockTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockInfo: { flex: 1 },
  blockLabel: { ...Typography.titleMedium, color: OnSurface.primary },
  blockTime: { ...Typography.bodySmall, color: OnSurface.variant, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Surface.container,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { ...Typography.titleLarge, color: OnSurface.primary },
  modalBody: {},
  label: { ...Typography.labelMedium, color: OnSurface.variant, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Surface.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Outline.variant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyMedium,
    color: OnSurface.primary,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeSep: { ...Typography.bodyMedium, color: OnSurface.variant },
  typeRow: { flexDirection: 'row', paddingVertical: Spacing.xs },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Outline.variant,
    marginRight: Spacing.xs,
    gap: 4,
  },
  typePillText: { ...Typography.labelSmall, color: OnSurface.primary },
});
