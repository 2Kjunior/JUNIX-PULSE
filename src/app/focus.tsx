/**
 * Écran Focus Timer / Minuteur Pomodoro (src/app/focus.tsx).
 * 
 * Fonctionnalités :
 * - Cadran circulaire SVG avec progression en temps réel.
 * - Deux modes exclusifs de sélection : Raccourcis (presets) OU Ajustement libre (custom).
 * - Gestion du décompte d'horloge local avec états idle / running / paused / completed.
 * - Liaison optionnelle avec une tâche pour le suivi du travail accompli.
 * - Respect de la charte graphique Midnight Glow, contrastes AA et zéro emoji.
 */

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import {
  FocusSession,
  FocusPreset,
  FOCUS_PRESETS,
  createFocusSession,
  applyPreset,
  applyCustomAdjustment,
  startFocusSession,
  pauseFocusSession,
  resetFocusSession,
  syncFocusSessionWithClock,
  formatRemainingTime,
  calculateFocusProgress,
} from '@/domain/rules/focus-rules';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/Button';
import { Radius, Spacing, Typography, TitleFontFamily } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { NotificationService } from '@/services/notification-service';
import { emitMascotEvent } from '@/services/mascot/mascot-event-bus';
import { setMascotFocusState } from '@/services/mascot/mascot-runtime';
import { addFocusMinutes } from '@/services/focus-stats-service';
import { PulseMascot } from '@/features/mascot/PulseMascot';
import { useT } from '@/i18n';

const CIRCLE_SIZE = 260;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useTheme();
  const styles = useThemedStyles(makeFocusStyles);
  const { showSnackbar } = useAppStore();

  const params = useLocalSearchParams<{ taskId?: string; taskTitle?: string }>();

  const [session, setSession] = useState<FocusSession>(() =>
    createFocusSession({
      durationMinutes: 25,
      taskId: params.taskId,
      taskTitle: params.taskTitle,
    })
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endsAtRef = useRef(0);

  // ─── Horloge du minuteur ───────────────────────────────────────────────────
  useEffect(() => {
    if (session.state === 'running') {
      // La fin est programmée dès le départ : elle sonne même si l'application passe en arrière-plan
      endsAtRef.current = Date.now() + session.remainingSeconds * 1000;
      NotificationService.scheduleFocusEnd(
        new Date(endsAtRef.current),
        session.taskTitle
          ? t('focus.endNotifTask', { title: session.taskTitle })
          : t('focus.endNotif')
      );
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          const next = syncFocusSessionWithClock(prev, endsAtRef.current);
          if (next.state === 'completed' && prev.state === 'running') {
            // Kept for the day, even if the app is closed afterwards
            void addFocusMinutes(prev.durationMinutes).catch(() => {});
            emitMascotEvent({ type: 'FOCUS_COMPLETED', durationMinutes: prev.durationMinutes });
            showSnackbar(t('focus.done'));
          }
          return next;
        });
      }, 1000);
    } else {
      if (session.state !== 'completed') NotificationService.cancelFocusEnd();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the timer follows the session state; the remaining seconds it reads change every second
  }, [session.state, showSnackbar]);

  // La mascotte se tait pendant une session : elle doit savoir qu'elle est en cours
  useEffect(() => {
    setMascotFocusState(session.state);
  }, [session.state]);

  useEffect(
    () => () => {
      setMascotFocusState('idle');
      // Quitter l'écran met fin à la session : sa notification de fin n'a plus lieu d'être
      NotificationService.cancelFocusEnd();
    },
    []
  );

  // ─── Gestionnaires d'actions ───────────────────────────────────────────────
  const handleTogglePlayPause = () => {
    if (session.state === 'running') {
      setSession((prev) => pauseFocusSession(prev));
    } else {
      setSession((prev) => startFocusSession(prev));
    }
  };

  const handleReset = () => {
    setSession((prev) => resetFocusSession(prev));
  };

  const handleSelectPreset = (preset: FocusPreset) => {
    if (session.state === 'running') return;
    setSession((prev) => applyPreset(prev, preset));
  };

  const handleAdjustCustom = (deltaMinutes: number) => {
    if (session.state === 'running') return;
    setSession((prev) => applyCustomAdjustment(prev, deltaMinutes));
  };

  // Progression SVG
  const progress = calculateFocusProgress(session.remainingSeconds, session.durationMinutes);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const isRunning = session.state === 'running';
  const isCompleted = session.state === 'completed';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.md }]}>
      {/* ─── En-tête ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('pulse.focusTitle')}</Text>

        <TouchableOpacity
          style={styles.headerRightButton}
          onPress={handleReset}
          disabled={session.state === 'idle'}
          accessibilityRole="button"
          accessibilityLabel={t('focus.resetA11y')}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={session.state === 'idle' ? palette.onSurface.inactive : palette.primary.default}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── Tâche liée (optionnelle) ──────────────────────────────────────── */}
        {session.taskTitle ? (
          <View style={styles.taskBadge}>
            <Ionicons name="checkmark-circle-outline" size={16} color={palette.tertiary.default} />
            <Text style={styles.taskBadgeText} numberOfLines={1}>
              {session.taskTitle}
            </Text>
          </View>
        ) : null}

        {/* ─── Pulse se concentre avec vous pendant la session, se réjouit à la fin ─── */}
        <View style={styles.mascot} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <PulseMascot
            mood={isCompleted ? 'happy' : session.state === 'running' || session.state === 'paused' ? 'focused' : 'calm'}
            size={48}
          />
        </View>

        {/* ─── Cadran Circulaire ────────────────────────────────────────────── */}
        <View style={styles.timerCircleContainer}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svgCircle}>
            {/* Piste d'arrière-plan */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            {/* Anneau de progression */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={isCompleted ? palette.success.default : palette.primary.default}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>

          <View style={styles.timerCenterContent}>
            <Text style={styles.timeText}>
              {formatRemainingTime(session.remainingSeconds)}
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {isCompleted
                  ? t('focus.status.done')
                  : isRunning
                  ? t('focus.status.running')
                  : session.state === 'paused'
                  ? t('habitDetail.statusPaused')
                  : t('focus.status.ready')}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Contrôles de Durée (Exclusion Mutuelle) ──────────────────────── */}
        <View style={styles.modesSection}>
          <Text style={styles.sectionSubtitle}>
            {session.selectionMode === 'preset'
              ? t('focus.modePreset')
              : t('focus.modeCustom')}
          </Text>

          {/* 1. Raccourcis Rapides (Presets) */}
          <View style={styles.presetRow}>
            {FOCUS_PRESETS.map((minutes) => {
              const isSelected =
                session.selectionMode === 'preset' && session.durationMinutes === minutes;
              return (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.presetButton,
                    isSelected && styles.presetButtonActive,
                    isRunning && styles.buttonDisabled,
                  ]}
                  onPress={() => handleSelectPreset(minutes)}
                  disabled={isRunning}
                  accessibilityRole="button"
                  accessibilityLabel={t('focus.presetA11y', { minutes })}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      isSelected && styles.presetButtonTextActive,
                    ]}
                  >
                    {t('tasks.minutes', { minutes })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Ajustement Libre (Désélectionne les presets au clic) */}
          <View style={styles.customAdjustmentCard}>
            <Text style={styles.customLabel}>{t('focus.fineTune')}</Text>
            <View style={styles.customButtonsRow}>
              <TouchableOpacity
                style={[styles.adjustBtn, isRunning && styles.buttonDisabled]}
                onPress={() => handleAdjustCustom(-5)}
                disabled={isRunning}
                accessibilityRole="button"
                accessibilityLabel={t('focus.minus5')}
              >
                <Text style={styles.adjustBtnText}>-5m</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.adjustBtn, isRunning && styles.buttonDisabled]}
                onPress={() => handleAdjustCustom(-1)}
                disabled={isRunning}
                accessibilityRole="button"
                accessibilityLabel={t('focus.minus1')}
              >
                <Text style={styles.adjustBtnText}>-1m</Text>
              </TouchableOpacity>

              <View style={styles.customDurationValue}>
                <Text style={styles.customDurationText}>{t('tasks.minutes', { minutes: session.durationMinutes })}</Text>
              </View>

              <TouchableOpacity
                style={[styles.adjustBtn, isRunning && styles.buttonDisabled]}
                onPress={() => handleAdjustCustom(1)}
                disabled={isRunning}
                accessibilityRole="button"
                accessibilityLabel={t('focus.plus1')}
              >
                <Text style={styles.adjustBtnText}>+1m</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.adjustBtn, isRunning && styles.buttonDisabled]}
                onPress={() => handleAdjustCustom(5)}
                disabled={isRunning}
                accessibilityRole="button"
                accessibilityLabel={t('focus.plus5')}
              >
                <Text style={styles.adjustBtnText}>+5m</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── Boutons d'Action ──────────────────────────────────────────────── */}
        <View style={styles.actionButtonsContainer}>
          <Button
            label={
              isCompleted
                ? t('focus.newSession')
                : isRunning
                ? t('focus.pause')
                : session.state === 'paused'
                ? t('habits.resume')
                : t('focus.start')
            }
            onPress={handleTogglePlayPause}
            icon={
              isCompleted ? (
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
              ) : isRunning ? (
                <Ionicons name="pause" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="play" size={20} color="#FFFFFF" />
              )
            }
            variant="primary"
            style={styles.mainActionButton}
          />

          {(isRunning || session.state === 'paused') && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleReset}
              accessibilityRole="button"
              accessibilityLabel={t('focus.stopA11y')}
            >
              <Text style={styles.stopButtonText}>{t('focus.stop')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles thématiques ───────────────────────────────────────────────────────
function makeFocusStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.surface.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface.container,
    },
    headerTitle: {
      fontSize: Typography.headlineMedium.fontSize,
      fontWeight: Typography.headlineMedium.fontWeight,
      color: palette.onSurface.primary,
      fontFamily: TitleFontFamily?.bold,
    },
    headerRightButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface.container,
    },
    scrollContent: {
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    taskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      backgroundColor: palette.surface.container,
      borderColor: palette.outline.variant,
      borderWidth: 1,
      marginVertical: Spacing.sm,
      maxWidth: '90%',
    },
    taskBadgeText: {
      fontSize: Typography.labelLarge.fontSize,
      color: palette.onSurface.primary,
      fontWeight: Typography.labelLarge.fontWeight,
    },
    mascot: {
      alignItems: 'center',
      marginTop: Spacing.md,
      marginBottom: -Spacing.md,
    },
    timerCircleContainer: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: Spacing.xl,
    },
    svgCircle: {
      position: 'absolute',
    },
    timerCenterContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeText: {
      fontSize: 52,
      fontWeight: '700',
      color: palette.onSurface.primary,
      fontFamily: TitleFontFamily?.bold,
      letterSpacing: -1,
    },
    statusPill: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 4,
      borderRadius: Radius.full,
      backgroundColor: palette.surface.container,
      marginTop: Spacing.xs,
    },
    statusPillText: {
      fontSize: Typography.labelSmall.fontSize,
      fontWeight: Typography.labelSmall.fontWeight,
      color: palette.primary.default,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    modesSection: {
      width: '100%',
      backgroundColor: palette.surface.container,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderColor: palette.outline.variant,
      borderWidth: 1,
    },
    sectionSubtitle: {
      fontSize: Typography.labelSmall.fontSize,
      fontWeight: Typography.labelSmall.fontWeight,
      color: palette.onSurface.variant,
      marginBottom: Spacing.sm,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    presetRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    presetButton: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: palette.surface.base,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: palette.outline.variant,
      borderWidth: 1,
    },
    presetButtonActive: {
      backgroundColor: palette.primary.default,
      borderColor: palette.primary.default,
    },
    presetButtonText: {
      fontSize: Typography.labelMedium.fontSize,
      fontWeight: Typography.labelMedium.fontWeight,
      color: palette.onSurface.variant,
    },
    presetButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    customAdjustmentCard: {
      alignItems: 'center',
      paddingTop: Spacing.xs,
    },
    customLabel: {
      fontSize: Typography.labelSmall.fontSize,
      color: palette.onSurface.variant,
      marginBottom: Spacing.xs,
    },
    customButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    adjustBtn: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.sm,
      backgroundColor: palette.surface.base,
      borderColor: palette.outline.variant,
      borderWidth: 1,
    },
    adjustBtnText: {
      fontSize: Typography.labelSmall.fontSize,
      fontWeight: Typography.labelSmall.fontWeight,
      color: palette.onSurface.primary,
    },
    customDurationValue: {
      paddingHorizontal: Spacing.sm,
    },
    customDurationText: {
      fontSize: Typography.titleMedium.fontSize,
      fontWeight: '700',
      color: palette.primary.default,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    actionButtonsContainer: {
      width: '100%',
      alignItems: 'center',
      gap: Spacing.md,
    },
    mainActionButton: {
      width: '100%',
    },
    stopButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    stopButtonText: {
      fontSize: Typography.labelLarge.fontSize,
      fontWeight: Typography.labelLarge.fontWeight,
      color: palette.error.default,
    },
  });
}
