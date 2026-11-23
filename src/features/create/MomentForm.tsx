/**
 * The "Moment" form (study 001, 12.2 "2-B"; sheet 012), in amber: What → Start and end → Where →
 * Leave … min before (only once a place is written) → With whom → More options, in the order of
 * the registry (constants/item-forms).
 */

import { Ionicons } from '@expo/vector-icons';
import { addHours, format } from 'date-fns';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  ChoiceChips,
  DictatedInput,
  FieldLabel,
  FormSection,
  FormShell,
  MoreOptions,
  type Choice,
} from '@/components/create/form/FormBricks';
import { PersonField } from '@/components/people/PersonField';
import { TagField } from '@/components/tags/TagField';
import {
  dayParam,
  hourParam,
  LEAVE_OPTIONS,
  visibleMoreFields,
  visibleSections,
  type FormSectionId,
  type MoreFieldId,
} from '@/constants/item-forms';
import { itemFamilyColor } from '@/constants/item-kinds';
import { Spacing } from '@/constants/theme';
import type { EventType } from '@/domain/entities';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';
import { EventUseCases } from '@/use-cases/event-use-cases';

export interface MomentFormProps {
  defaultDate?: string;
  defaultHour?: string;
  /** Opened from the page of a person: they already take part. */
  personId?: string;
}

/** The first hour of a new moment: the hour asked for, or the next full hour. */
function initialStart(defaultDate?: string, defaultHour?: string): Date {
  const now = new Date();
  const day = dayParam(defaultDate);
  const start = day ? new Date(`${day}T12:00:00`) : new Date(now);
  start.setHours(hourParam(defaultHour) ?? now.getHours() + 1, 0, 0, 0);
  return start;
}

export function MomentForm({ defaultDate, defaultHour, personId }: MomentFormProps) {
  const t = useT();
  const language = useLanguage();
  const dateLocale = useDateLocale();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const { showSnackbar, userTimezone } = useAppStore();
  const accent = itemFamilyColor(palette, 'moment');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [startAt, setStartAt] = useState(() => initialStart(defaultDate, defaultHour));
  const [endAt, setEndAt] = useState(() => addHours(initialStart(defaultDate, defaultHour), 1));
  const [location, setLocation] = useState('');
  const [travelBufferMinutes, setTravelBufferMinutes] = useState(0);
  const [eventType, setEventType] = useState<EventType>('BUSY');
  const [personIds, setPersonIds] = useState<string[]>(() => (personId ? [personId] : []));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);

  const place = location.trim();

  async function handleSave() {
    if (!title.trim()) {
      setTitleError(t('eventNew.titleRequired'));
      return;
    }
    if (endAt <= startAt) {
      showSnackbar(t('eventNew.endAfterStart'));
      return;
    }
    setSaving(true);
    try {
      await EventUseCases.createEvent({
        title: title.trim(),
        notes: notes.trim() || undefined,
        startAt,
        endAt,
        timezone: userTimezone,
        location: place || undefined,
        type: eventType,
        // Leaving only means something with a place
        travelBufferMinutes: place ? travelBufferMinutes : 0,
        personIds,
        tagIds,
      });
      showSnackbar(t('eventNew.created'));
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t('taskNew.createError'));
    } finally {
      setSaving(false);
    }
  }

  // The hour first, as on the old form, then the day
  const whenLabel = (value: Date) =>
    `${format(value, 'HH:mm')} · ${format(value, t('eventNew.shortDate'), { locale: dateLocale })}`;

  const slotRow = (which: 'start' | 'end', value: Date) => (
    <TouchableOpacity
      onPress={() => setPicker(which)}
      accessibilityRole="button"
      accessibilityLabel={`${t(which === 'start' ? 'eventNew.start' : 'eventNew.end')} ${whenLabel(value)}`}
      testID={`moment-${which}`}
      style={[formStyles.selectorRow, { minHeight: 44 }]}
    >
      <View style={formStyles.selectorLeft}>
        <Ionicons name={which === 'start' ? 'play-outline' : 'stop-outline'} size={16} color={accent} />
        <Text style={formStyles.selectorLabel}>{t(which === 'start' ? 'eventNew.start' : 'eventNew.end')}</Text>
      </View>
      <Text style={formStyles.selectorValue}>{whenLabel(value)}</Text>
    </TouchableOpacity>
  );

  const renderMore = (field: MoreFieldId) => {
    switch (field) {
      case 'availability': {
        const options: Choice<EventType>[] = [
          { value: 'BUSY', label: t('eventNew.busy'), icon: 'lock-closed-outline' },
          { value: 'FREE', label: t('eventNew.free'), icon: 'leaf-outline' },
        ];
        return (
          <View key={field}>
            <FieldLabel label={t('itemForm.availability')} />
            <ChoiceChips options={options} value={eventType} onChange={setEventType} accent={accent} testIDPrefix="moment-availability" />
          </View>
        );
      }
      case 'tags':
        return <TagField key={field} selectedIds={tagIds} onChange={setTagIds} />;
      default:
        return null;
    }
  };

  const renderSection = (section: FormSectionId) => {
    switch (section) {
      case 'what':
        return (
          <FormSection icon="create-outline" title={t('itemForm.what')} accent={accent}>
            <DictatedInput
              value={title}
              onChangeText={text => {
                setTitle(text);
                if (titleError) setTitleError('');
              }}
              accent={accent}
              placeholder={t('itemForm.momentPlaceholder')}
              inputStyle={formStyles.titleInput}
              autoFocus
              maxLength={120}
              testID="moment-title"
            />
            {titleError ? <Text style={formStyles.errorText}>{titleError}</Text> : null}
            <DictatedInput
              value={notes}
              onChangeText={setNotes}
              accent={accent}
              placeholder={t('itemForm.notesPlaceholder')}
              inputStyle={formStyles.notesInput}
              multiline
              maxLength={500}
              testID="moment-notes"
            />
          </FormSection>
        );
      case 'slot':
        return (
          <FormSection icon="time-outline" title={t('itemForm.slot')} accent={accent}>
            {slotRow('start', startAt)}
            {slotRow('end', endAt)}
          </FormSection>
        );
      case 'where':
        return (
          <FormSection icon="location-outline" title={t('itemForm.where')} accent={accent}>
            <TextInput
              style={formStyles.inputBox}
              value={location}
              onChangeText={setLocation}
              placeholder={t('itemForm.wherePlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              testID="moment-place"
            />
          </FormSection>
        );
      case 'leave':
        return (
          <FormSection icon="car-outline" title={t('itemForm.leave')} accent={accent} testID="moment-leave">
            <FieldLabel label={t('itemForm.leaveHint')} />
            <ChoiceChips
              options={LEAVE_OPTIONS.map(minutes => ({ value: minutes, label: minutes === 0 ? t('form.none') : minutes === 60 ? t('taskNew.hours1') : `${minutes} min` }))}
              value={travelBufferMinutes}
              onChange={setTravelBufferMinutes}
              accent={accent}
              testIDPrefix="moment-leave"
            />
          </FormSection>
        );
      case 'who':
        return <PersonField selectedIds={personIds} onChange={setPersonIds} multiple />;
      case 'more':
        return (
          <MoreOptions accent={accent}>
            <View style={{ gap: Spacing.sm }}>{visibleMoreFields('moment').map(renderMore)}</View>
          </MoreOptions>
        );
      default:
        return null;
    }
  };

  return (
    <FormShell
      family="moment"
      title={t('itemForm.moment.title')}
      subtitle={t('itemForm.moment.subtitle')}
      saveLabel={t('itemForm.moment.submit')}
      saving={saving}
      onSave={handleSave}
      testID="moment-form"
    >
      {visibleSections('moment', { place }).map(section => (
        <React.Fragment key={section}>{renderSection(section)}</React.Fragment>
      ))}
      <DateTimePickerModal
        isVisible={picker !== null}
        mode="datetime"
        date={picker === 'end' ? endAt : startAt}
        onConfirm={picked => {
          if (picker === 'start') {
            setStartAt(picked);
            // The end follows a start moved past it, keeping one hour
            if (endAt <= picked) setEndAt(addHours(picked, 1));
          } else {
            setEndAt(picked);
          }
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
        confirmTextIOS={t('personNew.confirm')}
        cancelTextIOS={t('form.cancel')}
        locale={language === 'fr' ? 'fr-FR' : 'en-US'}
      />
    </FormShell>
  );
}
