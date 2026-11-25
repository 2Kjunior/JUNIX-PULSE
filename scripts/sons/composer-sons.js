/**
 * Composes the sounds of Junix Pulse (study 001, 6-D and 16.7; chantier n° 9-A).
 *
 * Every sound is made here, by calculation: no recording, no library, nothing borrowed, so they
 * belong to Junix and are free of rights. They share the family of the sound already in the app:
 * a low beat, like a heart, then a clear bell on D, F sharp and A (the notes of the Junix chime).
 * The same command always gives the same files, to the byte.
 *
 * Usage, from the project folder:
 *   node scripts/sons/composer-sons.js <folder>
 * writes into <folder>: junix_soft.wav, junix_festive.wav, junix_sober.wav, junix_alarm.wav
 * (44 100 Hz, mono, 16 bits, as Android plays them in a notification).
 */
const fs = require('fs');
const path = require('path');

const RATE = 44100;

/** A sound under construction: an array of samples between -1 and 1. */
function blank(seconds) {
  return new Float64Array(Math.round(seconds * RATE));
}

/**
 * A bell: a few partials that ring and fade, the higher ones faster, with an attack of 4 ms so it
 * never clicks. Ratios close to a real bell give it its shine; `bright` keeps more of the high ones.
 */
function bell(out, frequency, at, { length = 1.2, amplitude = 0.5, decay = 3.2, bright = 1 } = {}) {
  const partials = [
    [1, 1],
    [2, 0.45 * bright],
    [2.76, 0.25 * bright],
    [5.4, 0.12 * bright],
  ];
  const start = Math.round(at * RATE);
  const count = Math.round(length * RATE);
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.004);
    let sample = 0;
    for (const [ratio, weight] of partials) {
      sample += weight * Math.sin(2 * Math.PI * frequency * ratio * t) * Math.exp(-t * decay * (0.7 + ratio * 0.3));
    }
    out[start + i] += amplitude * attack * sample;
  }
}

/** The beat: a low sine whose pitch falls from 110 to 55 Hz in a tenth of a second, like a heart. */
function beat(out, at, { amplitude = 0.7, length = 0.22 } = {}) {
  const start = Math.round(at * RATE);
  const count = Math.round(length * RATE);
  let phase = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / RATE;
    const frequency = 55 + 55 * Math.exp(-t / 0.04);
    phase += (2 * Math.PI * frequency) / RATE;
    const attack = Math.min(1, t / 0.003);
    out[start + i] += amplitude * attack * Math.sin(phase) * Math.exp(-t / 0.06);
  }
}

/** A little room around the sound: two short echoes, quiet, so it does not sound flat. */
function room(samples, mix = 0.14) {
  const out = Float64Array.from(samples);
  for (const [delay, gain] of [
    [0.043, mix],
    [0.071, mix * 0.7],
    [0.113, mix * 0.45],
  ]) {
    const d = Math.round(delay * RATE);
    for (let i = d; i < out.length; i++) out[i] += samples[i - d] * gain;
  }
  return out;
}

/** Brings the loudest sample to `peak`, and fades the last 30 ms so the end never clicks. */
function finish(samples, peak) {
  const max = samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0) || 1;
  const fade = Math.round(0.03 * RATE);
  return samples.map((s, i) => {
    const tail = i > samples.length - fade ? (samples.length - i) / fade : 1;
    return (s / max) * peak * tail;
  });
}

/** A WAV file: 44 100 Hz, mono, 16 bits. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// The notes of the Junix chime (Hz)
const D4 = 293.66;
const A4 = 440;
const D5 = 587.33;
const D6 = 1174.66;
const FS6 = 1479.98;
const A6 = 1760;
const D7 = 2349.32;

const SOUNDS = {
  /** Discreet: one soft note, short and quiet. */
  junix_soft: () => {
    const s = blank(0.9);
    bell(s, D6, 0.01, { length: 0.85, amplitude: 0.5, decay: 4.5, bright: 0.5 });
    return finish(room(s, 0.1), 0.42);
  },
  /** Festive (birthday, party): the beat, then the chime climbing D, F sharp, A, D. */
  junix_festive: () => {
    const s = blank(1.6);
    beat(s, 0.0, { amplitude: 0.55 });
    [D6, FS6, A6, D7].forEach((note, i) => bell(s, note, 0.16 + i * 0.09, { length: 1.2, amplitude: 0.42, decay: 3, bright: 1.1 }));
    return finish(room(s), 0.85);
  },
  /** Sober (mourning, ceremony): a soft beat and two low, slow notes, no shine. */
  junix_sober: () => {
    const s = blank(2.0);
    beat(s, 0.0, { amplitude: 0.35, length: 0.3 });
    bell(s, A4, 0.2, { length: 1.6, amplitude: 0.5, decay: 1.8, bright: 0.3 });
    bell(s, D4, 0.75, { length: 1.2, amplitude: 0.5, decay: 1.8, bright: 0.3 });
    return finish(room(s, 0.18), 0.6);
  },
  /**
   * Alarm: two heartbeats and a high call, twice, in exactly 2 seconds, so it can be repeated
   * without a seam (chantier 9-B). Loud and clear, still in the family.
   */
  junix_alarm: () => {
    const s = blank(2.0);
    for (const at of [0, 1.0]) {
      beat(s, at, { amplitude: 0.8 });
      beat(s, at + 0.18, { amplitude: 0.6 });
      bell(s, D6, at + 0.36, { length: 0.5, amplitude: 0.5, decay: 5, bright: 1.2 });
      bell(s, A6, at + 0.5, { length: 0.45, amplitude: 0.5, decay: 5, bright: 1.2 });
    }
    return finish(s, 0.92);
  },
  /**
   * Wake-up: a longer alarm that wakes without harshness. Eight seconds at 120 beats a minute: a
   * heartbeat on each beat, a soft bass on the chord, and a chime melody that climbs through
   * D, E, F sharp, then A, and comes back to D: it loops without a seam until "Arrêter" (9-B).
   */
  junix_wake: () => {
    const beatLength = 0.5; // 120 beats a minute
    const eighth = beatLength / 2;
    const s = blank(8.0);
    const E6 = 1318.51;
    const G6 = 1567.98;
    const B6 = 1975.53;
    const CS7 = 2217.46;
    const FS7 = 2959.96;
    const E7 = 2637.02;
    const bars = [
      { bass: 146.83, melody: [D6, FS6, A6, FS6, D6, FS6, A6, D7] },
      { bass: 164.81, melody: [E6, G6, B6, G6, E6, G6, B6, E7] },
      { bass: 185.0, melody: [FS6, A6, D7, A6, FS6, A6, D7, FS7] },
      { bass: 110.0, melody: [E6, A6, CS7, A6, E6, A6, CS7, A6] },
    ];
    bars.forEach((bar, b) => {
      const barStart = b * 4 * beatLength;
      for (let k = 0; k < 4; k++) {
        const at = barStart + k * beatLength;
        // The heart: stronger on the first beat of the bar, with its echo just after
        beat(s, at, { amplitude: k === 0 ? 0.75 : 0.5 });
        if (k === 0) beat(s, at + 0.16, { amplitude: 0.45 });
        // A soft bass on the chord, to carry the melody
        bell(s, bar.bass, at, { length: 0.45, amplitude: 0.22, decay: 4, bright: 0.2 });
      }
      bar.melody.forEach((note, i) => {
        // The last note of each bar a little louder: it pulls to the next one
        bell(s, note, barStart + i * eighth, { length: 0.4, amplitude: i === 7 ? 0.36 : 0.3, decay: 5.5, bright: 0.9 });
      });
    });
    return finish(room(s, 0.1), 0.9);
  },
  /** Crystal (normal, to choose): two clear notes, A then D, light and bright, no beat. */
  junix_crystal: () => {
    const s = blank(1.3);
    bell(s, A6, 0.01, { length: 1.0, amplitude: 0.5, decay: 3.4, bright: 1.3 });
    bell(s, D7, 0.17, { length: 1.1, amplitude: 0.5, decay: 3.0, bright: 1.3 });
    return finish(room(s, 0.16), 0.8);
  },
  /** Drop (normal, to choose): a round note that falls a little, like a drop of water, short. */
  junix_drop: () => {
    const s = blank(0.7);
    const start = 0;
    let phase = 0;
    for (let i = 0; i < s.length; i++) {
      const t = i / RATE;
      const frequency = 700 + 600 * Math.exp(-t / 0.035);
      phase += (2 * Math.PI * frequency) / RATE;
      const attack = Math.min(1, t / 0.003);
      s[start + i] += 0.7 * attack * Math.sin(phase) * Math.exp(-t / 0.09);
    }
    bell(s, D6, 0.05, { length: 0.6, amplitude: 0.22, decay: 6, bright: 0.6 });
    return finish(room(s, 0.12), 0.75);
  },
  /**
   * Dawn (alarm, to choose): a gentle wake-up. Eight seconds at 80 beats a minute: a slow chime
   * that climbs D, F sharp, A, D and back, over a soft low note and a light heartbeat. Calm, but it
   * does not stop: it loops without a seam until "Arrêter".
   */
  junix_dawn: () => {
    const beatLength = 60 / 80;
    const s = blank(beatLength * 10.666);
    const melody = [D6, FS6, A6, D7, A6, FS6, A6, D7, FS6, A6, D6, A6];
    melody.forEach((note, i) => bell(s, note, i * (beatLength / 1.5), { length: 1.0, amplitude: 0.3, decay: 2.6, bright: 0.7 }));
    for (let k = 0; k < 10; k++) {
      beat(s, k * beatLength, { amplitude: 0.35, length: 0.25 });
      bell(s, k % 4 < 2 ? D4 : A4 / 2, k * beatLength, { length: 0.9, amplitude: 0.18, decay: 2.2, bright: 0.2 });
    }
    return finish(room(s, 0.2), 0.8);
  },
  /**
   * March (alarm, to choose): lively and rhythmic. Four seconds at 140 beats a minute: the
   * heartbeat on each beat, short chime notes in a marching rhythm (two shorts, one long), and a
   * call at the end of each phrase that pulls back to the start.
   */
  junix_march: () => {
    const beatLength = 60 / 140;
    const sixteenth = beatLength / 4;
    const E6 = 1318.51;
    const B6 = 1975.53;
    const s = blank(beatLength * 8 + 0.0);
    const phrase = [
      [D6, 0], [D6, 2], [A6, 4], [FS6, 8], [D6, 10], [A6, 12],
      [E6, 16], [E6, 18], [B6, 20], [A6, 24], [FS6, 26], [D7, 28],
    ];
    for (const [note, step] of phrase) {
      bell(s, note, step * sixteenth, { length: 0.35, amplitude: step % 4 === 0 ? 0.36 : 0.3, decay: 7, bright: 1.1 });
    }
    for (let k = 0; k < 8; k++) beat(s, k * beatLength, { amplitude: k % 2 === 0 ? 0.7 : 0.5, length: 0.18 });
    return finish(room(s, 0.08), 0.92);
  },
};

const folder = path.resolve(process.argv[2] || 'assets/sounds');
fs.mkdirSync(folder, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const file = path.join(folder, `${name}.wav`);
  const samples = make();
  fs.writeFileSync(file, wav(samples));
  console.log(`${name}.wav  ${(samples.length / RATE).toFixed(2)} s`);
}
