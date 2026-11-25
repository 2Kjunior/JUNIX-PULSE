// Applies sheet 017 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-017.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-017-coherence-parametres-et-mots.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  'src/components/ui/HeaderIconButton.tsx': 'button',
  'src/__tests__/coherence-017.test.ts': 'test',
};
const edits = {
  'src/app/(tabs)/index.tsx': ['home-1', 'home-2'],
  'src/app/(tabs)/calendar.tsx': ['cal-1', 'cal-2'],
  'src/app/(tabs)/people.tsx': ['people-1', 'people-2'],
  'src/app/(tabs)/pulse.tsx': ['pulse-1', 'pulse-2'],
  'src/features/todo/TodoTabScreen.tsx': ['todo-1', 'todo-2', 'todo-3'],
  'src/features/create/TodoForm.tsx': ['form'],
  'src/constants/item-kinds.ts': ['kinds'],
  'src/app/reminders/[id].tsx': ['rem-1', 'rem-2'],
  'src/i18n/messages.ts': ['home-fr', 'home-en'],
  'src/i18n/messages-rest-fr.ts': ['fr-1', 'fr-2', 'fr-3', 'fr-4', 'fr-5', 'fr-6'],
  'src/i18n/messages-rest-en.ts': ['en-1', 'en-2', 'en-3', 'en-4', 'en-5', 'en-6'],
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
