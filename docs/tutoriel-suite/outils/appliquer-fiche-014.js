// Applies sheet 014 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/tutoriel-suite/outils/appliquer-fiche-014.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-014-formulaires-ajustes-et-dicter-tout-complet.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  'src/domain/rules/form-dictation-rules.ts': 'rules',
  'src/domain/rules/__tests__/form-dictation-rules.test.ts': 'test',
};
const edits = {
  'src/styles/common/form-styles.ts': ['styles'],
  'src/components/create/form/FormBricks.tsx': ['shell-1', 'shell-2', 'shell-3', 'mic-1', 'mic-2', 'mic-3', 'mic-4', 'all-1', 'all-2'],
  'src/components/create/NewItemChooser.tsx': ['ch-1', 'ch-2', 'ch-3', 'ch-4', 'ch-5', 'ch-6'],
  'src/__tests__/new-item-chooser.test.tsx': ['cht'],
  'src/features/create/TodoForm.tsx': ['todo-1', 'todo-2', 'todo-3', 'todo-4'],
  'src/features/create/MomentForm.tsx': ['moment-1', 'moment-2', 'moment-3'],
  'src/app/people/new.tsx': ['person-1', 'person-2', 'person-3'],
  'src/i18n/messages-rest-fr.ts': ['fr-1', 'fr-2', 'fr-3'],
  'src/i18n/messages-rest-en.ts': ['en-1', 'en-2', 'en-3'],
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
