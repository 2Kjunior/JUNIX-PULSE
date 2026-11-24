/**
 * A received invitation (study 001, 5-A and 12.5; sheet 025). Opened by a Junix link
 * (junixpulse://invite?…), or from "Invitation reçue" where the person pastes the message.
 * It shows what it is, then adds it only on "Ajouter à mon Junix". The sender is linked when
 * already among the people; otherwise a switch, off at first, offers to add them.
 */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwitchRow } from '@/components/create/form/FormBricks';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { itemFamilyColor } from '@/constants/item-kinds';
import { momentKindLook } from '@/constants/moment-kinds';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { Person } from '@/domain/entities';
import { findInvite, inviteWhen, parseInviteParams, receivedKind, type Invite } from '@/domain/rules/invite-rules';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT, type MessageKey } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { InviteUseCases } from '@/use-cases/invite-use-cases';

const KIND_NAMES: Readonly<Record<Invite['kind'], MessageKey>> = {
  task: 'itemForm.todo.title',
  reminder: 'itemForm.todo.titleAlert',
  event: 'itemForm.moment.title',
};

export default function InviteScreen() {
  const t = useT();
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const params = useLocalSearchParams<Record<string, string>>();

  const fromLink = useMemo(() => parseInviteParams(params), [params]);
  const [pasted, setPasted] = useState('');
  const fromPaste = useMemo(() => (pasted ? findInvite(pasted) : null), [pasted]);
  const invite = fromLink ?? fromPaste;

  const [sender, setSender] = useState<Person | null>(null);
  const [addSender, setAddSender] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSender(null);
    if (invite) void InviteUseCases.senderOf(invite).then(setSender).catch(() => {});
  }, [invite]);

  const accept = async () => {
    if (!invite) return;
    setSaving(true);
    try {
      const path = await InviteUseCases.accept(invite, addSender);
      showSnackbar(t('invite.added'));
      router.replace(path as never);
    } catch {
      showSnackbar(t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const kind = invite ? receivedKind(invite, new Date()) : null;
  const color = itemFamilyColor(palette, kind === 'event' ? 'moment' : 'todo');
  const look = invite?.kind === 'event' && invite.momentKind ? momentKindLook(invite.momentKind) : null;
  const when = invite ? inviteWhen(invite, language) : '';

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface.base, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, minHeight: 56 }}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={24} color={palette.onSurface.primary} />
        </TouchableOpacity>
        <Text style={{ ...Typography.titleLarge, color: palette.onSurface.primary, flex: 1 }} accessibilityRole="header">
          {t('invite.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: insets.bottom + Spacing.xxl }}>
        {!fromLink ? (
          <View style={{ gap: Spacing.xs }}>
            <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{t('invite.pasteHint')}</Text>
            <TextInput
              value={pasted}
              onChangeText={setPasted}
              placeholder={t('invite.pastePlaceholder')}
              placeholderTextColor={palette.onSurface.disabled}
              multiline
              accessibilityLabel={t('invite.pastePlaceholder')}
              testID="invite-paste"
              style={{
                ...Typography.bodyMedium,
                color: palette.onSurface.primary,
                minHeight: 96,
                padding: Spacing.md,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: palette.outline.variant,
                backgroundColor: palette.surface.container,
                textAlignVertical: 'top',
              }}
            />
            {pasted && !fromPaste ? (
              <Text style={{ ...Typography.bodySmall, color: palette.error.default }}>{t('invite.notFound')}</Text>
            ) : null}
          </View>
        ) : null}

        {invite && kind ? (
          <>
            <GlowCard tone="neutral">
              <View style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons name={look?.icon ?? (kind === 'event' ? 'calendar-outline' : kind === 'reminder' ? 'notifications' : 'checkbox-outline')} size={16} color={color} />
                  <Text style={{ ...Typography.labelMedium, color }}>
                    {look && invite.momentKind !== 'other' ? t(look.labelKey) : t(KIND_NAMES[kind])}
                  </Text>
                </View>
                <Text style={{ ...Typography.titleLarge, color: palette.onSurface.primary }}>{invite.title}</Text>
                {when ? <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary }}>{when}</Text> : null}
                {invite.place ? <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.variant }}>{invite.place}</Text> : null}
                {invite.from ? (
                  <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('invite.fromName', { name: invite.from })}</Text>
                ) : null}
                {kind !== invite.kind ? (
                  <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('invite.pastReminder')}</Text>
                ) : null}
              </View>
            </GlowCard>

            {invite.from && sender ? (
              <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('invite.senderKnown', { name: sender.displayName })}</Text>
            ) : invite.from ? (
              <SwitchRow
                label={t('invite.addSender', { name: invite.from })}
                hint={t('invite.addSenderHint')}
                value={addSender}
                onChange={setAddSender}
                accent={palette.primary.default}
                testID="invite-add-sender"
              />
            ) : null}

            <Button label={t('invite.accept')} onPress={accept} loading={saving} variant="primary" size="lg" testID="invite-accept" />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
