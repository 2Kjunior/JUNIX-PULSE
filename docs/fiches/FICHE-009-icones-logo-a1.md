# FICHE OPÉRATOIRE N° 009 — Les icônes du logo A1 (l'orbe)

Projet : **Junix Pulse** · Date : 22 novembre 2026 · Suite de : [FICHE 008](FICHE-008-deux-familles.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), sections 12.7 et 12.10 (chantier n° 1) · Dessin validé : [logo-A1-final.svg](../etudes/images/logo-A1-final.svg)

---

## 1. Objectif

Remplacer l'ancien logo (le « P » avec le nom écrit dans l'icône) par **l'orbe A1** partout où Android et le web montrent une icône :

| Image | Où on la voit | Version |
|---|---|---|
| `assets/images/icon.png` (1024 × 1024) | icône générale, aperçu du widget, partage | fond sombre |
| `assets/images/android-icon-foreground.png` (1024 × 1024) | icône Android « adaptative » (Android découpe la forme : rond, carré arrondi…) | orbe sur fond transparent, fond sombre fourni par la couleur `#141317` |
| `assets/images/android-icon-monochrome.png` (1024 × 1024) | icônes **à thème** d'Android 13+ (une seule couleur, choisie par le téléphone) | vague pleine, battement découpé |
| `assets/images/notification-icon.png` (96 × 96, **nouveau**) | petite icône dans la barre des notifications | silhouette blanche (anneau + battement) |
| `assets/images/splash-icon.png` (1024 × 1024) | écran de démarrage du système | orbe pour fond clair (battement détouré de blanc) |
| `assets/images/favicon.png` (48 × 48) | onglet du navigateur (aperçu web) | fond sombre |

Les dessins sources sont gardés dans `assets/logo/` (fichiers SVG, modifiables), et un script refabrique toutes les images en une commande.

**Ce qui ne change pas encore** : l'animation de lancement de l'appli et le composant `PulseLogo` (onboarding, onglet Pulse, Sanctuaire). Ils seront refaits dans la fiche suivante. L'écran de démarrage du système **reste blanc** pour l'instant, parce que l'animation de lancement est elle-même sur fond blanc (`SPLASH_COLORS.background = "#FFFFFF"`) : le passer au sombre maintenant ferait un flash sombre puis blanc. Les deux passeront au sombre ensemble.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| Edge est installé | Explorateur › `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | Le fichier existe |
| Le projet est propre | `git status --short` | Seulement `?? docs/motion/` et les documents d'étude en cours |

## 3. Matériel

| Outil | Preuve | Sinon |
|---|---|---|
| Microsoft Edge (installé avec Windows) | le fichier ci-dessus | Installer Edge, ou mettre le chemin d'un Chrome dans la variable `EDGE_PATH` |
| Node.js | `node --version` | nodejs.org |

Aucune bibliothèque ajoutée au projet : la conversion SVG → PNG est faite par Edge en mode « sans fenêtre » (headless).

## 4. Hypothèses

- Windows, Git Bash ou PowerShell, dossier `C:\Users\simon\Desktop\Projets\junix-pulse-glowcard`.
- Les icônes Android ne changent sur le téléphone qu'après un **prebuild** et un **nouvel APK** (fiche 003, étapes 1 à 3).

## 5. Carte de l'intervention

| Fichier | Action | Raison |
|---|---|---|
| `assets/logo/orbe-icone.svg` | **créé** | Source : icône sur fond sombre |
| `assets/logo/orbe-android-avant-plan.svg` | **créé** | Source : avant-plan de l'icône adaptative |
| `assets/logo/orbe-une-couleur.svg` | **créé** | Source : icône à thème |
| `assets/logo/orbe-notification.svg` | **créé** | Source : icône de notification |
| `assets/logo/orbe-demarrage.svg` | **créé** | Source : écran de démarrage (fond clair) |
| `scripts/logo/generer-icones.js` | **créé** | Fabrique les PNG à partir des SVG |
| `assets/images/*.png` (6 fichiers) | **remplacés / créé** | Les icônes fabriquées |
| `app.json` | modifié | Icône une couleur, icône de notification, image de démarrage |
| `src/__tests__/app-icons.test.ts` | **créé** | Vérifie que chaque icône existe, à la bonne taille |

## 6. Sauvegarde

Les anciennes images sont dans Git (dernier commit `dc6cf03`). Pour les retrouver :

```bash
git restore assets/images/icon.png assets/images/android-icon-foreground.png assets/images/android-icon-monochrome.png assets/images/splash-icon.png assets/images/favicon.png app.json
```

> ⚠ **Point de non-retour** : `git restore` efface les modifications non commitées de ces fichiers. Le fichier `notification-icon.png` est nouveau : supprimez-le à la main si vous revenez en arrière.

## 7. Étapes

### Étape 1 — Les cinq dessins sources

- **Où** : explorateur de VS Code › dossier `assets` › clic droit › Nouveau dossier › `logo`. Puis, dans `logo`, un nouveau fichier par bloc ci-dessous (Ctrl+S après chaque collage).

Tous les dessins partagent la même géométrie, en « unités d'orbe » centrées sur 0 : anneau de rayon 78, intérieur de rayon 62, la **vague** (`M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z`) et le **battement** (`M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58`). Seuls changent la taille (`scale`) et les couleurs.

**`assets/logo/orbe-icone.svg`**

<!-- bloc: orbe-icone -->
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 1024">
  <!-- Logo A1 de Junix Pulse : l'orbe sur fond sombre (icône générale) -->
  <defs>
    <linearGradient id="anneau" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#8B3DF0"/>
      <stop offset="1" stop-color="#0AE8F0"/>
    </linearGradient>
    <linearGradient id="liquide" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b58bff"/>
      <stop offset="1" stop-color="#7fe9f2"/>
    </linearGradient>
    <clipPath id="interieur"><circle r="62"/></clipPath>
  </defs>
  <rect width="1024" height="1024" fill="#141317"/>
  <g transform="translate(512 512) scale(3.9)">
    <circle r="78" fill="none" stroke="url(#anneau)" stroke-width="10"/>
    <g clip-path="url(#interieur)">
      <path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z" fill="url(#liquide)" opacity="0.9"/>
    </g>
    <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

| Morceau | Sens |
|---|---|
| `width="100%" height="100%" viewBox="0 0 1024 1024"` | Le dessin occupe toute la fenêtre, quelle que soit sa taille : le même fichier donne une icône de 1024 ou de 48 pixels |
| `linearGradient id="anneau"` | Le dégradé violet → cyan de l'anneau, en diagonale (du bas à gauche vers le haut à droite) |
| `linearGradient id="liquide"` | Le dégradé lavande → turquoise du liquide |
| `clipPath id="interieur"` | Un « pochoir » rond de rayon 62 : la vague ne dépasse jamais de l'orbe |
| `rect … fill="#141317"` | Le fond sombre de Junix |
| `transform="translate(512 512) scale(3.9)"` | Place le centre de l'orbe au milieu de l'image et l'agrandit 3,9 fois (anneau de 324 px de rayon) |
| `circle r="78" … stroke-width="10"` | L'anneau |
| `path d="M-70 18 Q…"` | La vague : une suite de courbes (`Q`, `T`) qui ferme une forme jusqu'en bas (`V80 H-70 Z`) |
| `path d="M-58 6 H-26 L…"` | Le battement : une ligne droite (`H`), un pic, un creux, un petit pic, puis une ligne droite ; bouts et angles arrondis (`round`) |

**`assets/logo/orbe-android-avant-plan.svg`** — la même orbe, **sans fond** et un peu plus petite (Android découpe l'icône : tout doit tenir dans le cercle central de 61 % de la largeur).

<!-- bloc: orbe-android -->
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 1024">
  <!-- Avant-plan de l'icône adaptative Android : le fond sombre vient de la couleur #141317 de app.json -->
  <defs>
    <linearGradient id="anneau" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#8B3DF0"/>
      <stop offset="1" stop-color="#0AE8F0"/>
    </linearGradient>
    <linearGradient id="liquide" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b58bff"/>
      <stop offset="1" stop-color="#7fe9f2"/>
    </linearGradient>
    <clipPath id="interieur"><circle r="62"/></clipPath>
  </defs>
  <g transform="translate(512 512) scale(3.5)">
    <circle r="78" fill="none" stroke="url(#anneau)" stroke-width="10"/>
    <g clip-path="url(#interieur)">
      <path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z" fill="url(#liquide)" opacity="0.9"/>
    </g>
    <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

**`assets/logo/orbe-une-couleur.svg`** — une seule couleur ; Android la teinte lui-même. Le battement est **découpé** (transparent) là où il traverse la vague, grâce à un **masque**.

<!-- bloc: orbe-une-couleur -->
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 1024">
  <!-- Icône à thème d'Android 13+ : une seule couleur, Android choisit la teinte -->
  <defs>
    <clipPath id="interieur"><circle r="62"/></clipPath>
    <clipPath id="vague"><path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z"/></clipPath>
    <mask id="forme" maskUnits="userSpaceOnUse" x="-100" y="-100" width="200" height="200">
      <circle r="78" fill="none" stroke="#ffffff" stroke-width="12"/>
      <g clip-path="url(#interieur)">
        <path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z" fill="#ffffff"/>
      </g>
      <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <g clip-path="url(#vague)">
        <g clip-path="url(#interieur)">
          <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#000000" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      </g>
    </mask>
  </defs>
  <g transform="translate(512 512) scale(3.5)">
    <rect x="-100" y="-100" width="200" height="200" fill="#000000" mask="url(#forme)"/>
  </g>
</svg>
```

| Morceau | Sens |
|---|---|
| `mask id="forme"` | Un **masque** : là où il est blanc, la forme est visible ; là où il est noir, elle est transparente |
| `circle … stroke="#ffffff"` | L'anneau, visible |
| vague `fill="#ffffff"` | La vague pleine, visible |
| battement `stroke="#ffffff"` | Le battement, visible au-dessus de la vague |
| battement `stroke="#000000"` dans `clip-path="url(#vague)"` | Le même battement, mais **noir** et seulement **dans la vague** : il y devient transparent, donc on le voit découpé |
| `rect … fill="#000000" mask="url(#forme)"` | Un carré de couleur unie dont on ne garde que la forme du masque |

**`assets/logo/orbe-notification.svg`** — 96 × 96, silhouette blanche, sans vague (illisible à cette taille).

<!-- bloc: orbe-notification -->
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 96 96">
  <!-- Icône de notification Android : silhouette blanche sur fond transparent -->
  <g transform="translate(48 48) scale(0.5)">
    <circle r="78" fill="none" stroke="#ffffff" stroke-width="16"/>
    <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

**`assets/logo/orbe-demarrage.svg`** — pour l'écran de démarrage, qui reste **blanc** dans cette fiche : la version « fond clair », battement violet foncé détouré de blanc.

<!-- bloc: orbe-demarrage -->
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 1024">
  <!-- Écran de démarrage (fond clair) : battement violet foncé, détouré de blanc pour se détacher du liquide -->
  <defs>
    <linearGradient id="anneau" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#8B3DF0"/>
      <stop offset="1" stop-color="#0AE8F0"/>
    </linearGradient>
    <linearGradient id="liquide" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b58bff"/>
      <stop offset="1" stop-color="#7fe9f2"/>
    </linearGradient>
    <clipPath id="interieur"><circle r="62"/></clipPath>
  </defs>
  <g transform="translate(512 512) scale(5.8)">
    <circle r="78" fill="none" stroke="url(#anneau)" stroke-width="10"/>
    <g clip-path="url(#interieur)">
      <path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z" fill="url(#liquide)"/>
    </g>
    <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#ffffff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#3B2A78" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

- **Contrôle** : chaque fichier s'ouvre dans le navigateur (glisser-déposer dans Edge) et montre l'orbe.
- **Si ça rate** : page blanche ou erreur XML → une balise mal fermée ; recopiez le bloc entier.

### Étape 2 — Le script qui fabrique les images

- **Où** : explorateur › dossier `scripts` › Nouveau dossier `logo` › Nouveau fichier `generer-icones.js`.

<!-- bloc: script -->
```js
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
```

| Ligne / bloc | Sens |
|---|---|
| `/* global __dirname */` | Dit au relecteur de code (eslint) que `__dirname`, fourni par Node, existe bien |
| `require('child_process')` | Permet de lancer un autre programme (Edge) depuis le script |
| `const EDGE = process.env.EDGE_PATH \|\| '…msedge.exe'` | Le chemin d'Edge, ou celui donné dans la variable `EDGE_PATH` |
| `const ROOT = path.resolve(__dirname, '..', '..')` | Le dossier du projet (deux niveaux au-dessus du script) |
| `const PROFILE = fs.mkdtempSync(…)` | Un dossier de profil Edge temporaire. Sans lui, si Edge est déjà ouvert, la commande confie le travail à la fenêtre ouverte et rend la main sans rien écrire |
| `function waitForFile(file)` | Edge rend la main **avant** d'avoir écrit l'image : on vérifie toutes les 200 ms, pendant 15 s au plus. `Atomics.wait` sert seulement à faire une pause sans occuper le processeur |
| `JOBS` | La liste des images : dessin source, fichier produit, taille |
| `if (!fs.existsSync(EDGE)) throw …` | Arrête tout avec un message clair si Edge n'est pas trouvé |
| `const url = \`file:///…\`` | L'adresse du dessin pour le navigateur, avec des `/` |
| `fs.rmSync(target, { force: true })` | Efface l'ancienne image, pour être sûr que la nouvelle vient bien de cette exécution |
| `--headless=new` | Edge sans fenêtre |
| `--user-data-dir=${PROFILE}` | Utilise le profil temporaire |
| `--force-device-scale-factor=1` | 1 pixel du dessin = 1 pixel de l'image (sinon l'écran agrandit tout) |
| `--default-background-color=00000000` | Fond **transparent** au lieu de blanc |
| `--window-size=${size},${size}` | Taille de la « fenêtre », donc de l'image |
| `--screenshot=${target}` | Enregistre la capture à cet endroit |
| `{ stdio: 'ignore' }` | Cache les messages internes d'Edge (dont un message d'erreur rouge sans conséquence) |
| `if (!waitForFile(target)) throw …` | Attend l'image ; si elle n'arrive pas, arrête tout avec un message |
| `try { fs.rmSync(PROFILE, …) } catch` | Efface le profil temporaire à la fin ; si Edge le tient encore, le laisse (sans conséquence) au lieu de s'arrêter en erreur |

### Étape 3 — Fabriquer les images

```bash
node scripts/logo/generer-icones.js
```

Sortie attendue (six lignes) :

```text
assets/images/icon.png (1024 x 1024)
assets/images/android-icon-foreground.png (1024 x 1024)
assets/images/android-icon-monochrome.png (1024 x 1024)
assets/images/notification-icon.png (96 x 96)
assets/images/splash-icon.png (1024 x 1024)
assets/images/favicon.png (48 x 48)
```

- **Contrôle** : ouvrez `assets/images/icon.png` dans VS Code : l'orbe sur fond sombre.
- **Si ça rate** : `Edge introuvable` → vérifiez le chemin (section 3) ; `Image non produite` → Edge n'a pas pu ouvrir le dessin : ouvrez le SVG dans Edge à la main pour voir l'erreur.

### Étape 4 — Brancher les icônes dans `app.json`

**4a — l'icône à thème.** Ctrl+F `"foregroundImage"`.

AVANT :

<!-- bloc: app-adaptive-avant -->
```json
      "adaptiveIcon": {
        "backgroundColor": "#141317",
        "foregroundImage": "./assets/images/android-icon-foreground.png"
      },
```

APRÈS :

<!-- bloc: app-adaptive-apres -->
```json
      "adaptiveIcon": {
        "backgroundColor": "#141317",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
```

**4b — l'image de démarrage.** Ctrl+F `"expo-splash-screen"`.

AVANT :

<!-- bloc: app-splash-avant -->
```json
        "expo-splash-screen",
        {
          "backgroundColor": "#FFFFFF",
          "dark": {
            "backgroundColor": "#FFFFFF"
          }
        }
```

APRÈS :

<!-- bloc: app-splash-apres -->
```json
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 160,
          "backgroundColor": "#FFFFFF",
          "dark": {
            "image": "./assets/images/splash-icon.png",
            "backgroundColor": "#FFFFFF"
          }
        }
```

**4c — l'icône de notification.** Ctrl+F `"expo-notifications"`.

AVANT :

<!-- bloc: app-notif-avant -->
```json
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
```

APRÈS :

<!-- bloc: app-notif-apres -->
```json
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
```

| Réglage | Sens |
|---|---|
| `"monochromeImage"` | L'icône d'une couleur qu'Android 13+ utilise quand le téléphone est réglé sur « icônes à thème » |
| `"image"`, `"imageWidth": 160` | L'orbe au centre de l'écran de démarrage, large de 160 points |
| `"backgroundColor": "#FFFFFF"` (inchangé) | Le fond reste blanc, comme l'animation de lancement qui suit (voir section 1) |
| `"icon": "./assets/images/notification-icon.png"` | La silhouette blanche dans la barre des notifications |

### Étape 5 — Le test des icônes

- **Où** : `src/__tests__/app-icons.test.ts` (nouveau fichier).

<!-- bloc: test -->
```ts
/**
 * The icons of the app: every image app.json names exists, at the size Android and the web
 * expect, and the ones drawn on top of something else keep a transparent background.
 */

// The project gives tests no Node types: like the splash test, these are declared and required
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

/** Width, height and whether the PNG has an alpha channel (colour type 4 or 6). */
function pngInfo(relative: string) {
  const bytes = fs.readFileSync(path.join(root, relative));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), alpha: bytes[25] === 4 || bytes[25] === 6 };
}

function pluginOptions(name: string): Record<string, unknown> {
  const plugin = appJson.expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === name);
  return plugin[1];
}

describe('app icons', () => {
  it('uses the orb everywhere, at the expected sizes', () => {
    const android = appJson.expo.android.adaptiveIcon;
    expect(pngInfo(appJson.expo.icon)).toMatchObject({ width: 1024, height: 1024 });
    expect(pngInfo(android.foregroundImage)).toMatchObject({ width: 1024, height: 1024, alpha: true });
    expect(pngInfo(android.monochromeImage)).toMatchObject({ width: 1024, height: 1024, alpha: true });
    expect(pngInfo(appJson.expo.web.favicon)).toMatchObject({ width: 48, height: 48 });
  });

  it('gives notifications a transparent silhouette, and the launch screen the orb', () => {
    expect(pngInfo(pluginOptions('expo-notifications').icon as string)).toEqual({ width: 96, height: 96, alpha: true });
    const splash = pluginOptions('expo-splash-screen');
    expect(pngInfo(splash.image as string)).toMatchObject({ width: 1024, height: 1024, alpha: true });
  });

  it('keeps the drawings the images are made from', () => {
    for (const source of ['orbe-icone', 'orbe-android-avant-plan', 'orbe-une-couleur', 'orbe-notification', 'orbe-demarrage']) {
      expect(fs.existsSync(path.join(root, 'assets', 'logo', `${source}.svg`))).toBe(true);
    }
  });
});
```

| Bloc | Sens |
|---|---|
| `declare const __dirname` et `require('fs')` | Le projet ne charge pas les types de Node pour les tests : on déclare `__dirname` et on charge `fs` et `path` avec `require`, comme le test de l'écran de lancement (`splash-and-logo.test.tsx`) |
| `pngInfo` | Lit l'en-tête d'un PNG : la largeur (octets 16 à 19), la hauteur (20 à 23) et le type de couleur (octet 25 : 6 = couleurs avec transparence) |
| `pluginOptions` | Retrouve les réglages d'un module dans la liste `plugins` de `app.json` |
| 1er test | Icône générale, avant-plan, une couleur, favicon : existent et ont la bonne taille ; les deux icônes Android sont transparentes autour de l'orbe |
| 2e test | Notification : 96 × 96, transparente ; démarrage : l'image existe |
| 3e test | Les dessins sources sont bien gardés, pour pouvoir refaire les images |

## 8. Test final

```bash
npx jest src/__tests__/app-icons.test.ts
npx expo config --type public
```

Résultat attendu : `Tests: 3 passed` ; la configuration s'affiche sans erreur et contient `monochromeImage` et `notification-icon.png`.

**Sur le téléphone** (après prebuild et APK, fiche 003 étapes 1 à 3, sans oublier de recréer `android/local.properties`) :
1. L'icône de Junix Pulse est l'orbe sur fond sombre.
2. Réglages Android › Fond d'écran et style › **Icônes à thème** activées : l'orbe d'une couleur, avec la vague.
3. Une notification de rappel montre la silhouette (anneau + battement) dans la barre d'état.
4. Au lancement, l'orbe apparaît au centre de l'écran blanc de démarrage.

## 9. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| L'icône du téléphone n'a pas changé | Android garde les anciennes icônes en cache, ou le prebuild n'a pas été refait | Refaire le prebuild et l'APK ; désinstaller et réinstaller si besoin |
| Icône de notification = carré blanc | L'image n'est pas transparente | Relancer le script (le fond doit être `00000000`) ; le test le vérifie |
| Une image fait 2048 × 2048 | Edge a appliqué le zoom de l'écran | Vérifier l'option `--force-device-scale-factor=1` |
| `Image non produite : assets/images/icon.png` | Edge rend la main avant d'écrire, ou confie le travail à une fenêtre Edge déjà ouverte | Le script de cette fiche attend l'image et utilise un profil à part ; vérifiez que vous avez bien la dernière version du bloc de l'étape 2 |
| `Cannot find name 'fs'` (tsc) ou `'__dirname' is not defined` (eslint) | Types de Node absents dans ce projet | Utilisez `declare const __dirname` et `require`, comme dans les blocs de cette fiche |

## 10. Lexique

- **SVG** : un dessin décrit par du texte (cercles, chemins), agrandissable sans perte.
- **PNG** : une image faite de pixels, avec transparence possible.
- **Icône adaptative** : sur Android, l'icône est faite d'un fond et d'un avant-plan, que le téléphone découpe à sa forme (rond, goutte…).
- **Icône à thème** : sur Android 13+, version d'une seule couleur que le téléphone teinte selon le fond d'écran.
- **Masque** : une image en noir et blanc qui dit quelles parties d'une forme sont visibles.
- **Headless** : un navigateur qui fonctionne sans fenêtre, piloté par un programme.
- **Prebuild** : la fabrication du projet Android natif, où les icônes sont copiées aux bonnes tailles.

## 11. Et après

1. **Fiche 010 — L'animation de lancement et `PulseLogo`** : refaire l'animation autour de l'orbe (l'anneau se dessine, le liquide monte, le battement passe, « JUNIX PULSE » apparaît, l'orbe devient Pulse), passer l'animation **et** l'écran de démarrage au fond sombre en même temps, et redessiner `PulseLogo` (onboarding, onglet Pulse, Sanctuaire).
2. Puis le chantier n° 2 de l'étude (12.10) : les notifications des trois types.

## Compte rendu d'exécution (22 novembre 2026)

- Vérifié avant d'écrire : l'animation de lancement est sur fond blanc (`SPLASH_COLORS.background`), donc l'écran de démarrage reste blanc dans cette fiche ; les options `image`, `imageWidth`, `dark` (module `expo-splash-screen`) et `monochromeImage` (icône adaptative) existent dans cette version d'Expo.
- Étapes 1, 2, 4 et 5 appliquées **à partir des blocs de cette fiche**.
- **Écarts corrigés pendant l'exécution** (la fiche décrit maintenant la version qui marche) :
  1. le premier script échouait (`Image non produite`) : Edge rend la main avant d'écrire l'image, et confie le travail à une fenêtre déjà ouverte ; ajout d'un profil temporaire et d'une attente de 15 s ;
  2. l'effacement du profil temporaire échouait (`EPERM`, Edge le tient encore) : rendu facultatif ;
  3. `tsc` refusait `fs`/`path`/`__dirname` dans le test et eslint `__dirname` dans le script : même convention que le test de l'écran de lancement, et commentaire `/* global __dirname */`.
- Étape 3 : les six images sont produites aux bonnes tailles ; `icon.png`, `android-icon-monochrome.png` et `splash-icon.png` regardées une à une, conformes au dessin validé.
- Test final : `Tests: 3 passed`, `npx expo config` montre `monochromeImage`, `notification-icon.png` et l'image de démarrage ; `tsc` et `eslint` sans erreur.
- **Pas encore vu sur le téléphone** : il faut un prebuild et un nouvel APK (fiche 003).
