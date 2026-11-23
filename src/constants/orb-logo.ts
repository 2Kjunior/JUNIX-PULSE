/**
 * The orb A1, the Junix Pulse logo, as numbers: the one source of its drawing for the logo in
 * the app (PulseLogo) and the launch animation. The drawings in assets/logo use the same numbers.
 * The orb is drawn around (0, 0), in a square of 180 units.
 */

export const ORB_VIEWBOX = '-90 -90 180 180';
export const ORB_VIEWBOX_SIZE = 180;

/** The ring: its radius and the width of its line. */
export const ORB_RING = { radius: 78, stroke: 10 } as const;

/** Distance around the ring, to draw it little by little. */
export const ORB_RING_LENGTH = 2 * Math.PI * ORB_RING.radius;

/** The liquid stays inside this circle, within the ring. */
export const ORB_LIQUID_RADIUS = 62;

/** The heartbeat line that crosses the orb. */
export const ORB_BEAT_PATH = 'M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58';

/** Length of the beat line: its six segments added up (223.3), rounded up. */
export const ORB_BEAT_LENGTH = 224;
export const ORB_BEAT_STROKE = 8;
export const ORB_BEAT_OUTLINE_STROKE = 15;

/** The liquid's surface: a wave 80 units long and 12 deep, at height 18. */
export const ORB_WAVE = { period: 80, depth: 12, surfaceY: 18 } as const;

/** How far the liquid goes down to be hidden under the ring. */
export const ORB_LIQUID_HIDDEN_DROP = 70;

export const ORB_COLORS = {
  ringFrom: '#8B3DF0',
  ringTo: '#0AE8F0',
  liquidFrom: '#B58BFF',
  liquidTo: '#7FE9F2',
} as const;

/** dark: for a dark background, white beat. light: dark violet beat outlined in white. */
export type OrbVariant = 'dark' | 'light';

export const ORB_VARIANTS: Record<OrbVariant, { beat: string; beatOutline: string | null; liquidOpacity: number }> = {
  dark: { beat: '#FFFFFF', beatOutline: null, liquidOpacity: 0.9 },
  light: { beat: '#3B2A78', beatOutline: '#FFFFFF', liquidOpacity: 1 },
};

/**
 * The liquid's outline. `drop` moves it down (0 = in place, ORB_LIQUID_HIDDEN_DROP = hidden),
 * `slide` moves the wave to the right (one period, 80, gives the same shape again).
 * At (0, 0) it is the drawing of the logo. Also runs on the animation thread ('worklet').
 */
export function orbWavePath(drop = 0, slide = 0): string {
  'worklet';
  const half = ORB_WAVE.period / 2;
  // The logo's wave starts at -70: one period further left, it still covers the orb once slid by 80
  const x0 = slide - 70 - ORB_WAVE.period;
  const y = ORB_WAVE.surfaceY + drop;
  let d = `M${x0} ${y} Q${x0 + half / 2} ${y - ORB_WAVE.depth} ${x0 + half} ${y}`;
  for (let step = 2; step <= 8; step += 1) d += ` T${x0 + half * step} ${y}`;
  return `${d} V${80 + drop} H${x0} Z`;
}
