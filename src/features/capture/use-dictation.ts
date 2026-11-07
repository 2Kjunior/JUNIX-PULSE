/**
 * Dictation for the quick capture, recognised on the phone only: the voice never leaves it,
 * as the app promises to work fully offline. Phones that cannot recognise speech on their own
 * (before Android 13, or without the offline language) get no microphone button.
 */

import { useCallback, useEffect, useState } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Platform } from 'react-native';

import type { AppLanguage } from '@/domain/rules/language-rules';
import { logger } from '@/utils/logger';

const LOCALES: Record<AppLanguage, string> = { fr: 'fr-FR', en: 'en-US' };

export type DictationProblem = 'permission' | 'language' | 'failed';

export function isOnDeviceDictationAvailable(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

export function useDictation(
  language: AppLanguage,
  onText: (text: string) => void,
  onProblem: (problem: DictationProblem) => void
) {
  const [listening, setListening] = useState(false);
  const [available] = useState(isOnDeviceDictationAvailable);

  useEffect(() => {
    if (!available) return;
    const emitter = ExpoSpeechRecognitionModule;
    const subscriptions = [
      emitter.addListener('result', event => {
        const transcript = event.results[0]?.transcript;
        if (transcript) onText(transcript);
      }),
      emitter.addListener('end', () => setListening(false)),
      emitter.addListener('error', event => {
        setListening(false);
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        if (event.error === 'language-not-supported') {
          // Offers the system dialog that downloads the offline language
          void emitter.androidTriggerOfflineModelDownload({ locale: LOCALES[language] }).catch(() => {});
          onProblem('language');
          return;
        }
        logger.warn('[Dictation] Reconnaissance impossible', event.error);
        onProblem(event.error === 'not-allowed' ? 'permission' : 'failed');
      }),
    ];
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, [available, language, onText, onProblem]);

  const toggle = useCallback(async () => {
    const recognizer = ExpoSpeechRecognitionModule;
    if (listening) {
      recognizer.stop();
      return;
    }
    const permission = await recognizer.requestPermissionsAsync();
    if (!permission.granted) {
      onProblem('permission');
      return;
    }
    recognizer.start({
      lang: LOCALES[language],
      interimResults: true,
      // The audio stays on the phone; start() fails rather than going online
      requiresOnDeviceRecognition: true,
    });
    setListening(true);
  }, [language, listening, onProblem]);

  return { available, listening, toggle };
}
