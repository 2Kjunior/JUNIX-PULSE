/**
 * The "Moment" form (study 001, 12.2 "2-B"; sheet 012), in amber: What → Start and end → Where →
 * Leave … min before (only once a place is written) → With whom → More options, in the order of
 * the registry (constants/item-forms).
 * The same form changes a saved moment (sheet 022, `editingId`): it opens filled in.
 */

import { Ionicons } from '@expo/vector-icons';
import { addHours, format } from 'date-fns';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import {
  ChoiceChips,
  DictateAll,
  DictatedInput,
  FieldLabel,
  FormSection,
  FormShell,
  MoreOptions,
  type Choice,
} from '@/components/create/form/FormBricks';
import { AlertLevelField } from '@/components/create/form/AlertLevelField';
import { LoadingState } from '@/components/feedback/States';
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
import { MOMENT_KIND_LOOKS } from '@/constants/moment-kinds';
import { Spacing } from '@/constants/theme';
import type { AlertLevel, EventType, MomentKind, Person } from '@/domain/entities';
import { momentFromSentence } from '@/domain/rules/form-dictation-rules';
import { guessMomentKind, MOMENT_KINDS } from '@/domain/rules/moment-kind-rules';
import { loadMomentForEdit } from '@/features/create/edit-loaders';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useLanguage, useT } from '@/i18n';
import { PersonRepository } from '@/repositories/person-repository';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';
import { EventUseCases } from '@/use-cases/event-use-cases';

export interface MomentFormProps {
  defaultDate?: string;
  defaultHour?: string;
  /** Opened from the page of a person: they already take part. */
  personId?: string;
  /** A saved moment to change (sheet 022) instead of a new one. */
  editingId?: string;
}

/** The first hour of a new moment: the hour asked for, or the next full hour. */
function initialStart(defaultDate?: string, defaultHour?: string): Date {
  const now = new Date();
  const day = dayParam(defaultDate);
  const start = day ? new Date(`${day}T12:00:00`) : new Date(now);
  start.setHours(hourParam(defaultHour) ?? now.getHours() + 1, 0, 0, 0);
  return start;
}

export function MomentForm({ defaultDate, defaultHour, personId, editingId }: MomentFormProps) {
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
  // Its type (sheet 023): guessed from the title until the person picks one
  const [momentKind, setMomentKind] = useState<MomentKind>('other');
  const [kindPicked, setKindPicked] = useState(Boolean(editingId));
  const [alertLevel, setAlertLevel] = useState<AlertLevel | null>(null);
  const [personIds, setPersonIds] = useState<string[]>(() => (personId ? [personId] : []));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);
  // The people, so that "avec Paul" in a dictated sentence finds Paul
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    PersonRepository.findAll()
      .then(setPersons)
      .catch(() => {});
  }, []);

  // What was saved, read once when changing a moment
  const [ready, setReady] = useState(!editingId);
  useEffect(() => {
    if (!editingId) return;
    let active = true;
    loadMomentForEdit(editingId)
      .then(values => {
        if (!active) return;
        if (!values) {
          showSnackbar(t('eventDetail.notFound'));
          router.back();
          return;
        }
        setTitle(values.title);
        setNotes(values.notes);
        setStartAt(values.startAt);
        setEndAt(values.endAt);
        setLocation(values.location);
        setTravelBufferMinutes(values.travelBufferMinutes);
        setEventType(values.type);
        setMomentKind(values.momentKind);
        setAlertLevel(values.alertLevel);
        setPersonIds(values.personIds);
        setTagIds(values.tagIds);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        showSnackbar(t('common.loadError'));
        router.back();
      });
    return () => {
      active = false;
    };
    // Read once for the moment opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // "Dictate everything" (sheets 013 and 014): title, start, end, place, person and notes from one
  // sentence; "Compris" lists them so the person checks before adding
  const [understood, setUnderstood] = useState<string[]>([]);
  const applySentence = (sentence: string) => {
    const fill = momentFromSentence(sentence, persons, new Date(), language);
    const kind = guessMomentKind(sentence, language);
    if (kind) {
      setMomentKind(kind);
      setKindPicked(true);
    }
    setTitle(fill.title);
    if (fill.title) setTitleError('');
    setStartAt(fill.start);
    setEndAt(fill.end);
    if (fill.place) setLocation(fill.place);
    if (fill.notes) setNotes(fill.notes);
    const personId = fill.personId;
    if (personId) setPersonIds(ids => (ids.includes(personId) ? ids : [personId, ...ids]));
    setUnderstood(
      [
        `${format(fill.start, 'EEE d MMM HH:mm', { locale: dateLocale })} – ${format(fill.end, 'HH:mm')}`,
        kind && kind !== 'other' ? t(MOMENT_KIND_LOOKS[kind].labelKey) : '',
        fill.place ?? '',
        persons.find(person => person.id === personId)?.displayName ?? '',
        fill.notes ? t('itemForm.understoodNote') : '',
      ].filter(Boolean)
    );
  };

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
      if (editingId) {
        await EventUseCases.updateEvent({
          id: editingId,
          title: title.trim(),
          notes: notes.trim(),
          startAt,
          endAt,
          location: place,
          type: eventType,
          travelBufferMinutes: place ? travelBufferMinutes : 0,
          momentKind,
          alertLevel,
          personIds,
          tagIds,
        });
        showSnackbar(t('itemForm.saved'));
      } else {
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
          momentKind,
          alertLevel,
          personIds,
          tagIds,
        });
        showSnackbar(t('eventNew.created'));
      }
      router.back();
    } catch (e) {
      showSnackbar(e instanceof Error ? e.message : t(editingId ? 'taskDetail.saveError' : 'taskNew.createError'));
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
      case 'alertLevel':
        return <AlertLevelField key={field} value={alertLevel} onChange={setAlertLevel} accent={accent} testIDPrefix="moment-alert-level" />;
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
                // "Dentiste", "Anniversaire de Léa": the type follows the title until one is picked
                if (!kindPicked) setMomentKind(guessMomentKind(text, language) ?? 'other');
              }}
              accent={accent}
              placeholder={t('itemForm.momentPlaceholder')}
              inputStyle={formStyles.titleInput}
              // A new moment starts with its title; a saved one opens without the keyboard
              autoFocus={!editingId}
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
              small
            />
          </FormSection>
        );
      case 'kind':
        return (
          <FormSection icon="pricetag-outline" title={t('itemForm.kind')} accent={accent}>
            <ChoiceChips
              options={MOMENT_KINDS.map(kind => ({
                value: kind,
                label: t(MOMENT_KIND_LOOKS[kind].labelKey),
                icon: MOMENT_KIND_LOOKS[kind].icon,
              }))}
              value={momentKind}
              onChange={kind => {
                setMomentKind(kind);
                setKindPicked(true);
              }}
              accent={accent}
              testIDPrefix="moment-kind"
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

  if (!ready) return <LoadingState />;

  return (
    <FormShell
      family="moment"
      title={t('itemForm.moment.title')}
      subtitle={t(editingId ? 'itemForm.editSubtitle' : 'itemForm.moment.subtitle')}
      saveLabel={t(editingId ? 'itemForm.editSubmit' : 'itemForm.moment.submit')}
      editing={Boolean(editingId)}
      saving={saving}
      onSave={handleSave}
      testID="moment-form"
    >
      <DictateAll
        accent={accent}
        example={t('itemForm.dictateMomentExample')}
        onSentence={applySentence}
        understood={understood}
      />
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
