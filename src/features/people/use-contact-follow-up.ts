/**
 * Calling, texting or mailing someone opens another app, so Junix cannot know whether the
 * person was reached. Back in Junix after such a tap, one question records the exchange: it
 * keeps the last contact right, and on a birthday it ends Pulse's party. Nothing is recorded
 * without the user's answer, and nothing is asked when the other app never opened.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';

import { GlassAlert } from '@/components/feedback/GlassAlert';
import type { InteractionType } from '@/domain/entities';
import { useT } from '@/i18n';

export function useContactFollowUp(name: string | undefined, onReached: (type: InteractionType) => void) {
  const t = useT();
  const pending = useRef<InteractionType | null>(null);
  const away = useRef(false);
  // The latest values, read when the user comes back
  const latest = useRef({ name, onReached });
  latest.current = { name, onReached };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (!pending.current) return;
      if (state === 'background') {
        away.current = true;
        return;
      }
      if (state !== 'active' || !away.current) return;
      const type = pending.current;
      pending.current = null;
      away.current = false;
      GlassAlert.alert(t('person.reached.title', { name: latest.current.name ?? '' }), t('person.reached.body'), [
        { text: t('person.reached.no'), style: 'cancel' },
        { text: t('person.reached.yes'), onPress: () => latest.current.onReached(type) },
      ]);
    });
    return () => subscription.remove();
  }, [t]);

  return useCallback((type: InteractionType, url: string) => {
    pending.current = type;
    away.current = false;
    Linking.openURL(url).catch(() => {
      pending.current = null;
    });
  }, []);
}
