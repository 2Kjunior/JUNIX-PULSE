/**
 * Fabrique docs/apprendre/explorateur-du-projet.html : l'arborescence du projet façon VS Code,
 * avec le rôle de chaque dossier et fichier, ses liens (ce qu'il importe, qui l'importe) et son code.
 *
 * Lancer depuis la racine du projet, après un changement de code :
 *   node docs/apprendre/generer-explorateur.js
 *
 * Aucune bibliothèque à installer : seulement Node.js et Git.
 */

const { execSync } = require('child_process'); // lancer « git ls-files »
const fs = require('fs'); // lire et écrire des fichiers
const path = require('path'); // assembler des chemins

const ROOT = path.resolve(__dirname, '..', '..'); // la racine du projet (deux dossiers au-dessus)
const OUT = path.join(__dirname, 'explorateur-du-projet.html'); // le fichier fabriqué
const { layers, layerRules, folders, files: descriptions, packages } = require('./descriptions');

// 1. La liste des fichiers suivis par Git (+ ceux du dossier apprendre pas encore commités)
let tracked = execSync('git ls-files', { cwd: ROOT }).toString().split('\n').filter(Boolean);
for (const extra of ['docs/apprendre/descriptions.js', 'docs/apprendre/generer-explorateur.js', 'docs/apprendre/explorateur-modele.html', 'docs/apprendre/explorateur-du-projet.html', 'docs/fiches/FICHE-004-construire-junix-pulse-de-zero.html', 'docs/fiches/FICHE-004-construire-junix-pulse-de-zero.pdf']) {
  if (!tracked.includes(extra) && (fs.existsSync(path.join(ROOT, extra)) || extra.endsWith('.html'))) tracked.push(extra);
}
tracked = tracked.filter((f) => !f.startsWith('docs/motion/')); // travail en cours d'une autre session
const set = new Set(tracked);

// Les dossiers et fichiers générés (hors Git) : montrés pour comprendre, sans contenu
const GENERATED = ['node_modules/', 'android/', '.expo/', 'dist/', '.claude/', '.env', 'expo-env.d.ts'];

// 2. Résoudre un import (« @/x », « ./x ») vers un fichier du projet
const EXTS = ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx'];
function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/assets/')) base = 'assets/' + spec.slice(9);
  else if (spec.startsWith('@/')) base = 'src/' + spec.slice(2);
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const e of EXTS) if (set.has(base + e)) return base + e;
  return null;
}

const BINARY = /\.(png|jpg|jpeg|gif|wav|mp3|mp4|pdf)$/i;
const MAX_EMBED = 200 * 1024; // au-delà, le code n'est pas copié dans la page
const nodes = {};
const texts = {};
for (const f of tracked) {
  const abs = path.join(ROOT, f);
  const node = { lines: 0, size: 0, imports: [], pkgs: [], usedBy: [] };
  if (fs.existsSync(abs)) {
    node.size = fs.statSync(abs).size;
    if (!BINARY.test(f)) {
      const txt = fs.readFileSync(abs, 'utf8');
      node.lines = txt.split('\n').length;
      if (node.size <= MAX_EMBED) texts[f] = txt;
      if (/\.(ts|tsx|js|mjs)$/.test(f)) {
        const re = /(?:import|export)\s[^'";]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
        let m;
        while ((m = re.exec(txt))) {
          const spec = m[1] || m[2] || m[3];
          const local = resolveImport(f, spec);
          if (local) { if (!node.imports.includes(local)) node.imports.push(local); }
          else if (!spec.startsWith('.') && !spec.startsWith('@/')) {
            const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
            if (!node.pkgs.includes(pkg)) node.pkgs.push(pkg);
          }
        }
      }
    }
  }
  nodes[f] = node;
}
for (const f of tracked) for (const i of nodes[f].imports) nodes[i].usedBy.push(f);

// 3. Qui mentionne une image ou un son (app.json, require('…/icon.png'))
for (const f of tracked) {
  if (!BINARY.test(f) && !/\.svg$/.test(f)) continue;
  const name = path.posix.basename(f);
  for (const [other, txt] of Object.entries(texts)) {
    if (other !== f && other !== 'package-lock.json' && !other.startsWith('docs/apprendre/') && txt.includes(name)) nodes[f].usedBy.push(other);
  }
}

// 4. La couche et la description de chaque fichier
function layerOf(p) { for (const [re, l] of layerRules) if (re.test(p)) return l; return 'config'; }
function headerComment(txt) {
  const m = /\/\*\*([\s\S]*?)\*\//.exec(txt.slice(0, 3000));
  if (!m) return '';
  return m[1].split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean).join(' ').slice(0, 400);
}
const missing = [];
const entries = {};
for (const f of tracked) {
  let d = descriptions[f];
  if (!d && f.includes('__tests__/')) {
    const tested = nodes[f].imports.filter((i) => !i.includes('__tests__')).slice(0, 4).map((i) => path.posix.basename(i));
    d = 'Test automatique (Jest) : il appelle le code et vérifie le résultat attendu. Lance-le avec « npx jest ' + path.posix.basename(f).replace(/\.test\.tsx?$/, '') + ' ».' + (tested.length ? ' Il teste surtout : ' + tested.join(', ') + '.' : '');
  }
  if (!d && /^src\/styles\//.test(f)) d = 'Les styles (couleurs, marges, tailles) de l’écran correspondant, sous forme de fabrique makeXStyles(theme) pour suivre le thème clair ou sombre.';
  if (!d && /^assets\//.test(f)) d = nodes[f].usedBy.length ? 'Ressource utilisée par ' + nodes[f].usedBy.join(', ') + '.' : 'Ressource du modèle Expo de départ, mentionnée nulle part : elle ne sert plus.';
  if (!d && texts[f]) { d = headerComment(texts[f]); if (d) missing.push(f + ' (en-tête anglais/brut)'); }
  if (!d) { d = 'Fichier du projet.'; missing.push(f); }
  entries[f] = { d, l: layerOf(f), n: nodes[f].lines, s: nodes[f].size, i: nodes[f].imports, u: nodes[f].usedBy, p: nodes[f].pkgs };
}
for (const g of GENERATED) entries[g] = { d: folders[g] || descriptions[g], l: 'genere', gen: true, i: [], u: [], p: [] };

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  commit: execSync('git log -1 --format=%h', { cwd: ROOT }).toString().trim(),
  layers, folders, entries, packages, texts,
};
const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); // « < » échappé : un « </script> » copié ne coupe pas la page
const template = fs.readFileSync(path.join(__dirname, 'explorateur-modele.html'), 'utf8');
fs.writeFileSync(OUT, template.replace('/*__DATA__*/null', () => json));
console.log('Explorateur écrit :', path.relative(ROOT, OUT), '—', tracked.length, 'fichiers,', (fs.statSync(OUT).size / 1024 / 1024).toFixed(1), 'Mo');
if (missing.length) console.log('Sans description écrite à la main (' + missing.length + ') :\n  ' + missing.join('\n  '));
