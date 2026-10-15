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
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Spacing } from '@/constants/theme';
import { LoadingState, ErrorState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';
import { makeScheduleStyles } from '@/styles/settings/schedule-styles';

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
    } catch (error: unknown) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible d’ajouter le bloc planning.');
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
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emploi du temps type</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color={palette.surface.base} />
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
                  <Ionicons name={typeConfig.icon} size={20} color={typeConfig.color} />
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
                  <Ionicons name="trash-outline" size={18} color={palette.error.default} />
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
                <Ionicons name="close" size={24} color={palette.onSurface.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Nom du bloc *</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Session Code, Sport, Repos..."
                placeholderTextColor={palette.onSurface.disabled}
                value={blockLabel}
                onChangeText={setBlockLabel}
              />

              <Text style={[styles.label, { marginTop: Spacing.md }]}>Horaires (HH:MM)</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Début (08:00)"
                  placeholderTextColor={palette.onSurface.disabled}
                  value={startTime}
                  onChangeText={setStartTime}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.timeSep}>à</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Fin (12:00)"
                  placeholderTextColor={palette.onSurface.disabled}
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


