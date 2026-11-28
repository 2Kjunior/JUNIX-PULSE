// Applies sheet 046 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-046.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-046-secrets-de-pulse.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/secret-tips-rules.ts": "new-secret-tips-rules",
  "src/features/mascot/SecretTip.tsx": "new-secrettip",
  "src/__tests__/secret-tips.test.ts": "new-secret-tips-test"
};
const edits = {
  "src/domain/rules/mascot-message-catalog-en.ts": [
    "mascot-message-catalog-en-1"
  ],
  "src/domain/rules/mascot-message-catalog.ts": [
    "mascot-message-catalog-1"
  ],
  "src/features/mascot/MascotTabsLayer.tsx": [
    "mascottabslayer-1",
    "mascottabslayer-2"
  ],
  "src/services/mascot/mascot-tips-service.ts": [
    "mascot-tips-service-1",
    "mascot-tips-service-2"
  ]
};
// Files the sheet removes: nothing uses them any more
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
      problems.push(`${file}: missing block ${name}`);
      continue;
    }
    const count = text.split(before).length - 1;
    if (count !== 1) {
      problems.push(`${file}: block ${name} found ${count} times`);
      continue;
    }
    text = text.replace(before, () => after);
  }
  edited[file] = crlf ? text.replace(/\n/g, '\r\n') : text;
}
if (problems.length) {
  console.error('Nothing written:\n' + problems.join('\n'));
  process.exit(1);
}
for (const [file, name] of Object.entries(whole)) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), blocks[name] + '\n');
}
for (const [file, text] of Object.entries(edited)) fs.writeFileSync(path.join(root, file), text);
for (const file of removed) fs.rmSync(path.join(root, file), { force: true });
console.log('Sheet 046 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
