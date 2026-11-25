/**
 * The sounds of Junix in the settings (study 001, 16.7; sheet 031): the sound of each level,
 * Discrète · Normale · Alarme (the switch of the tones of moments sits under it). Choosing a sound
 * plays it at once; the ▶ button plays the one chosen again.
 */
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChoiceChips, FieldLabel, type Choice } from '@/components/create/form/FormBricks';
import { Spacing } from '@/constants/theme';
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';
import { SOUNDS, SOUND_CHOICES, type SoundChoice, type SoundPrefs } from '@/domain/rules/sound-rules';
import { useTheme } from '@/hooks/use-theme';
import { useT, type MessageKey } from '@/i18n';

const LEVELS: readonly NotificationLevel[] = ['discreet', 'normal', 'alarm'];
const LEVEL_LABELS: Readonly<Record<NotificationLevel, MessageKey>> = {
  discreet: 'soundSettings.discreet',
  normal: 'soundSettings.normal',
  alarm: 'soundSettings.alarm',
};

export function SoundSetting({
  value,
  onChange,
  onPreview,
}: {
  value: SoundPrefs;
  onChange: (prefs: SoundPrefs) => void;
  onPreview: (sound: SoundChoice) => void;
}) {
  const t = useT();
  const { palette } = useTheme();
  const nameOf = (sound: SoundChoice) => t(sound === 'none' ? 'sound.none' : SOUNDS[sound].labelKey);

  return (
    <View style={{ gap: Spacing.sm }}>
      {LEVELS.map(level => {
        const options: Choice<SoundChoice>[] = SOUND_CHOICES[level].map(sound => ({ value: sound, label: nameOf(sound) }));
        return (
          <View key={level}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <FieldLabel label={t(LEVEL_LABELS[level])} />
              {value[level] !== 'none' && (
                <TouchableOpacity
                  onPress={() => onPreview(value[level])}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('soundSettings.play', { sound: nameOf(value[level]) })}
                  testID={`sound-play-${level}`}
                >
                  <Ionicons name="play-circle-outline" size={26} color={palette.primary.default} />
                </TouchableOpacity>
              )}
            </View>
            <ChoiceChips
              options={options}
              value={value[level]}
              onChange={sound => {
                onChange({ ...value, [level]: sound });
                if (sound !== 'none') onPreview(sound);
              }}
              accent={palette.primary.default}
              testIDPrefix={`sound-${level}`}
            />
          </View>
        );
      })}
    </View>
  );
}
