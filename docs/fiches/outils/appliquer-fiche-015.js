// Applies sheet 015 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-015.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-015-onglet-a-faire-unique.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  'src/domain/rules/todo-list-rules.ts': 'rules',
  'src/components/todo/TodoRow.tsx': 'row',
  'src/features/todo/TodoTabScreen.tsx': 'screen',
  'src/app/(tabs)/tasks.tsx': 'route',
  'src/domain/rules/__tests__/todo-list-rules.test.ts': 'test',
};
const edits = {
  'src/app/(tabs)/_layout.tsx': ['tabs-1', 'tabs-2'],
  'src/components/ui/PillTopBar.tsx': ['pill'],
  'src/app/(tabs)/index.tsx': ['home-1', 'home-2'],
  'src/domain/rules/mascot-suggestion-rules.ts': ['mascot'],
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
