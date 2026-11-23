// Applies sheet 019 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/tutoriel-suite/outils/appliquer-fiche-019.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-019-habitude-qui-sonne.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  'src/domain/rules/habit-notification-rules.ts': 'rules',
  'src/services/habit-notification-service.ts': 'service',
  'src/features/habits/HabitReminderField.tsx': 'field',
  'src/domain/rules/__tests__/habit-notification-rules.test.ts': 'test',
};
const edits = {
  'src/database/migrations.ts': ['mig'],
  'src/domain/entities/index.ts': ['ent'],
  'src/repositories/habit-repository.ts': ['repo-1', 'repo-2', 'repo-3'],
  'src/services/backup-service.ts': ['bk'],
  'src/domain/rules/notification-level-rules.ts': ['level-1', 'level-2'],
  'src/services/notification-service.ts': ['ns-1', 'ns-2', 'ns-3', 'ns-4'],
  'src/services/reminder-notification-service.ts': ['rs-1', 'rs-2'],
  'src/use-cases/habit-use-cases.ts': ['uc-1', 'uc-2', 'uc-3', 'uc-4', 'uc-5', 'uc-6', 'uc-7', 'uc-8', 'uc-9', 'uc-10', 'uc-11'],
  'src/domain/rules/reminder-notification-rules.ts': ['rr-1', 'rr-2', 'rr-3', 'rr-4'],
  'src/services/notification-action-service.ts': ['na-1', 'na-2', 'na-3'],
  'src/app/_layout.tsx': ['lay-1', 'lay-2'],
  'src/app/habits/new.tsx': ['new-1', 'new-2', 'new-3', 'new-4'],
  'src/app/habits/[id].tsx': ['detail-1', 'detail-2'],
  'src/i18n/messages-rest-fr.ts': ['fr'],
  'src/i18n/messages-rest-en.ts': ['en'],
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
