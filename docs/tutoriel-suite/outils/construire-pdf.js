/**
 * Fabrique le tutoriel PDF : convertit les chapitres Markdown (chapitres/*.md) et les annexes
 * (fiches et étude du projet) en une page HTML, puis demande à Edge de l'imprimer en PDF.
 * Lancer depuis la racine du projet : node docs/tutoriel-suite/outils/construire-pdf.js
 */

/* global __dirname */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.resolve(__dirname, '..');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(escapeHtml(c)) - 1}\u0000`);
  s = escapeHtml(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

/** A small Markdown converter: headings, paragraphs, lists, tables, code, quotes and raw HTML. */
function markdown(md, idPrefix) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i += 1;
      out.push(`<pre class="lang-${lang || 'txt'}"><code>${escapeHtml(body.join('\n'))}</code></pre>`);
    } else if (/^#{1,4} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+ /, '');
      const id = `${idPrefix}-${out.length}`;
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      if (level <= 2) toc.push({ level, text, id });
      i += 1;
    } else if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|\s*$/g, '').split(/(?<!\\)\|/).map((c) => inline(c.trim()));
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`
      );
    } else if (/^\s*([-*]|\d+\.) /.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*]|\d+\.) /, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.) /.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
    } else if (/^> /.test(line)) {
      const body = [];
      while (i < lines.length && /^> ?/.test(lines[i])) body.push(lines[i++].replace(/^> ?/, ''));
      const kind = (body[0].match(/^\[(\w+)\]/) || [])[1];
      if (kind) body[0] = body[0].replace(/^\[\w+\]\s*/, '');
      out.push(`<blockquote class="${kind || 'note'}">${markdown(body.join('\n'), idPrefix + 'q')}</blockquote>`);
    } else if (/^<!-- bloc/.test(line)) {
      out.push(`<div class="bloc">${escapeHtml(line.replace(/<!-- bloc: (.*) -->/, 'Bloc : $1'))}</div>`);
      i += 1;
    } else if (/^</.test(line)) {
      const body = [];
      while (i < lines.length && lines[i].trim() !== '') body.push(lines[i++]);
      out.push(body.join('\n'));
    } else if (line.trim() === '' || /^---\s*$/.test(line)) {
      i += 1;
    } else {
      const body = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^(#|```|\||>|<|\s*([-*]|\d+\.) )/.test(lines[i])) body.push(lines[i++]);
      out.push(`<p>${inline(body.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

const toc = [];
const chapters = fs
  .readdirSync(path.join(OUT, 'chapitres'))
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f, n) => markdown(fs.readFileSync(path.join(OUT, 'chapitres', f), 'utf8'), `c${n}`));

const annexes = [
  ['Annexe A — Fiche 010 complète (animation de lancement)', 'docs/fiches/FICHE-010-animation-lancement-orbe.md'],
  ['Annexe B — Fiche 003 complète (fabriquer l’APK sur le PC)', 'docs/fiches/FICHE-003-build-local-apk.md'],
  ['Annexe C — Fiche 009 complète (les icônes du logo)', 'docs/fiches/FICHE-009-icones-logo-a1.md'],
  ['Annexe D — Fiche 008 complète (deux familles)', 'docs/fiches/FICHE-008-deux-familles.md'],
  ['Annexe E — Index des fiches', 'docs/fiches/INDEX.md'],
].map(([title, file], n) => {
  const id = `annexe-${n}`;
  toc.push({ level: 1, text: title, id });
  const md = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^# .*\n/, '');
  return `<section class="annexe"><h1 id="${id}">${escapeHtml(title)}</h1>${markdown(md, `a${n}`)}</section>`;
});

// Study section 12, the decisions, as annex F
const study = fs.readFileSync(path.join(ROOT, 'docs/etudes/ETUDE-001-clarifier-et-faire-evoluer.md'), 'utf8');
const s12 = study.slice(study.indexOf('## 12.'));
toc.push({ level: 1, text: 'Annexe F — Étude 001, section 12 : toutes les décisions', id: 'annexe-etude' });
annexes.push(`<section class="annexe"><h1 id="annexe-etude">Annexe F — Étude 001, section 12 : toutes les décisions</h1>${markdown(s12, 'e')}</section>`);

// Later sheets, as annexes G, H… (chapter 25 of the tutorial explains how to add one)
for (const [title, file] of [['Annexe G — Fiche 011 complète (notifications des trois types)', 'docs/fiches/FICHE-011-notifications-trois-types.md']]) {
  const id = `annexe-${title.slice(7, 8)}`;
  toc.push({ level: 1, text: title, id });
  const md = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^# .*\n/, '');
  annexes.push(`<section class="annexe"><h1 id="${id}">${escapeHtml(title)}</h1>${markdown(md, id)}</section>`);
}

const tocHtml = toc
  .map((t) => `<li class="toc-${t.level}"><a href="#${t.id}">${inline(t.text)}</a></li>`)
  .join('');

// The cover says which state of the project this version describes, read from git
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '?';
  }
};
const pending = git('status', '--short').split('\n').filter((l) => l && !l.includes('docs/motion/') && !l.includes('docs/tutoriel-suite/')).length;
const cover = fs
  .readFileSync(path.join(OUT, 'outils', 'couverture.html'), 'utf8')
  .replace('{{DATE}}', new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))
  .replace('{{BRANCHE}}', git('rev-parse', '--abbrev-ref', 'HEAD'))
  .replace('{{COMMIT}}', git('log', '-1', '--format=%h'))
  .replace('{{EN_COURS}}', pending ? `${pending} fichier(s) modifié(s) non enregistré(s)` : 'tout est enregistré');

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Junix Pulse — Le tutoriel de la suite</title>
<link rel="stylesheet" href="outils/style.css"></head><body>
${cover}
<section class="toc"><h1>Sommaire</h1><ul>${tocHtml}</ul></section>
${chapters.map((c) => `<section class="chapitre">${c}</section>`).join('\n')}
${annexes.join('\n')}
</body></html>`;

const htmlPath = path.join(OUT, 'tutoriel-junix-pulse.html');
fs.writeFileSync(htmlPath, html);

const pdfPath = path.join(OUT, 'tutoriel-junix-pulse.pdf');
if (fs.existsSync(pdfPath)) fs.rmSync(pdfPath);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'junix-pdf-'));
execFileSync(EDGE, [
  '--headless=new',
  `--user-data-dir=${profile}`,
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  `file:///${htmlPath.replace(/\\/g, '/')}`,
], { stdio: 'ignore' });
const until = Date.now() + 60000;
while (!fs.existsSync(pdfPath) && Date.now() < until) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
const pages = (fs.readFileSync(pdfPath, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`${pdfPath} : ${pages} pages`);
try {
  fs.rmSync(profile, { recursive: true, force: true });
} catch {
  // Edge peut encore tenir le profil : sans importance
}

// --zip : refait aussi l'archive du Bureau (le PDF, le HTML, les chapitres, les outils et les assets)
if (process.argv.includes('--zip')) {
  const zip = path.join(os.homedir(), 'Desktop', 'junix-pulse-tutoriel-suite.zip');
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${OUT}\\*' -DestinationPath '${zip}' -Force`,
  ]);
  console.log(`${zip} : ${Math.round(fs.statSync(zip).size / 1024)} Ko`);
}
