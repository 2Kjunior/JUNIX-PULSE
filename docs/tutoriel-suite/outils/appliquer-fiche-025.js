// Applies sheet 025 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/tutoriel-suite/outils/appliquer-fiche-025.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-025-partager-sans-compte.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/invite-rules.ts": "rules",
  "src/domain/rules/__tests__/invite-rules.test.ts": "rules-test",
  "src/repositories/invite-repository.ts": "repo",
  "src/use-cases/invite-use-cases.ts": "use-cases",
  "src/features/share/ShareItemCard.tsx": "share-card",
  "src/app/invite.tsx": "invite-screen"
};
const edits = {
  "src/database/migrations.ts": [
    "migration"
  ],
  "src/services/backup-service.ts": [
    "bk-table",
    "bk-cols",
    "bk-required",
    "bk-enum",
    "bk-zod"
  ],
  "src/app/_layout.tsx": [
    "route"
  ],
  "src/app/reminders/[id].tsx": [
    "rm-import",
    "rm-card"
  ],
  "src/app/tasks/[id].tsx": [
    "tk-import",
    "tk-card"
  ],
  "src/app/events/[id].tsx": [
    "ev-import",
    "ev-card"
  ],
  "src/components/create/NewItemChooser.tsx": [
    "nc-link"
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
