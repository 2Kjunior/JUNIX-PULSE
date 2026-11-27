/**
 * Draws the notification icon of Junix Pulse (sheet 036): the orb and its pulse line in white on a
 * transparent background, as in assets/logo/orbe-notification.svg, at every size Android asks.
 *
 * Why not Edge (scripts/logo/generer-icones.js)? Edge does not open a window as small as 96 pixels:
 * the drawing was centred in a larger window and the 96-pixel crop kept only the empty corner. The
 * notification icon came out fully transparent, and the circle of every notification stayed empty.
 *
 * Pure Node (zlib for the PNG, nothing to install). Each pixel is cut into 8 x 8 points: the share
 * of points inside the drawing gives its opacity, for smooth edges.
 *
 * Usage, from the project folder: node scripts/logo/icone-notification.js
 * It writes assets/images/notification-icon.png (96 x 96, read by expo-notifications at the next
 * prebuild) and, if the android folder exists, the five sizes in android/app/src/main/res.
 */
/* global __dirname */
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..', '..');

// The drawing, in the units of the SVG (viewBox 96 x 96, then translate(48 48) scale(0.5))
const SCALE = 0.5;
const RING_RADIUS = 78;
const STROKE = 16;
const PULSE = [[-58, 6], [-26, 6], [-16, -26], [-2, 34], [10, -6], [18, 6], [58, 6]];

/** Distance from a point to a segment. */
function toSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Whether a point of the drawing (local units) is painted: the ring, or the pulse line (round ends). */
function painted(x, y) {
  if (Math.abs(Math.hypot(x, y) - RING_RADIUS) <= STROKE / 2) return true;
  for (let i = 0; i < PULSE.length - 1; i++) {
    if (toSegment(x, y, PULSE[i], PULSE[i + 1]) <= STROKE / 2) return true;
  }
  return false;
}

/** The icon at a size, as RGBA pixels: white, the opacity from the share of the pixel painted. */
function draw(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const SUB = 8;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let inside = 0;
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          // The point in the 96-unit square of the SVG, then in the local units of the drawing
          const u = ((px + (sx + 0.5) / SUB) * 96) / size;
          const v = ((py + (sy + 0.5) / SUB) * 96) / size;
          if (painted((u - 48) / SCALE, (v - 48) / SCALE)) inside++;
        }
      }
      const at = (py * size + px) * 4;
      pixels[at] = 255;
      pixels[at + 1] = 255;
      pixels[at + 2] = 255;
      pixels[at + 3] = Math.round((inside / (SUB * SUB)) * 255);
    }
  }
  return pixels;
}

// ─── PNG ───────────────────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits per channel
  header[9] = 6; // RGBA
  // Each row starts with its filter: 0, none
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── The files ─────────────────────────────────────────────────────────────────

function write(file, size) {
  const pixels = draw(size);
  let visible = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) visible++;
  if (visible === 0) throw new Error(`${file}: icône vide`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png(size, pixels));
  console.log(`${path.relative(ROOT, file)} (${size} x ${size}, ${visible} pixels visibles)`);
}

write(path.join(ROOT, 'assets/images/notification-icon.png'), 96);

// The sizes expo-notifications makes at a prebuild, for each screen density
const RES = path.join(ROOT, 'android/app/src/main/res');
if (fs.existsSync(RES)) {
  for (const [density, size] of [['mdpi', 24], ['hdpi', 36], ['xhdpi', 48], ['xxhdpi', 72], ['xxxhdpi', 96]]) {
    write(path.join(RES, `drawable-${density}`, 'notification_icon.png'), size);
  }
}
