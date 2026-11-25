// Applies sheet 024 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-024.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-024-gestes-decouvrables.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/gesture-tip-rules.ts": "rules",
  "src/domain/rules/__tests__/gesture-tip-rules.test.ts": "rules-test",
  "src/components/ui/CardMenu.tsx": "card-menu",
  "src/features/mascot/TipBubbleLayer.tsx": "bubble",
  "src/features/mascot/FirstVisitTip.tsx": "first-visit",
  "src/services/mascot/mascot-tips-service.ts": "tips-service",
  "src/features/mascot/GestureTip.tsx": "gesture-tip"
};
const edits = {
  "src/components/ui/SwipeableItem.tsx": [
    "sw-import",
    "sw-import-2",
    "sw-prop",
    "sw-args"
  ],
  "src/components/ui/GlowCard.tsx": [
    "gc-import",
    "gc-hook",
    "gc-press"
  ],
  "src/components/todo/TodoRow.tsx": [
    "tr-import",
    "tr-hooks",
    "tr-press",
    "tr-button"
  ],
  "src/app/habits/index.tsx": [
    "hb-import",
    "hb-hook",
    "hb-map",
    "hb-peek",
    "hb-button",
    "hb-element"
  ],
  "src/app/goals/index.tsx": [
    "gl-import",
    "gl-hook",
    "gl-map",
    "gl-peek",
    "gl-button",
    "gl-element"
  ],
  "src/features/todo/TodoTabScreen.tsx": [
    "tt-import",
    "tt-hook",
    "tt-peek",
    "tt-element"
  ],
  "src/domain/rules/mascot-message-catalog.ts": [
    "msg-fr"
  ],
  "src/domain/rules/mascot-message-catalog-en.ts": [
    "msg-en"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "fr"
  ],
  "src/i18n/messages-rest-en.ts": [
    "en"
  ]
};
const removed = [];
for (const name of Object.values(whole)) if (!(name in blocks)) throw new Error('missing block ' + name);

const edited = {};
const problems = [];
for (const [file, names] of Object.entries(edits)) {
  const raw = fs.readFileSync(path.join(root, file), 'utf8');
  const crlf = raw.includes('\r\n');
  let text = raw.replace(/\r\n/g, '\n');
  for (const name of names) {
    const before = blocks[`${name}-avant`];
    const after = blocks[`${name}-apres`];
    if (before === undefined || after === undefined) {
      problems.push(`missing block ${name}`);
      continue;
    }
    const count = text.split(before).length - 1;
    if (count !== 1) {
      problems.push(`${file}: ${name} found ${count} times`);
      continue;
    }
    text = text.replace(before, () => after);
  }
  edited[file] = crlf ? text.replace(/\n/g, '\r\n') : text;
}
if (problems.length) throw new Error('Nothing written:\n' + problems.join('\n'));

for (const [file, name] of Object.entries(whole)) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), blocks[name] + '\n');
}
for (const [file, text] of Object.entries(edited)) fs.writeFileSync(path.join(root, file), text);
for (const file of removed) if (fs.existsSync(path.join(root, file))) fs.unlinkSync(path.join(root, file));
console.log('applied');
