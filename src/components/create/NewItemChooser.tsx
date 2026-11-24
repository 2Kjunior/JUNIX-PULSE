/**
 * "Que voulez-vous ajouter ?": one sheet, the same from the home screen and from the Planning.
 * Two families rather than three kinds (study 001, 1-B): something to do, ticked off once done,
 * or a moment that takes place. "Something to do" opens on its two forms, without or with an
 * alert at a time, until the single form arrives. From the home screen, a first choice lets
 * Junix read one sentence (quick capture).
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography } from '@/constants/theme';
import type { ThemePalette } from '@/constants/palettes';
import { ITEM_FAMILY_DEFINITIONS, itemFamilyColor, type ItemFamily } from '@/constants/item-kinds';
import { newItemRoute, type NewItemKind } from '@/features/create/new-item-route';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useDateLocale, useT, type MessageKey } from '@/i18n';
import { hexToRgba } from '@/utils/color';

interface NewItemChooserProps {
  visible: boolean;
  onClose: () => void;
  /** The day chosen in the Planning; none from the home screen. */
  date?: Date | null;
  /** The hour of the slot touched in the Planning. */
  hour?: number | null;
  /** Offers first to write or dictate one sentence (home screen). */
  withCapture?: boolean;
}

/** What the chooser says of a family; its icon, colour and name come from the registry. */
interface Choice {
  family: ItemFamily;
  question: MessageKey;
  rule: MessageKey;
  example: MessageKey;
}

const CHOICES: readonly Choice[] = [
  { family: 'todo', question: 'create.todo.question', rule: 'create.todo.rule', example: 'create.todo.example' },
  { family: 'moment', question: 'create.moment.question', rule: 'create.moment.rule', example: 'create.moment.example' },
];

/** The two ways of something to do, each opening its form. */
// One form per family (sheet 014): a todo chooses its alert in its form, no more in this sheet

export function NewItemChooser({ visible, onClose, date = null, hour = null, withCapture = false }: NewItemChooserProps) {
  const t = useT();
  const locale = useDateLocale();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useThemedStyles(makeNewItemChooserStyles);
  const close = () => {
    onClose();
  };

  const open = (kind: NewItemKind) => {
    close();
    router.push(newItemRoute(kind, date, hour));
  };

  // From a slot of the Planning, the sheet says which day and hour it adds to
  const title = !date
    ? t('create.title')
    : hour !== null
      ? t('calendarAction.slotOf', { hour: String(hour).padStart(2, '0') })
      : t('calendarAction.addToPlanning');


  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}
          accessibilityViewIsModal
          testID="new-item-chooser"
        >
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {date && <Text style={styles.date}>{format(date, 'EEEE d MMMM', { locale })}</Text>}

          {withCapture && (
            <TouchableOpacity
              style={[styles.choice, styles.captureChoice]}
              onPress={() => open('capture')}
              accessibilityRole="button"
              accessibilityLabel={`${t('create.capture.title')}. ${t('create.capture.desc')}`}
              testID="new-item-capture"
            >
              <View style={[styles.icon, { backgroundColor: hexToRgba(palette.primary.default, 0.16) }]}>
                <Ionicons name="sparkles-outline" size={20} color={palette.primary.default} />
              </View>
              <View style={styles.choiceText}>
                <Text style={styles.question}>{t('create.capture.title')}</Text>
                <Text style={styles.rule}>{t('create.capture.desc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
            </TouchableOpacity>
          )}

          {CHOICES.map(choice => {
            // Icon, colour and name of the family: the same as everywhere else in the app
            const family = ITEM_FAMILY_DEFINITIONS[choice.family];
            const color = itemFamilyColor(palette, choice.family);
            const isTodo = choice.family === 'todo';
            return (
              <View key={choice.family}>
                <TouchableOpacity
                  style={styles.choice}
                  onPress={() => open(isTodo ? 'task' : 'event')}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(choice.question)}, ${t(family.labelKey)}. ${t(choice.rule)}`}
                  testID={`new-item-${choice.family}`}
                >
                  <View style={[styles.icon, { backgroundColor: hexToRgba(color, 0.16) }]}>
                    <Ionicons name={family.icon} size={20} color={color} />
                  </View>
                  <View style={styles.choiceText}>
                    <View style={styles.questionRow}>
                      <Text style={styles.question}>{t(choice.question)}</Text>
                      <Text style={[styles.type, { color, backgroundColor: hexToRgba(color, 0.14) }]}>{t(family.labelKey)}</Text>
                    </View>
                    <Text style={styles.rule}>{t(choice.rule)}</Text>
                    <Text style={styles.example}>{t(choice.example)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.onSurface.variant} />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* A received invitation (sheet 025): the message is pasted there */}
          <TouchableOpacity
            onPress={() => {
              close();
              router.push('/invite');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('create.invite')}
            testID="new-item-invite"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 44 }}
          >
            <Ionicons name="mail-open-outline" size={16} color={palette.onSurface.variant} />
            <Text style={styles.rule}>{t('create.invite')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeNewItemChooserStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    sheet: {
      // Opaque, like the other sheets: nothing behind shows through the text
      backgroundColor: theme.surface.container,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      gap: Spacing.sm,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.onSurface.disabled,
      alignSelf: 'center',
      marginBottom: Spacing.xs,
    },
    title: {
      ...Typography.titleLarge,
      color: theme.onSurface.primary,
      fontWeight: '700',
      textAlign: 'center',
    },
    date: {
      ...Typography.labelMedium,
      color: theme.primary.default,
      textAlign: 'center',
      textTransform: 'capitalize',
      marginTop: -Spacing.xs,
    },
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      minHeight: 64,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: theme.glass.control.backgroundColor,
      borderWidth: 1,
      borderColor: theme.glass.control.borderColor,
    },
    choiceOpen: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    captureChoice: {
      borderColor: hexToRgba(theme.primary.default, 0.45),
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choiceText: {
      flex: 1,
      gap: 2,
    },
    questionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    question: {
      ...Typography.titleMedium,
      color: theme.onSurface.primary,
      fontWeight: '700',
    },
    type: {
      ...Typography.labelSmall,
      fontWeight: '700',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    rule: {
      ...Typography.bodySmall,
      color: theme.onSurface.primary,
    },
    example: {
      ...Typography.bodySmall,
      color: theme.onSurface.variant,
      fontStyle: 'italic',
    },
    ways: {
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.glass.control.borderColor,
      borderBottomLeftRadius: Radius.lg,
      borderBottomRightRadius: Radius.lg,
      backgroundColor: theme.surface.high,
      paddingHorizontal: Spacing.md,
    },
    way: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      minHeight: 56,
      paddingLeft: Spacing.md,
    },
    wayTitle: {
      ...Typography.labelLarge,
      color: theme.onSurface.primary,
      fontWeight: '600',
    },
  });
