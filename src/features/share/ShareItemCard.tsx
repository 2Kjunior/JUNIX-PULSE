/**
 * "Partager" on the page of a task, a reminder or a moment (study 001, 5-A and 12.5; sheet 025).
 * "Envoyer" opens the phone's share sheet (WhatsApp, SMS, e-mail, Bluetooth, Quick Share…) with
 * a message anyone can read and a Junix link. Nothing is sent by itself, and nothing goes through
 * a server. Afterwards each person of the item shows "Invitée"; a touch marks "Participe".
 * The page passes its kind and id; the card reads the rest and reads it again on coming back.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Share, Text, TouchableOpacity, View } from 'react-native';

import { PersonAvatar } from '@/components/people/PersonAvatar';
import { GlowCard } from '@/components/ui/GlowCard';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { inviteMessage, nextInviteStatus, type InviteKind } from '@/domain/rules/invite-rules';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { InviteUseCases, type InvitePerson } from '@/use-cases/invite-use-cases';

export function ShareItemCard({
  kind,
  itemId,
  refreshKey,
}: {
  kind: InviteKind;
  itemId: string;
  /** Changes when the page changes the item's people itself, so the list follows. */
  refreshKey?: unknown;
}) {
  const t = useT();
  const language = useLanguage();
  const { palette } = useTheme();
  const { showSnackbar } = useAppStore();
  const [people, setPeople] = useState<InvitePerson[]>([]);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setPeople(await InviteUseCases.peopleOf(kind, itemId).catch(() => []));
  }, [kind, itemId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  useEffect(() => {
    if (refreshKey !== undefined) void load();
  }, [refreshKey, load]);

  const send = async () => {
    setSending(true);
    try {
      const invite = await InviteUseCases.inviteOf(kind, itemId);
      if (!invite) return;
      await Share.share({ message: inviteMessage(invite, language) });
      // Android does not say whether the message left: opening the share sheet counts as sending
      await InviteUseCases.markSent(kind, itemId);
      await load();
    } catch {
      showSnackbar(t('common.genericError'));
    } finally {
      setSending(false);
    }
  };

  const touchStatus = async (entry: InvitePerson) => {
    const next = nextInviteStatus(entry.status);
    if (!next) return;
    setPeople(list => list.map(item => (item.person.id === entry.person.id ? { ...item, status: next } : item)));
    await InviteUseCases.setStatus(kind, itemId, entry.person.id, next).catch(() => void load());
  };

  const sendLabel = people.length === 1 ? t('share.sendTo', { name: people[0].person.displayName }) : t('share.send');

  return (
    <GlowCard tone="neutral">
      <View style={{ gap: Spacing.sm }}>
        <TouchableOpacity
          onPress={send}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel={sendLabel}
          accessibilityHint={t('share.hint')}
          testID="share-send"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            minHeight: 48,
            paddingHorizontal: Spacing.md,
            borderRadius: Radius.md,
            backgroundColor: palette.primary.default + '1F',
            opacity: sending ? 0.6 : 1,
          }}
        >
          <Ionicons name="paper-plane-outline" size={18} color={palette.primary.default} />
          <Text style={{ ...Typography.labelLarge, color: palette.primary.default, flex: 1 }}>{sendLabel}</Text>
          <Ionicons name="share-social-outline" size={18} color={palette.primary.default} />
        </TouchableOpacity>
        <Text style={{ ...Typography.bodySmall, color: palette.onSurface.variant }}>{t('share.hint')}</Text>

        {people.map(entry => {
          const label = entry.status === 'joined' ? t('share.joined') : entry.status === 'invited' ? t('share.invited') : t('share.notSent');
          const color =
            entry.status === 'joined' ? palette.success.default : entry.status === 'invited' ? palette.primary.default : palette.onSurface.variant;
          return (
            <View key={entry.person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 }}>
              <PersonAvatar name={entry.person.displayName} size={32} />
              <Text style={{ ...Typography.bodyMedium, color: palette.onSurface.primary, flex: 1 }} numberOfLines={1}>
                {entry.person.displayName}
              </Text>
              <TouchableOpacity
                onPress={() => void touchStatus(entry)}
                disabled={entry.status === null}
                accessibilityRole="button"
                accessibilityLabel={t('share.statusA11y', { name: entry.person.displayName, status: label })}
                accessibilityState={{ disabled: entry.status === null }}
                testID={`share-status-${entry.person.id}`}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm }}
              >
                <Text style={{ ...Typography.labelMedium, color }}>{label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </GlowCard>
  );
}
