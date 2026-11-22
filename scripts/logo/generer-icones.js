/**
 * Fabrique les icônes PNG de Junix Pulse à partir des dessins SVG de assets/logo, avec Microsoft
 * Edge en mode sans fenêtre (aucune bibliothèque à installer). À relancer après chaque
 * modification d'un dessin : node scripts/logo/generer-icones.js
 */

/* global __dirname */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Edge est installé avec Windows ; un autre navigateur Chromium peut le remplacer (variable EDGE_PATH)
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = path.resolve(__dirname, '..', '..');

// [dessin source, image produite, taille en pixels]
const JOBS = [
  ['assets/logo/orbe-icone.svg', 'assets/images/icon.png', 1024],
  ['assets/logo/orbe-android-avant-plan.svg', 'assets/images/android-icon-foreground.png', 1024],
  ['assets/logo/orbe-une-couleur.svg', 'assets/images/android-icon-monochrome.png', 1024],
  ['assets/logo/orbe-notification.svg', 'assets/images/notification-icon.png', 96],
  ['assets/logo/orbe-demarrage.svg', 'assets/images/splash-icon.png', 1024],
  ['assets/logo/orbe-icone.svg', 'assets/images/favicon.png', 48],
];

if (!fs.existsSync(EDGE)) {
  throw new Error(`Edge introuvable : ${EDGE}. Indiquez un navigateur Chromium avec la variable EDGE_PATH.`);
}

// Un profil à part : sinon Edge, s'il est déjà ouvert, confie le travail à sa fenêtre et rend la main sans rien écrire
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'junix-icones-'));

/** Edge rend la main avant d'avoir écrit l'image : on l'attend, au plus 15 secondes. */
function waitForFile(file) {
  const until = Date.now() + 15000;
  while (!fs.existsSync(file) && Date.now() < until) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  return fs.existsSync(file);
}

for (const [source, output, size] of JOBS) {
  const url = `file:///${path.join(ROOT, source).replace(/\\/g, '/')}`;
  const target = path.join(ROOT, output);
  fs.rmSync(target, { force: true });
  execFileSync(
    EDGE,
    [
      '--headless=new',
      `--user-data-dir=${PROFILE}`,
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${target}`,
      url,
    ],
    { stdio: 'ignore' }
  );
  if (!waitForFile(target)) throw new Error(`Image non produite : ${output}`);
  console.log(`${output} (${size} x ${size})`);
}

// Edge garde parfois le profil quelques instants : un reste dans le dossier temporaire de Windows est sans conséquence
try {
  fs.rmSync(PROFILE, { recursive: true, force: true });
} catch {
  console.log(`(profil temporaire laissé dans ${PROFILE})`);
}
