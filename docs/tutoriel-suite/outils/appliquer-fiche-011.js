// Applies sheet 011 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/tutoriel-suite/outils/appliquer-fiche-011.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-011-notifications-trois-types.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  'src/domain/rules/notification-level-rules.ts': 'level-rules',
  'src/domain/rules/item-notification-rules.ts': 'item-rules',
  'src/services/item-notification-service.ts': 'item-service',
  'src/domain/rules/__tests__/notification-level-rules.test.ts': 'test-levels',
  'src/domain/rules/__tests__/item-notification-rules.test.ts': 'test-items',
};
const edits = {
  'src/services/notification-service.ts': ['ns-1', 'ns-2', 'ns-3', 'ns-4', 'ns-5'],
  'src/domain/rules/reminder-notification-rules.ts': ['rr-1', 'rr-2', 'rr-3', 'rr-4', 'rr-5', 'rr-6', 'rr-7', 'rr-8'],
  'src/services/reminder-notification-service.ts': ['rs-1', 'rs-2', 'rs-3', 'rs-4', 'rs-5'],
  'src/database/migrations.ts': ['mig'],
  'src/__tests__/coloured-tags.test.ts': ['tag-test'],
  'src/domain/entities/index.ts': ['ent'],
  'src/repositories/settings-repository.ts': ['repo-1', 'repo-2'],
  'src/services/backup-service.ts': ['bk-1', 'bk-2'],
  'src/app/settings/index.tsx': ['set-1', 'set-2'],
  'src/i18n/messages-rest-fr.ts': ['fr'],
  'src/i18n/messages-rest-en.ts': ['en'],
  'src/use-cases/task-use-cases.ts': ['tu-1', 'tu-2', 'tu-3', 'tu-4', 'tu-5', 'tu-6', 'tu-7'],
  'src/use-cases/event-use-cases.ts': ['eu-1', 'eu-2', 'eu-3', 'eu-4', 'eu-5'],
  'src/app/_layout.tsx': ['lay'],
};
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
console.log('applied');
