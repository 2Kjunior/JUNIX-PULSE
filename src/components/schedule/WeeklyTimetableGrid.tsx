/**
 * Grille Hebdomadaire de l'Emploi du Temps (Matrice Temporelle 7J).
 * Reproduit fidèlement le design Stitch "Emploi du Temps - Grille Hebdomadaire".
 *
 * Spécifications respectées :
 * - Hauteur proportionnelle à la durée en heures (ex: 2h30 = 2.5 * HOUR_HEIGHT).
 * - Positionnement vertical exact selon l'heure de début (07h00 - 22h00).
 * - Couleurs et styles fidèles au design system Stitch (Deep Focus violet, Vitalité cyan, Projets indigo, Détente ardoise, Zone Tampon IA).
 * - Grille 7 jours avec défilement horizontal fluide et repères horaires horizontaux.
 * - Légende des catégories avec décompte réel des heures prévues.
 * - Carte IA "Junix Pulse IA" avec score de rythme et zones tampons.
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { PlanningBlock, PlanningBlockType } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius, Typography } from '@/constants/theme';

export interface WeeklyTimetableGridProps {
  blocks: PlanningBlock[];
  onAddBlock: (dayNum: number, defaultTime?: string) => void;
  onDeleteBlock: (id: string, label: string) => void;
  onSelectBlock?: (block: PlanningBlock) => void;
}

const START_HOUR = 7;   // 07:00
const END_HOUR = 22;    // 22:00
const TOTAL_HOURS = END_HOUR - START_HOUR; // 15 heures
const HOUR_HEIGHT = 48; // 48px par tranche de 60 minutes (exactement comme dans Stitch)
const TIME_COL_WIDTH = 54;
const DAY_COL_WIDTH = 84;

const DAYS_DEFINITION = [
  { num: 1, label: 'LUN', full: 'Lundi', dateNum: '01' },
  { num: 2, label: 'MAR', full: 'Mardi', dateNum: '02' },
  { num: 3, label: 'MER', full: 'Mercredi', dateNum: '03' },
  { num: 4, label: 'JEU', full: 'Jeudi', dateNum: '04' },
  { num: 5, label: 'VEN', full: 'Vendredi', dateNum: '05' },
  { num: 6, label: 'SAM', full: 'Samedi', dateNum: '06' },
  { num: 0, label: 'DIM', full: 'Dimanche', dateNum: '07' },
];

type PresetFilter = 'ideal' | 'pro' | 'weekend';

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function WeeklyTimetableGrid({
  blocks,
  onAddBlock,
  onDeleteBlock,
  onSelectBlock,
}: WeeklyTimetableGridProps) {
  const { theme, palette, isDark } = useTheme();
  const [activePreset, setActivePreset] = useState<PresetFilter>('ideal');

  // Filtrage des jours selon l'onglet
  const displayedDays = useMemo(() => {
    if (activePreset === 'pro') {
      return DAYS_DEFINITION.filter(d => d.num >= 1 && d.num <= 5);
    }
    if (activePreset === 'weekend') {
      return DAYS_DEFINITION.filter(d => d.num === 6 || d.num === 0);
    }
    return DAYS_DEFINITION; // Semaine idéale (7 jours complets)
  }, [activePreset]);

  // Calcul des statistiques par catégorie pour la légende Stitch
  const stats = useMemo(() => {
    let workMin = 0;
    let sportMin = 0;
    let restMin = 0;
    let otherMin = 0;

    blocks.forEach(b => {
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);
      const dur = Math.max(0, end - start);

      switch (b.type) {
        case 'WORK':
        case 'STUDY':
          workMin += dur;
          break;
        case 'SPORT':
          sportMin += dur;
          break;
        case 'REST':
        case 'FREE':
          restMin += dur;
          break;
        case 'HOUSE':
        case 'OTHER':
        default:
          otherMin += dur;
          break;
      }
    });

    const totalMin = workMin + sportMin + restMin + otherMin;
    const totalHours = Math.round((totalMin / 60) * 10) / 10;

    // Score de rythme estimé selon équilibre travail / repos
    const rhythmScore = totalHours > 0 ? Math.min(98, Math.max(75, Math.round(94 - Math.abs(workMin - (sportMin + restMin)) / 120))) : 90;

    return {
      workHours: Math.round(workMin / 60),
      sportHours: Math.round(sportMin / 60),
      restHours: Math.round(restMin / 60),
      otherHours: Math.round(otherMin / 60),
      totalHours,
      rhythmScore,
    };
  }, [blocks]);

  // Obtenir la configuration visuelle d'un bloc selon son type (Identique aux GlowCards de la liste)
  const getBlockStyleConfig = (type: PlanningBlockType) => {
    switch (type) {
      case 'WORK':
        return {
          bg: isDark ? 'rgba(208, 188, 255, 0.20)' : 'rgba(107, 70, 193, 0.15)',
          border: palette.primary.default, // #D0BCFF ou #6B46C1
          text: isDark ? '#E9DDFF' : '#4A3780',
          accent: palette.primary.default,
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'briefcase',
          isWork: true,
          isDashed: false,
        };
      case 'STUDY':
        return {
          bg: isDark ? 'rgba(123, 208, 255, 0.18)' : 'rgba(14, 116, 144, 0.12)',
          border: palette.tertiary.default, // #7BD0FF ou #0E7490
          text: isDark ? '#C3E7FF' : '#004C6D',
          accent: palette.tertiary.default,
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'book',
          isWork: false,
          isDashed: false,
        };
      case 'REST':
        return {
          bg: isDark ? 'rgba(76, 175, 80, 0.20)' : 'rgba(76, 175, 80, 0.14)',
          border: '#4CAF50',
          text: isDark ? '#A5D6A7' : '#1B5E20',
          accent: '#4CAF50',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'cafe',
          isWork: false,
          isDashed: false,
        };
      case 'SPORT':
        return {
          bg: isDark ? 'rgba(255, 152, 0, 0.20)' : 'rgba(255, 152, 0, 0.14)',
          border: '#FF9800',
          text: isDark ? '#FFCC80' : '#E65100',
          accent: '#FF9800',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'fitness',
          isWork: false,
          isDashed: false,
        };
      case 'HOUSE':
        return {
          bg: isDark ? 'rgba(156, 39, 176, 0.20)' : 'rgba(156, 39, 176, 0.14)',
          border: '#9C27B0',
          text: isDark ? '#CE93D8' : '#4A148C',
          accent: '#9C27B0',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'home',
          isWork: false,
          isDashed: false,
        };
      case 'FREE':
        return {
          bg: isDark ? 'rgba(0, 188, 212, 0.18)' : 'rgba(0, 188, 212, 0.12)',
          border: '#00BCD4',
          text: isDark ? '#80DEEA' : '#006064',
          accent: '#00BCD4',
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'sparkles',
          isWork: false,
          isDashed: false,
        };
      case 'OTHER':
      default:
        return {
          bg: isDark ? 'rgba(148, 143, 154, 0.15)' : 'rgba(148, 143, 154, 0.10)',
          border: palette.onSurface.variant,
          text: isDark ? '#CAC4D0' : '#57534E',
          accent: palette.onSurface.variant,
          badgeBg: isDark ? 'rgba(15, 14, 17, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          icon: 'ellipsis-horizontal',
          isWork: false,
          isDashed: true,
        };
    }
  };

  const gridContentWidth = TIME_COL_WIDTH + displayedDays.length * DAY_COL_WIDTH;

  return (
    <View style={styles.wrapper}>
      {/* ─── 1. En-tête de vue Stitch : Matrice Temporelle 7J + Score Rythme ─── */}
      <View style={styles.topHeader}>
        <View style={styles.subHeaderRow}>
          <View style={styles.matrixBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.matrixBadgeText}>MATRICE TEMPORELLE 7J</Text>
          </View>

          <View style={styles.scoreBadge}>
            <Ionicons name="sparkles" size={12} color={palette.primary.default} />
            <Text style={styles.scoreBadgeText}>Score Rythme : {stats.rhythmScore}%</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.mainTitle}>Vue Grille Calendrier</Text>
          <View style={styles.weekPill}>
            <Ionicons name="calendar-outline" size={13} color={palette.tertiary.default} />
            <Text style={styles.weekPillText}>Semaine Type</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Vision panoramique de vos blocs récurrents et zones tampons réparties du lundi au dimanche.
        </Text>

        {/* Sélecteur de segments Stitch : Semaine Idéale / Semaine Pro / Week-end */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activePreset === 'ideal' && styles.segmentBtnActive]}
            onPress={() => setActivePreset('ideal')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activePreset === 'ideal' && styles.segmentTextActive]}>
              Semaine Idéale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activePreset === 'pro' && styles.segmentBtnActive]}
            onPress={() => setActivePreset('pro')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activePreset === 'pro' && styles.segmentTextActive]}>
              Semaine Pro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activePreset === 'weekend' && styles.segmentBtnActive]}
            onPress={() => setActivePreset('weekend')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activePreset === 'weekend' && styles.segmentTextActive]}>
              Week-end
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 2. En-tête de section de la Grille ─────────────────────────────────── */}
      <View style={styles.gridSectionHeader}>
        <View style={styles.gridTitleWithIcon}>
          <Ionicons name="time" size={18} color={palette.primary.default} />
          <Text style={styles.gridSectionTitle}>Grille Hebdomadaire (7h00 - 22h00)</Text>
        </View>
        <View style={styles.swipeHint}>
          <Ionicons name="swap-horizontal" size={14} color={palette.tertiary.default} />
          <Text style={styles.swipeHintText}>Glisser horizontalement</Text>
        </View>
      </View>

      {/* ─── 3. Conteneur principal de la Grille Matricielle ────────────────────── */}
      <View style={styles.gridCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ minWidth: gridContentWidth }}
        >
          <View style={{ width: gridContentWidth }}>
            {/* Ligne d'en-tête collante des jours */}
            <View style={styles.dayHeaderRow}>
              {/* Coin haut-gauche icône horloge */}
              <View style={[styles.cornerCell, { width: TIME_COL_WIDTH }]}>
                <Ionicons name="time-outline" size={16} color={palette.onSurface.variant} />
              </View>

              {/* Colonnes des jours */}
              {displayedDays.map(d => {
                const isFirstDay = d.num === 1;
                return (
                  <View
                    key={d.num}
                    style={[
                      styles.dayHeaderCell,
                      { width: DAY_COL_WIDTH },
                      isFirstDay && styles.dayHeaderCellActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayHeaderName,
                        isFirstDay && { color: palette.primary.default, fontWeight: '800' },
                      ]}
                    >
                      {d.label}
                    </Text>
                    <Text
                      style={[
                        styles.dayHeaderDate,
                        isFirstDay && { color: palette.primary.default },
                      ]}
                    >
                      {d.dateNum}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Corps de la Grille : Colonne Heures + Colonnes Journées */}
            <View style={styles.gridBody}>
              {/* Colonne latérale gauche : Marqueurs 07:00 à 22:00 */}
              <View style={[styles.timeGutter, { width: TIME_COL_WIDTH }]}>
                {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                  const hour = START_HOUR + i;
                  const isHighlight = hour === 9 || hour === 14 || hour === 17;
                  return (
                    <View key={hour} style={[styles.timeCell, { height: HOUR_HEIGHT }]}>
                      <Text
                        style={[
                          styles.timeLabel,
                          isHighlight && { color: palette.primary.default, fontWeight: '700' },
                        ]}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Zone des colonnes de jours avec les lignes horizontales de fond */}
              <View style={[styles.daysContainer, { width: displayedDays.length * DAY_COL_WIDTH }]}>
                {/* Lignes de repère horizontales (une par tranche horaire) */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.hourHorizontalLine,
                        { height: HOUR_HEIGHT },
                        (i === 2 || i === 3) && { backgroundColor: isDark ? 'rgba(208,188,255,0.03)' : 'rgba(107,70,193,0.02)' },
                      ]}
                    />
                  ))}
                </View>

                {/* Colonnes par jour */}
                <View style={styles.columnsRow}>
                  {displayedDays.map(d => {
                    const dayBlocks = blocks.filter(b => b.dayOfWeek === d.num);

                    return (
                      <View
                        key={d.num}
                        style={[
                          styles.dayColumn,
                          { width: DAY_COL_WIDTH, height: TOTAL_HOURS * HOUR_HEIGHT },
                        ]}
                      >
                        {/* Clic rapide sur la colonne pour ajouter un bloc */}
                        <TouchableOpacity
                          style={StyleSheet.absoluteFill}
                          activeOpacity={0.9}
                          onPress={() => onAddBlock(d.num, '09:00')}
                          accessibilityLabel={`Ajouter un bloc pour ${d.full}`}
                        />

                        {/* Blocs positionnés proportionnellement à leur durée exacte */}
                        {dayBlocks.map(block => {
                          const startMin = timeToMinutes(block.startTime);
                          const endMin = timeToMinutes(block.endTime);
                          const durationMin = Math.max(15, endMin - startMin);

                          // Calcul exact de la position et de la hauteur en pixels
                          const topPx = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                          const heightPx = (durationMin / 60) * HOUR_HEIGHT;
                          const clampedTop = Math.max(0, topPx);
                          const clampedHeight = Math.max(26, heightPx - 3);

                          const config = getBlockStyleConfig(block.type);

                          return (
                            <TouchableOpacity
                              key={block.id}
                              style={[
                                styles.blockCard,
                                {
                                  top: clampedTop + 1,
                                  height: clampedHeight,
                                  backgroundColor: config.bg,
                                  borderColor: config.border,
                                  borderStyle: config.isDashed ? 'dashed' : 'solid',
                                  borderWidth: config.isDashed ? 1.5 : 1,
                                },
                              ]}
                              activeOpacity={0.85}
                              onPress={() => onSelectBlock ? onSelectBlock(block) : onAddBlock(d.num)}
                              onLongPress={() => onDeleteBlock(block.id, block.label)}
                              accessibilityRole="button"
                              accessibilityLabel={`${block.label}, de ${block.startTime} à ${block.endTime}. Maintenir pour supprimer.`}
                            >
                              {/* Lueur de coin GlowCard */}
                              <LinearGradient
                                colors={[config.accent + '44', 'transparent']}
                                start={{ x: 1, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.cardCornerGlow}
                                pointerEvents="none"
                              />

                              {/* Reflet supérieur spéculaire (1px blanc) */}
                              {isDark && (
                                <View
                                  style={styles.topSpecularHighlight}
                                  pointerEvents="none"
                                />
                              )}

                              {/* Header du bloc : icône / point d'accentuation + titre */}
                              <View style={styles.blockCardHeader}>
                                {config.isWork ? (
                                  <View style={[styles.workPulseDot, { backgroundColor: config.accent }]} />
                                ) : (
                                  <Ionicons
                                    name={config.icon as any}
                                    size={10}
                                    color={config.accent}
                                    style={{ marginRight: 2 }}
                                  />
                                )}
                                <Text
                                  style={[styles.blockTitle, { color: config.text }]}
                                  numberOfLines={clampedHeight > 55 ? 2 : 1}
                                >
                                  {block.label}
                                </Text>
                              </View>

                              {/* Heures affichées en badge si la hauteur le permet */}
                              {clampedHeight >= 36 && (
                                <View style={[styles.timeBadge, { backgroundColor: config.badgeBg }]}>
                                  <Text style={[styles.timeBadgeText, { color: config.accent }]}>
                                    {block.startTime.replace(':00', 'h')} - {block.endTime.replace(':00', 'h')}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ─── 4. Légende des Couleurs de Blocs (Stitch) ─────────────────────────── */}
      <View style={styles.legendCard}>
        <View style={styles.legendHeaderRow}>
          <Text style={styles.legendHeaderTitle}>LÉGENDE DES COULEURS DE BLOCS</Text>
          <Text style={styles.legendHeaderSub}>{stats.totalHours}h prévues</Text>
        </View>

        <View style={styles.legendGrid}>
          {/* Deep Focus / Travail */}
          <View style={styles.legendPill}>
            <View style={[styles.legendColorBox, { backgroundColor: palette.primary.default }]} />
            <View style={styles.legendPillTextCol}>
              <Text style={styles.legendPillLabel}>Travail & Études</Text>
              <Text style={styles.legendPillMeta}>{stats.workHours}h • Violet</Text>
            </View>
          </View>

          {/* Sport & Activité */}
          <View style={styles.legendPill}>
            <View style={[styles.legendColorBox, { backgroundColor: '#FF9800' }]} />
            <View style={styles.legendPillTextCol}>
              <Text style={styles.legendPillLabel}>Sport & Vitalité</Text>
              <Text style={styles.legendPillMeta}>{stats.sportHours}h • Orange</Text>
            </View>
          </View>

          {/* Repos & Loisirs */}
          <View style={styles.legendPill}>
            <View style={[styles.legendColorBox, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.legendPillTextCol}>
              <Text style={styles.legendPillLabel}>Repos & Temps Libre</Text>
              <Text style={styles.legendPillMeta}>{stats.restHours}h • Vert</Text>
            </View>
          </View>

          {/* Maison & Autre */}
          <View style={styles.legendPill}>
            <View style={[styles.legendColorBox, { backgroundColor: '#9C27B0' }]} />
            <View style={styles.legendPillTextCol}>
              <Text style={styles.legendPillLabel}>Maison & Autre</Text>
              <Text style={styles.legendPillMeta}>{stats.otherHours}h • Pourpre</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 5. Carte Recommandation IA Junix Pulse ────────────────────────────── */}
      <View style={styles.aiInsightCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiTitleGroup}>
            <View style={styles.aiIconCircle}>
              <Ionicons name="sparkles" size={15} color={palette.surface.base} />
            </View>
            <Text style={styles.aiTitle}>Junix Pulse IA</Text>
          </View>

          <View style={styles.aiStatusBadge}>
            <Text style={styles.aiStatusText}>Zone Tampon Active</Text>
          </View>
        </View>

        <Text style={styles.aiDescription}>
          Les blocs sont proportionnés à leur durée réelle. Les créneaux de respiration et de repos permettent de stabiliser votre niveau de focus sans surchauffe cognitive.
        </Text>
      </View>

      {/* ─── 6. Bouton CTA Principal GlowCard ──────────────────────────────────── */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.heroGlowBtn}
          onPress={() => onAddBlock(1, '09:00')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un créneau dans la grille"
        >
          <LinearGradient
            colors={palette.gradient.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGlowGradient}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.heroGlowText}>Ajouter un créneau dans la grille</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── STYLES DU COMPOSANT STITCH ───────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  topHeader: {
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matrixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CD0FF',
    ...Platform.select({
      ios: {
        shadowColor: '#7CD0FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 5,
      },
      android: { elevation: 3 },
    }),
  },
  matrixBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7CD0FF',
    letterSpacing: 0.8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CAC4D0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  mainTitle: {
    ...Typography.titleLarge,
    fontSize: 22,
    fontWeight: '700',
    color: '#E6E1E7',
    letterSpacing: -0.3,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weekPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CAC4D0',
  },
  subtitle: {
    fontSize: 13,
    color: '#948F9A',
    lineHeight: 18,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 14, 17, 0.8)',
    padding: 3,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: '#D0BCFF',
    ...Platform.select({
      ios: {
        shadowColor: '#D0BCFF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CAC4D0',
  },
  segmentTextActive: {
    color: '#210F48',
    fontWeight: '700',
  },
  gridSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  gridTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E6E1E7',
    letterSpacing: 0.3,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#7CD0FF',
    fontWeight: '500',
  },
  gridCard: {
    borderRadius: Radius.lg,
    backgroundColor: '#1C1B1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  dayHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#2B292D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  cornerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
  },
  dayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayHeaderCellActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
  },
  dayHeaderName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CAC4D0',
    letterSpacing: 0.5,
  },
  dayHeaderDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E6E1E7',
    marginTop: 1,
  },
  gridBody: {
    flexDirection: 'row',
  },
  timeGutter: {
    backgroundColor: '#0F0E11',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  timeCell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#948F9A',
    fontVariant: ['tabular-nums'] as any,
  },
  daysContainer: {
    position: 'relative',
  },
  hourHorizontalLine: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  columnsRow: {
    flexDirection: 'row',
  },
  dayColumn: {
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  blockCard: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: Radius.sm + 2,
    padding: 3,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  cardCornerGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
  },
  topSpecularHighlight: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  blockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  workPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D0BCFF',
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
    lineHeight: 12,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  timeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  legendCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: '#1C1B1F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E6E1E7',
    letterSpacing: 0.5,
  },
  legendHeaderSub: {
    fontSize: 11,
    color: '#948F9A',
    fontWeight: '600',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendPill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#211F23',
    padding: 8,
    borderRadius: Radius.md,
  },
  legendColorBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendPillTextCol: {
    flex: 1,
  },
  legendPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E6E1E7',
  },
  legendPillMeta: {
    fontSize: 9,
    color: '#948F9A',
    marginTop: 1,
  },
  aiInsightCard: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: '#211F23',
    borderWidth: 1,
    borderColor: 'rgba(123, 208, 255, 0.2)',
    padding: Spacing.md,
    gap: 6,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#D0BCFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D0BCFF',
  },
  aiStatusBadge: {
    backgroundColor: 'rgba(15, 14, 17, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  aiStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7CD0FF',
  },
  aiDescription: {
    fontSize: 12,
    color: '#CAC4D0',
    lineHeight: 16,
  },
  actionsSection: {
    marginTop: Spacing.md,
  },
  heroGlowBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#D0BCFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  heroGlowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  heroGlowText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
