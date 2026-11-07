/**
 * Pulse drawn for the home screen widget: the same glass orb, liquid, ring and faces as the
 * mascot of the app (PulseMascot, MascotFace), as one still SVG, since a widget cannot animate.
 */

import type { MascotMood } from '@/domain/rules/mascot-mood-rules';
import { MASCOT_LIQUID, MASCOT_ORB, MASCOT_VIEWBOX, MOOD_VISUALS } from '@/features/mascot/mascot-visuals';

const INK = '#1A1040';
const EYES = [66, 94] as const;
const EYE_Y = 53;

function eye(x: number, mood: MascotMood): string {
  const y = EYE_Y;
  switch (mood) {
    case 'happy':
    case 'party':
      return `<path d="M${x - 6} ${y + 3} Q${x} ${y - 8} ${x + 6} ${y + 3}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
    case 'sleepy':
      return `<path d="M${x - 6} ${y - 1} Q${x} ${y + 6} ${x + 6} ${y - 1}" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
    case 'focused':
      return `<path d="M${x - 6} ${y + 1} L${x + 6} ${y + 1}" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
    case 'alert':
      return `<circle cx="${x}" cy="${y}" r="7" fill="#FFFFFF" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y + 1}" r="3.2" fill="${INK}"/>`;
    case 'worried': {
      const inward = x < 80 ? 1 : -1;
      return `<circle cx="${x}" cy="${y + 1}" r="3.6" fill="${INK}"/><path d="M${x - 6 * inward} ${y - 6} L${x + 5 * inward} ${y - 10}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    case 'calm':
      return `<rect x="${x - 3}" y="${y - 5}" width="6" height="10" rx="3" fill="${INK}"/>`;
  }
}

function mouth(mood: MascotMood): string {
  const cheeks = `<circle cx="55" cy="66" r="5" fill="#ff7aa8" opacity="0.38"/><circle cx="105" cy="66" r="5" fill="#ff7aa8" opacity="0.38"/>`;
  switch (mood) {
    case 'happy':
      return `${cheeks}<path d="M60 70 Q80 86 100 70" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
    case 'party':
      return `${cheeks}<path d="M56 68 Q80 96 104 68 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
    case 'sleepy':
      return `<path d="M60 74 H100" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/><text x="104" y="38" font-weight="800" font-size="11" fill="#6a5bb5">z</text><text x="111" y="29" font-weight="800" font-size="8.5" fill="#6a5bb5" opacity="0.8">z</text>`;
    case 'alert':
      return `<path d="M56 74 l7 -9 l6 15 l6 -17 l6 17 l6 -15 l7 9" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'worried':
      return `<path d="M62 76 q4.5 -4 9 0 t9 0 t9 0 t9 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M110 30 q4.5 6.5 0 9.5 q-4.5 -3 0 -9.5Z" fill="#7fd3ff" opacity="0.9"/>`;
    case 'focused':
    case 'calm':
      return `<path d="M58 74 H70 l3 -6 l4 11 l4 -9 l3 4 H102" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

/** The SVG text of Pulse in this mood, ready for SvgWidget. */
export function widgetMascotSvg(mood: MascotMood): string {
  const visual = MOOD_VISUALS[mood];
  const { cx, cy, radius, haloRadius, clipRadius } = MASCOT_ORB;
  const wave = `M${MASCOT_LIQUID.pathStartX} ${MASCOT_LIQUID.surfaceY} q15 -9 30 0${' t30 0'.repeat(8)} V130 H${MASCOT_LIQUID.pathStartX}Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MASCOT_VIEWBOX.minX} ${MASCOT_VIEWBOX.minY} ${MASCOT_VIEWBOX.width} ${MASCOT_VIEWBOX.height}">
<defs>
<radialGradient id="h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${visual.ring[1]}" stop-opacity="0.38"/><stop offset="0.6" stop-color="${visual.ring[0]}" stop-opacity="0.16"/><stop offset="1" stop-color="${visual.ring[0]}" stop-opacity="0"/></radialGradient>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.78"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.3"/><stop offset="1" stop-color="${visual.liquid[0]}" stop-opacity="0.3"/></linearGradient>
<linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${visual.liquid[0]}" stop-opacity="0.78"/><stop offset="1" stop-color="${visual.liquid[1]}" stop-opacity="0.92"/></linearGradient>
<linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${visual.ring[0]}"/><stop offset="1" stop-color="${visual.ring[1]}"/></linearGradient>
<radialGradient id="s" cx="35%" cy="25%" r="60%"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<clipPath id="c"><circle cx="${cx}" cy="${cy}" r="${clipRadius}"/></clipPath>
</defs>
<circle cx="${cx}" cy="${cy}" r="${haloRadius}" fill="url(#h)"/>
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#b)"/>
<path d="${wave}" fill="url(#l)" clip-path="url(#c)"/>
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="url(#r)" stroke-width="4"/>
<ellipse cx="${cx - 16}" cy="${cy - 24}" rx="16" ry="9" fill="url(#s)"/>
${eye(EYES[0], mood)}${eye(EYES[1], mood)}${mouth(mood)}
</svg>`;
}
