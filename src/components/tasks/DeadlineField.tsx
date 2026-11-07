/**
 * "À rendre le…" in the task forms, inside the planning card: the deadline as a chip that opens
 * a date picker, with a cross to take it off. Apart from the day the task is planned for.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT } from '@/i18n';
import { makeFormStyles } from '@/styles/common/form-styles';

import { DeadlineBadge } from './DeadlineBadge';

interface DeadlineFieldProps {
  value?: string;
  onChange: (dueDate: string | undefined) => void;
}

export function DeadlineField({ value, onChange }: DeadlineFieldProps) {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const [picking, setPicking] = useState(false);

  return (
    // Set apart from the planned day above it: two different dates
    <View style={{ gap: 6, marginTop: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={formStyles.chipText}>{t('deadline.label')}</Text>
        <DeadlineBadge dueDate={value} />
      </View>
      <View style={formStyles.chipsRow}>
        <TouchableOpacity
          style={[formStyles.chip, !!value && formStyles.chipActive]}
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={value ? t('deadline.change') : t('deadline.add')}
          testID="deadline-field"
        >
          <Ionicons name="hourglass-outline" size={14} color={value ? palette.primary.default : palette.onSurface.variant} />
          <Text style={[formStyles.chipText, !!value && formStyles.chipTextActive]}>
            {value ? format(new Date(`${value}T12:00:00`), t('form.dateFormat'), { locale: dateLocale }) : t('deadline.add')}
          </Text>
        </TouchableOpacity>
        {!!value && (
          <TouchableOpacity
            style={formStyles.chip}
            onPress={() => onChange(undefined)}
            accessibilityRole="button"
            accessibilityLabel={t('deadline.remove')}
            testID="deadline-remove"
          >
            <Ionicons name="close" size={14} color={palette.onSurface.variant} />
          </TouchableOpacity>
        )}
      </View>

      <DateTimePickerModal
        isVisible={picking}
        mode="date"
        date={value ? new Date(`${value}T12:00:00`) : new Date()}
        minimumDate={new Date()}
        onConfirm={date => {
          setPicking(false);
          onChange(format(date, 'yyyy-MM-dd'));
        }}
        onCancel={() => setPicking(false)}
        confirmTextIOS={t('personNew.confirm')}
        cancelTextIOS={t('form.cancel')}
        locale={language === 'fr' ? 'fr_FR' : 'en_US'}
      />
    </View>
  );
}
