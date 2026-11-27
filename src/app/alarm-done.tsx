/**
 * Where "Terminer" of an alarm leads (sheet 039): junixpulse://alarm-done?type=reminder&id=…
 * The alarm stops, the thing is ended, a short message says so, and Junix opens on its home.
 */
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { LoadingState } from '@/components/feedback/States';
import { useT } from '@/i18n';
import { JunixAlarm } from '../../modules/junix-alarm';
import { completeFromAlarm } from '@/services/alarm-done-service';
import { useAppStore } from '@/store/app-store';

export default function AlarmDoneScreen() {
  const t = useT();
  const { showSnackbar } = useAppStore();
  const params = useLocalSearchParams<{ type?: string; id?: string }>();

  useEffect(() => {
    let alive = true;
    // The alarm stops at once, even if ending the thing takes a moment
    JunixAlarm.stopRinging();
    completeFromAlarm(params.type, params.id)
      .then(result => {
        if (!alive) return;
        showSnackbar(t(result === 'done' ? 'alarmDone.done' : result === 'already' ? 'alarmDone.already' : 'alarmDone.missing'));
      })
      .catch(() => alive && showSnackbar(t('common.genericError')))
      .finally(() => alive && router.replace('/' as never));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the link that opened it
  }, []);

  return <LoadingState />;
}
