/**
 * The "Aujourd'hui" home screen widget (Android), in the look of the app: the glass card on
 * the dark or cream background, the violet of Junix Pulse, Pulse itself with the mood of the
 * day, the next reminder in a glass block, the progress of the tasks and the quick capture.
 *
 * Drawn by react-native-android-widget, outside the app: no hooks, only its own primitives,
 * and plain texts given by the caller.
 */
'use no memo';

import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { MascotMood } from '@/domain/rules/mascot-mood-rules';

import { widgetMascotSvg } from './widget-mascot-svg';

export interface TodayWidgetTexts {
  brand: string;
  date: string;
  /** What Pulse says about the day. */
  message: string;
  nextLabel: string;
  nextTitle: string;
  nextTime: string;
  progress: string;
  capture: string;
}

export type WidgetTheme = 'dark' | 'light';

type Hex = `#${string}`;
type Rgba = `rgba(${number}, ${number}, ${number}, ${number})`;

/** The colours of the app palettes (constants/palettes), for each theme. */
const THEMES: Record<
  WidgetTheme,
  {
    from: Hex;
    to: Hex;
    border: Rgba;
    glass: Rgba;
    glassBorder: Rgba;
    brand: Hex;
    accent: Hex;
    text: Hex;
    muted: Hex;
    track: Rgba;
    chip: Rgba;
  }
> = {
  dark: {
    from: '#211F23',
    to: '#1E1730',
    border: 'rgba(208, 188, 255, 0.28)',
    glass: 'rgba(255, 255, 255, 0.06)',
    glassBorder: 'rgba(255, 255, 255, 0.14)',
    brand: '#D0BCFF',
    accent: '#7BD0FF',
    text: '#E6E1E7',
    muted: '#CAC4D0',
    track: 'rgba(255, 255, 255, 0.12)',
    chip: 'rgba(208, 188, 255, 0.16)',
  },
  light: {
    from: '#FBF7F2',
    to: '#EFE6FF',
    border: 'rgba(107, 70, 193, 0.22)',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(107, 70, 193, 0.16)',
    brand: '#6B46C1',
    accent: '#0E7490',
    text: '#1C1917',
    muted: '#57534E',
    track: 'rgba(107, 70, 193, 0.14)',
    chip: 'rgba(107, 70, 193, 0.10)',
  },
};

interface TodayWidgetProps {
  texts: TodayWidgetTexts;
  theme: WidgetTheme;
  mood: MascotMood;
  /** Share of today's tasks done, 0 to 1. */
  progress: number;
}

export function TodayWidget({ texts, theme, mood, progress }: TodayWidgetProps) {
  const c = THEMES[theme];
  // Weights of the two parts of the bar: a sliver stays visible at 0 and at 100 %
  const done = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: c.border,
        backgroundGradient: { from: c.from, to: c.to, orientation: 'TL_BR' },
      }}
    >
      {/* Pulse, la marque et ce qu'elle dit de la journée */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <SvgWidget svg={widgetMascotSvg(mood)} style={{ width: 54, height: 49 }} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 8 }}>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget text={texts.brand} style={{ fontSize: 12, fontWeight: '700', color: c.brand }} />
            </FlexWidget>
            <TextWidget text={texts.date} style={{ fontSize: 11, color: c.muted }} />
          </FlexWidget>
          <TextWidget
            text={texts.message}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 14, fontWeight: '600', color: c.text, marginTop: 2 }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Le prochain rappel, dans un bloc en verre */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'junixpulse://reminders' }}
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.glassBorder,
          backgroundColor: c.glass,
        }}
      >
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={texts.nextLabel} style={{ fontSize: 10, fontWeight: '700', color: c.accent }} />
          <TextWidget
            text={texts.nextTitle}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 14, fontWeight: '600', color: c.text, marginTop: 1 }}
          />
        </FlexWidget>
        {texts.nextTime !== '' && (
          <FlexWidget
            style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: c.chip }}
          >
            <TextWidget text={texts.nextTime} style={{ fontSize: 12, fontWeight: '700', color: c.brand }} />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* Avancement des tâches du jour, et la capture rapide */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column', marginRight: 10 }}>
          <TextWidget text={texts.progress} style={{ fontSize: 11, color: c.muted }} />
          <FlexWidget
            style={{ flexDirection: 'row', width: 'match_parent', height: 6, marginTop: 4, borderRadius: 3, backgroundColor: c.track }}
          >
            <FlexWidget
              style={{
                flex: Math.max(done, 1),
                height: 6,
                borderRadius: 3,
                backgroundGradient: { from: '#7C3AED', to: '#4F46E5', orientation: 'LEFT_RIGHT' },
              }}
            />
            <FlexWidget style={{ flex: Math.max(100 - done, 1), height: 6 }} />
          </FlexWidget>
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'junixpulse://capture' }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 18,
            backgroundGradient: { from: '#7C3AED', to: '#4F46E5', orientation: 'LEFT_RIGHT' },
          }}
        >
          <TextWidget text={texts.capture} style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
