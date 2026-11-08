/**
 * Dictation for the quick capture, recognised on the phone only: the voice never leaves it,
 * as the app promises to work fully offline. The microphone shows on every Android phone; on
 * one that cannot recognise speech on its own (before Android 12, or without Google's speech
 * service), a tap says so and points to the microphone of the keyboard instead of hiding.
 */

import { useCallback, useEffect, useState } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Platform } from 'react-native';

import type { AppLanguage } from '@/domain/rules/language-rules';
import { logger } from '@/utils/logger';

const LOCALES: Record<AppLanguage, string> = { fr: 'fr-FR', en: 'en-US' };

export type DictationProblem = 'permission' | 'language' | 'failed' | 'unsupported';

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
  // Shown on every Android phone; recognised only where the phone can do it offline
  const available = Platform.OS === 'android';
  const [supported] = useState(isOnDeviceDictationAvailable);

  useEffect(() => {
    if (!supported) return;
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
  }, [supported, language, onText, onProblem]);

  const toggle = useCallback(async () => {
    if (!supported) {
      onProblem('unsupported');
      return;
    }
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
  }, [language, listening, onProblem, supported]);

  return { available, supported, listening, toggle };
}
