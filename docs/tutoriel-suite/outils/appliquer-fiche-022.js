// Applies sheet 022 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/tutoriel-suite/outils/appliquer-fiche-022.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-022-modifier-avec-les-memes-formulaires.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/item-edit-rules.ts": "rules",
  "src/domain/rules/__tests__/item-edit-rules.test.ts": "rules-test",
  "src/features/create/edit-loaders.ts": "loaders",
  "src/features/create/TodoForm.tsx": "todo-form",
  "src/features/create/MomentForm.tsx": "moment-form",
  "src/app/reminders/edit/[id].tsx": "route-reminder",
  "src/app/tasks/edit/[id].tsx": "route-task",
  "src/app/events/edit/[id].tsx": "route-event",
  "src/app/tasks/[id].tsx": "task-page"
};
const edits = {
  "src/components/create/form/FormBricks.tsx": [
    "shell-1",
    "shell-2",
    "shell-3",
    "shell-4"
  ],
  "src/use-cases/reminder-use-cases.ts": [
    "uc-1",
    "uc-2"
  ],
  "src/repositories/reminder-repository.ts": [
    "repo-1",
    "repo-2"
  ],
  "src/use-cases/task-use-cases.ts": [
    "task"
  ],
  "src/app/_layout.tsx": [
    "routes",
    "routes-2"
  ],
  "src/app/events/[id].tsx": [
    "ev-1",
    "ev-2",
    "ev-3",
    "ev-4",
    "ev-5"
  ],
  "src/app/reminders/[id].tsx": [
    "rm-1",
    "rm-2",
    "rm-3"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "fr"
  ],
  "src/i18n/messages-rest-en.ts": [
    "en"
  ]
};
const removed = ["src/styles/reminders/edit-reminder-styles.ts"];
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
