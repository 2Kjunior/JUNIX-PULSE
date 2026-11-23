/**
 * "Progrès" (study 001, 15.2; sheet 018): the habits of the week and the goals, in one place,
 * reached from the home card. It shows the two existing lists, without copying them.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GoalsListScreen from '@/app/goals/index';
import HabitsListScreen from '@/app/habits/index';
import { SettingsButton } from '@/components/ui/HeaderIconButton';
import { PillTopBar } from '@/components/ui/PillTopBar';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type ProgressFilter = 'habits' | 'goals';

export default function ProgressScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<ProgressFilter>(params.filter === 'goals' ? 'goals' : 'habits');

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface.base, paddingTop: insets.top }} testID="progress-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...Typography.headlineMedium, color: palette.onSurface.primary }} numberOfLines={1}>
            {t('progress.title')}
          </Text>
          <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }} numberOfLines={2}>
            {t('progress.subtitle')}
          </Text>
        </View>
        <SettingsButton />
      </View>
      <PillTopBar<ProgressFilter>
        tabs={[
          { key: 'habits', label: t('progress.habits') },
          { key: 'goals', label: t('progress.goals') },
        ]}
        activeTab={filter}
        onTabChange={setFilter}
      />
      <View style={{ flex: 1 }}>{filter === 'habits' ? <HabitsListScreen embedded /> : <GoalsListScreen embedded />}</View>
    </View>
  );
}
