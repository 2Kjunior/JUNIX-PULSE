/**
 * The bricks of the create forms (sheet 012): the frame, a section, a text field with dictation,
 * a row of choices, a switch and the "More options" fold. Each brick takes the colour of its
 * family, so the two forms look different while built from the same pieces.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ITEM_FAMILY_DEFINITIONS, itemFamilyColor, type ItemFamily } from '@/constants/item-kinds';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useDictation, type DictationProblem } from '@/features/capture/use-dictation';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useLanguage, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { makeFormStyles } from '@/styles/common/form-styles';

export type IconName = keyof typeof Ionicons.glyphMap;

const DICTATION_PROBLEM_KEYS = {
  permission: 'capture.dictation.permission',
  language: 'capture.dictation.language',
  failed: 'capture.dictation.failed',
  unsupported: 'capture.dictation.unsupported',
} as const;

/** The frame of a form: its bar (Cancel, the family, Add), a coloured line, the page and the big button. */
export function FormShell({
  family,
  icon,
  title,
  subtitle,
  saveLabel,
  editing = false,
  saving,
  onSave,
  testID,
  children,
  accentColor,
}: {
  family: ItemFamily;
  /** The colour chosen for the card (sheet 043): the bar and the big button take it, as a preview. */
  accentColor?: string;
  /** Another icon than the family's, for instance a bell for a todo with an alert. */
  icon?: IconName;
  title: string;
  subtitle: string;
  saveLabel: string;
  /** Changing a saved item (sheet 022): the bar says "Enregistrer" rather than "Ajouter". */
  editing?: boolean;
  saving: boolean;
  onSave: () => void;
  testID?: string;
  children: ReactNode;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const accent = accentColor ?? itemFamilyColor(palette, family);
  // Dark text on the light cyan and amber of the dark theme, white on the deep ones of the light theme
  const onAccent = palette.mode === 'light' ? '#FFFFFF' : '#141317';

  return (
    <KeyboardAvoidingView
      style={[formStyles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID}
    >
      <View style={formStyles.toolbar}>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('form.cancel')}
        >
          <Text style={formStyles.toolbarCancel}>{t('form.cancel')}</Text>
        </TouchableOpacity>
        <View style={formStyles.toolbarCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <Ionicons name={icon ?? ITEM_FAMILY_DEFINITIONS[family].icon} size={18} color={accent} />
            <Text style={[formStyles.toolbarTitle, { color: accent, flexShrink: 1 }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Text style={formStyles.toolbarSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity
          style={formStyles.toolbarBtn}
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
        >
          <Text style={[formStyles.toolbarSave, { color: accent }, saving && formStyles.toolbarSaveDisabled]}>
            {saving ? t(editing ? 'itemForm.savingEdit' : 'itemForm.saving') : t(editing ? 'itemForm.saveEdit' : 'itemForm.save')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 3, backgroundColor: accent, opacity: 0.85 }} />

      <ScrollView
        style={formStyles.scroll}
        contentContainerStyle={[formStyles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
          testID="form-save"
          style={{
            marginTop: Spacing.md,
            minHeight: 52,
            borderRadius: Radius.lg,
            backgroundColor: accent,
            opacity: saving ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.sm,
          }}
        >
          <Ionicons name={ITEM_FAMILY_DEFINITIONS[family].icon} size={20} color={onAccent} />
          <Text style={{ ...Typography.labelLarge, fontWeight: '700', color: onAccent }}>
            {saving ? t(editing ? 'itemForm.savingEdit' : 'itemForm.saving') : saveLabel}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A section: a small coloured badge, its title, and a card with its fields. */
export function FormSection({
  icon,
  title,
  accent,
  testID,
  children,
}: {
  icon: IconName;
  title: string;
  accent: string;
  testID?: string;
  children: ReactNode;
}) {
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View testID={testID}>
      <View style={formStyles.sectionHeaderRow}>
        <View style={[formStyles.sectionHeaderIconBadge, { backgroundColor: `${accent}22` }]}>
          <Ionicons name={icon} size={14} color={accent} />
        </View>
        <Text style={formStyles.sectionHeaderTitle}>{title}</Text>
      </View>
      <View style={formStyles.cardGroup}>{children}</View>
    </View>
  );
}

/** A label and its explanation, above a row of choices. */
export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View style={{ marginTop: Spacing.xs }}>
      <Text style={formStyles.fieldLabel}>{label}</Text>
      {hint ? <Text style={formStyles.fieldSub}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A text field with a microphone beside it (Android). The words heard are added after what was
 * already written. Both fields of a form hear the same microphone: each keeps only what was
 * said after a tap on its own.
 */
export function DictatedInput({
  value,
  onChangeText,
  accent,
  inputStyle,
  testID,
  small = false,
  ...input
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  accent: string;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
  /** A smaller microphone, for a secondary field such as the notes. */
  small?: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const baseRef = useRef('');
  const mineRef = useRef(false);

  const onText = useCallback(
    (heard: string) => {
      if (!mineRef.current) return;
      onChangeText(baseRef.current ? `${baseRef.current} ${heard}` : heard);
    },
    [onChangeText]
  );
  const onProblem = useCallback(
    (problem: DictationProblem) => {
      if (mineRef.current) showSnackbar(t(DICTATION_PROBLEM_KEYS[problem]));
    },
    [showSnackbar, t]
  );
  const dictation = useDictation(language, onText, onProblem);

  useEffect(() => {
    if (!dictation.listening) mineRef.current = false;
  }, [dictation.listening]);

  // A smaller microphone for the notes than for the title; the touch area stays 44 px
  const micSize = small ? 32 : 44;

  const toggle = () => {
    if (!dictation.listening) {
      baseRef.current = value.trim();
      mineRef.current = true;
    }
    void dictation.toggle();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
      <TextInput
        {...input}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={palette.onSurface.disabled}
        style={[{ flex: 1 }, inputStyle]}
      />
      {dictation.available ? (
        <TouchableOpacity
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={t(dictation.listening ? 'capture.dictation.stop' : 'capture.dictation.start')}
          testID={testID ? `${testID}-mic` : undefined}
          hitSlop={small ? 6 : 0}
          style={{
            width: micSize,
            height: micSize,
            borderRadius: Radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: dictation.listening ? palette.error.default : accent,
            backgroundColor: dictation.listening ? palette.error.default : `${accent}18`,
          }}
        >
          <Ionicons
            name={dictation.listening ? 'stop' : 'mic-outline'}
            size={small ? 15 : 18}
            color={dictation.listening ? palette.onSurface.primary : accent}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export interface Choice<T> {
  value: T;
  label: string;
  icon?: IconName;
}

/** A row of choices, one selected, in the colour of the family. */
export function ChoiceChips<T>({
  options,
  value,
  onChange,
  accent,
  testIDPrefix,
}: {
  options: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  accent: string;
  testIDPrefix?: string;
}) {
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View style={formStyles.chipsRow} accessibilityRole="radiogroup">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={index}
            style={[formStyles.chip, { minHeight: 44 }, selected && { backgroundColor: `${accent}22`, borderColor: accent }]}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            testID={testIDPrefix ? `${testIDPrefix}-${String(option.value ?? 'none')}` : undefined}
          >
            {option.icon ? (
              <Ionicons name={option.icon} size={14} color={selected ? accent : palette.onSurface.variant} />
            ) : null}
            <Text style={[formStyles.chipText, selected && { color: accent, fontWeight: '700' }]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** A switch with its label and explanation. */
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  accent,
  testID,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accent: string;
  testID?: string;
}) {
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  return (
    <View style={[formStyles.rowBetween, { minHeight: 44 }]}>
      <View style={{ flex: 1, paddingRight: Spacing.sm }}>
        <Text style={formStyles.fieldLabel}>{label}</Text>
        {hint ? <Text style={formStyles.fieldSub}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: palette.outline.variant, true: accent }}
        thumbColor={value ? '#FFFFFF' : palette.onSurface.disabled}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

/**
 * "Dictate everything" (sheet 013): one sentence fills the form. The sentence heard is shown and
 * handed to the form at each new result, as the phone refines it while one speaks. Shown where
 * dictation exists (Android), like the microphone of the quick capture.
 */
export function DictateAll({
  accent,
  example,
  onSentence,
  understood = [],
}: {
  accent: string;
  example: string;
  onSentence: (sentence: string) => void;
  /** What the sentence filled in, shown so the person checks it before adding (sheet 014). */
  understood?: readonly string[];
}) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const formStyles = useThemedStyles(makeFormStyles);
  const { showSnackbar } = useAppStore();
  const mineRef = useRef(false);
  const onSentenceRef = useRef(onSentence);
  const [heard, setHeard] = useState('');

  useEffect(() => {
    onSentenceRef.current = onSentence;
  }, [onSentence]);

  const onText = useCallback((sentence: string) => {
    if (!mineRef.current) return;
    setHeard(sentence);
    onSentenceRef.current(sentence);
  }, []);
  const onProblem = useCallback(
    (problem: DictationProblem) => {
      if (mineRef.current) showSnackbar(t(DICTATION_PROBLEM_KEYS[problem]));
    },
    [showSnackbar, t]
  );
  const dictation = useDictation(language, onText, onProblem);

  useEffect(() => {
    if (!dictation.listening) mineRef.current = false;
  }, [dictation.listening]);

  if (!dictation.available) return null;

  return (
    <View style={[formStyles.cardGroup, { borderWidth: 1, borderColor: `${accent}55` }]}>
      <TouchableOpacity
        onPress={() => {
          if (!dictation.listening) mineRef.current = true;
          void dictation.toggle();
        }}
        accessibilityRole="button"
        accessibilityLabel={t(dictation.listening ? 'capture.dictation.stop' : 'itemForm.dictateAll')}
        testID="form-dictate-all"
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: Radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: dictation.listening ? palette.error.default : `${accent}22`,
          }}
        >
          <Ionicons name={dictation.listening ? 'stop' : 'mic'} size={20} color={dictation.listening ? palette.onSurface.primary : accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[formStyles.fieldLabel, { color: accent }]}>
            {t(dictation.listening ? 'itemForm.dictateListening' : 'itemForm.dictateAll')}
          </Text>
          <Text style={formStyles.fieldSub}>{heard ? t('itemForm.dictateHeard', { sentence: heard }) : example}</Text>
          {understood.length > 0 ? (
            <Text style={[formStyles.fieldSub, { color: accent, fontWeight: '600' }]} testID="form-understood">
              {t('itemForm.understood', { items: understood.join(' · ') })}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

/** "More options": folded at first, so the form stays short. */
export function MoreOptions({ accent, children }: { accent: string; children: ReactNode }) {
  const t = useT();
  const formStyles = useThemedStyles(makeFormStyles);
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(value => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID="form-more"
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: 44, marginTop: Spacing.sm }}
      >
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={accent} />
        <Text style={[formStyles.fieldLabel, { color: accent }]}>{t(open ? 'itemForm.less' : 'itemForm.more')}</Text>
      </TouchableOpacity>
      {open ? <View style={[formStyles.cardGroup, { gap: Spacing.sm }]}>{children}</View> : null}
    </View>
  );
}
