# FICHE OPÉRATOIRE N° 036 — L'icône des notifications, enfin visible

Projet : **Junix Pulse** · Date : 27 novembre 2026 · Suite de : [FICHE 035](FICHE-035-la-page-de-l-alarme.md)

---

## 1. Objectif

Ta capture de l'APK de la fiche 035 : la notification de l'alarme « Dormir » a bien son **cercle violet**, mais **rien dedans**. La fiche 035 avait donné la couleur ; le défaut était ailleurs.

**La cause** : l'image de l'icône des notifications (`assets/images/notification-icon.png`, et ses copies pour Android) était **entièrement transparente** : 0 pixel visible sur 9216. Le dessin (`assets/logo/orbe-notification.svg`) est juste ; c'est sa conversion en image qui ratait. Le script des icônes (fiche 009) photographie chaque dessin avec Edge dans une fenêtre de la taille de l'image ; mais Edge n'ouvre pas de fenêtre aussi petite que 96 pixels : le dessin, centré dans une fenêtre plus grande, tombait hors du coin de 96 pixels gardé. Les grandes icônes (1024 pixels) n'étaient pas touchées.

Ce défaut touchait **toutes** les notifications de Junix depuis la fiche 009, pas seulement l'alarme.

| Avant | Après |
|---|---|
| un cercle violet vide | l'**orbe et sa ligne de pouls** en blanc dans le cercle violet |
| une icône faite par Edge, vide à 96 px | une icône dessinée par un petit programme Node, nette de 24 à 96 px, qui refuse d'écrire une image vide |

![L'icône sur le violet de Junix](images/fiche-036-icone.png)

*Figure 36-1 — L'icône produite (96 px), posée sur le violet des notifications de Junix, agrandie 4 fois.*

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| La fiche 035 est enregistrée | `git log --oneline -1` | `feat(alarm): the alarm page over the locked screen…` |

## 3. Matériel

Rien à installer : Node et son `zlib`.

## 4. Hypothèses

- Android demande cinq tailles (24, 36, 48, 72 et 96 px) : ce sont celles que fabrique `expo-notifications` au `prebuild`, relevées dans le dossier `android`.
- Une icône de notification Android est une silhouette blanche : Android la colore lui-même (violet de Junix, fiche 035).

## 5. Carte de l'intervention

| Fichier | Action |
|---|---|
| `scripts/logo/icone-notification.js` | **nouveau** : dessine l'icône et l'écrit en PNG |
| `assets/images/notification-icon.png` | refaite par ce programme (et ses cinq tailles dans `android/…/res`) |
| `scripts/logo/generer-icones.js` | ne fait plus cette icône |

## 6. Sauvegarde

`git status` propre (hors `docs/motion/`). Aucune donnée touchée.

## 7. Pas à pas

Le plus simple : `node docs/fiches/outils/appliquer-fiche-036.js .` écrit les blocs ci-dessous et dessine l'icône.

### Étape 1 — Dessiner l'icône, sans Edge

**Pourquoi** : Un petit programme Node dessine l'orbe et sa ligne de pouls (le même dessin que `assets/logo/orbe-notification.svg`) en blanc sur fond transparent. Chaque pixel est découpé en 8 × 8 points : la part des points dans le dessin donne son opacité, pour des bords lisses. Il écrit le PNG lui-même (`zlib`, déjà dans Node), à la taille de l'icône de l'appli (96 px) et aux cinq tailles d'Android (24 à 96 px). Il refuse d'écrire une icône vide.

#### `scripts/logo/icone-notification.js`

Fichier nouveau, en entier :

<!-- bloc: new-icone-notification -->

```js
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
```

Lancer : `node scripts/logo/icone-notification.js`. Chaque ligne affichée donne la taille et le nombre de pixels visibles (par exemple 3116 à 96 px).

### Étape 2 — Le script des icônes ne la refait plus vide

**Pourquoi** : Le script des autres icônes (`generer-icones.js`) faisait aussi celle-ci avec Edge : il l'aurait refaite vide à son prochain lancement. Elle en sort, avec une note qui renvoie au nouveau programme.

#### `scripts/logo/generer-icones.js`


Changement 1 sur 1. Chercher :

<!-- bloc: generer-icones-1-avant -->

```js
  ['assets/logo/orbe-icone.svg', 'assets/images/icon.png', 1024],
  ['assets/logo/orbe-android-avant-plan.svg', 'assets/images/android-icon-foreground.png', 1024],
  ['assets/logo/orbe-une-couleur.svg', 'assets/images/android-icon-monochrome.png', 1024],
  ['assets/logo/orbe-notification.svg', 'assets/images/notification-icon.png', 96],
  ['assets/logo/orbe-demarrage.svg', 'assets/images/splash-icon.png', 1024],
  ['assets/logo/orbe-icone.svg', 'assets/images/favicon.png', 48],
];
```

Remplacer par :

<!-- bloc: generer-icones-1-apres -->

```js
  ['assets/logo/orbe-icone.svg', 'assets/images/icon.png', 1024],
  ['assets/logo/orbe-android-avant-plan.svg', 'assets/images/android-icon-foreground.png', 1024],
  ['assets/logo/orbe-une-couleur.svg', 'assets/images/android-icon-monochrome.png', 1024],
  // The notification icon is no longer made here (sheet 036): Edge does not open a 96-pixel window, and
  // the icon came out empty. scripts/logo/icone-notification.js draws it, at every size of Android.
  ['assets/logo/orbe-demarrage.svg', 'assets/images/splash-icon.png', 1024],
  ['assets/logo/orbe-icone.svg', 'assets/images/favicon.png', 48],
];
```


## 8. Test final

| Contrôle | Résultat attendu |
|---|---|
| `node scripts/logo/icone-notification.js` | six lignes, chacune avec des pixels visibles (3116 à 96 px, 270 à 24 px) |
| L'image posée sur le violet (figure 36-1) | l'orbe et sa ligne de pouls, nets |
| APK, puis une notification de Junix sur le téléphone | le logo blanc dans le cercle violet (alarme, rappel, récap du jour…) |

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Le cercle de la notification reste vide après l'APK | l'ancien APK est installé, ou le dossier `android` a été refait sans relancer le programme | relancer `node scripts/logo/icone-notification.js` (ou `npx expo prebuild`, qui reprend l'image de `assets`), refaire l'APK |
| `icône vide` en lançant le programme | le dessin a été modifié et ne tombe plus dans le carré | revoir les nombres du dessin en tête du programme |

## 10. Retour en arrière

`git checkout -- scripts/logo/generer-icones.js assets/images/notification-icon.png` et supprimer `scripts/logo/icone-notification.js` : l'icône redevient vide, comme avant.

## 11. Lexique

| Mot | En une phrase |
|---|---|
| Icône de notification | une silhouette blanche sur fond transparent ; Android la pose dans un cercle de la couleur de l'appli |
| Pixel transparent | un pixel d'opacité nulle : il ne montre rien |
| Densités d'écran | les tailles d'une même image pour les écrans plus ou moins fins (mdpi à xxxhdpi) |

## 12. Et après

1. APK et essai sur le téléphone : une alarme, un rappel ordinaire.
2. Chantier n° 9, fin : **9-C**, les sonneries et musiques du téléphone comme sons d'alarme.

## Compte rendu d'exécution (27 novembre 2026)

- Fait après ta capture de l'APK de la fiche 035 (cercle violet vide). Mesuré : l'image source et sa copie Android avaient **0 pixel visible** sur 9216 ; le dessin SVG, lui, est juste.
- Appliquée à partir des blocs de cette fiche (`appliquer-fiche-036.js`), puis rejouée sur une copie propre : les scripts sont identiques, et l'icône produite aussi, octet pour octet (le dessin ne tire rien au hasard).
- Vérifié à l'œil : l'icône posée sur le violet, à 96 et à 24 pixels (figure 36-1).
- Écart corrigé : `Buffer` importé explicitement (`eslint` le demandait).
- **Pas vérifié** : l'icône dans une vraie notification du téléphone. Rien n'est encore enregistré dans git.
