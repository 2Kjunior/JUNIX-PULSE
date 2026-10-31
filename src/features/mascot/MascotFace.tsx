/**
 * Face of the Pulse mascot: two eyes and the pulse line, drawn in the shared 160 x 130 space.
 * Eye shape and line shape express the mood. Port of face() in the reference sheet.
 */

import React from 'react';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { MascotMood } from '@/domain/rules/mascot-mood-rules';

const INK = '#1A1040';
const EYE_Y = 53;
const EYE_LEFT_X = 66;
const EYE_RIGHT_X = 94;
const SPARKLES: readonly (readonly [number, number])[] = [[28, 26], [132, 22], [142, 76], [18, 86]];

interface EyeProps {
  x: number;
  y: number;
  mood: MascotMood;
}

function Eye({ x, y, mood }: EyeProps) {
  switch (mood) {
    case 'calm':
      return <Rect x={x - 3} y={y - 5} width={6} height={10} rx={3} fill={INK} />;
    case 'happy':
      return <Path d={`M${x - 6} ${y + 3} Q${x} ${y - 7} ${x + 6} ${y + 3}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />;
    case 'focused':
      return (
        <G>
          <Path d={`M${x - 6} ${y + 1} L${x + 6} ${y + 1}`} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
          <Path d={`M${x - 6} ${y - 3} Q${x} ${y - 6} ${x + 6} ${y - 3}`} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />
        </G>
      );
    case 'alert':
      return (
        <G>
          <Circle cx={x} cy={y} r={7} fill="#FFFFFF" stroke={INK} strokeWidth={2} />
          <Circle cx={x} cy={y + 1} r={3.2} fill={INK} />
        </G>
      );
    case 'sleepy':
      return <Path d={`M${x - 6} ${y - 1} Q${x} ${y + 6} ${x + 6} ${y - 1}`} fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />;
    case 'party':
      return <Path d={`M${x - 6} ${y + 3} Q${x} ${y - 8} ${x + 6} ${y + 3}`} fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />;
  }
}

function Cheeks({ opacity }: { opacity: number }) {
  return (
    <G>
      <Circle cx={55} cy={66} r={5} fill="#ff7aa8" opacity={opacity} />
      <Circle cx={105} cy={66} r={5} fill="#ff7aa8" opacity={opacity} />
    </G>
  );
}

function sparklePath([x, y]: readonly [number, number]): string {
  return `M${x} ${y - 6} L${x + 1.8} ${y - 1.8} L${x + 6} ${y} L${x + 1.8} ${y + 1.8} L${x} ${y + 6} L${x - 1.8} ${y + 1.8} L${x - 6} ${y} L${x - 1.8} ${y - 1.8}Z`;
}

function PulseLine({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'calm':
      return <Path d="M58 74 H70 l3 -6 l4 11 l4 -9 l3 4 H102" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />;
    case 'happy':
      return (
        <G>
          <Cheeks opacity={0.38} />
          <Path d="M60 70 Q80 86 100 70" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
          <Path d="M71 76 l3 -4 l3 7 l3 -6" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        </G>
      );
    case 'focused':
      return <Path d="M58 74 H74 l2 -4 l3 8 l2 -4 H102" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />;
    case 'alert':
      return <Path d="M56 74 l7 -9 l6 15 l6 -17 l6 17 l6 -15 l7 9" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />;
    case 'sleepy':
      return (
        <G>
          <Path d="M60 74 H100" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />
          <SvgText x={104} y={38} fontWeight="800" fontSize={11} fill="#6a5bb5">z</SvgText>
          <SvgText x={111} y={29} fontWeight="800" fontSize={8.5} fill="#6a5bb5" opacity={0.8}>z</SvgText>
          <SvgText x={116} y={22} fontWeight="800" fontSize={6.5} fill="#6a5bb5" opacity={0.6}>z</SvgText>
        </G>
      );
    case 'party':
      return (
        <G>
          <Cheeks opacity={0.4} />
          <Path d="M56 68 Q80 96 104 68 Z" fill="#FFFFFF" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
          <Path d="M62 72 l4 -3 l3 6 l4 -5" fill="none" stroke="#ff5fa2" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
          {SPARKLES.map((point, index) => (
            <Path key={point.join('-')} d={sparklePath(point)} fill={index % 2 ? '#0AE8F0' : '#ffd36b'} opacity={0.9} />
          ))}
        </G>
      );
  }
}

export function MascotFace({ mood }: { mood: MascotMood }) {
  return (
    <G>
      <Eye x={EYE_LEFT_X} y={EYE_Y} mood={mood} />
      <Eye x={EYE_RIGHT_X} y={EYE_Y} mood={mood} />
      <PulseLine mood={mood} />
    </G>
  );
}
