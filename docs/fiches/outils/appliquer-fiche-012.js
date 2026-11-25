// Applies sheet 012 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-012.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-012-formulaires-a-faire-et-moment.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  'src/constants/item-forms.ts': 'forms-registry',
  'src/components/create/form/FormBricks.tsx': 'bricks',
  'src/features/create/TodoForm.tsx': 'todo-form',
  'src/features/create/MomentForm.tsx': 'moment-form',
  'src/app/tasks/new.tsx': 'route-task',
  'src/app/reminders/new.tsx': 'route-reminder',
  'src/app/events/new.tsx': 'route-event',
  'src/__tests__/item-forms.test.ts': 'test',
};
const edits = {
  'src/domain/rules/focus-rules.ts': ['focus-1'],
  'src/app/focus.tsx': ['focus-2', 'focus-3'],
  'src/app/tasks/[id].tsx': ['focus-4'],
  'src/i18n/messages.ts': ['dur-fr', 'dur-en'],
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
