// Applies sheet 040 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-040.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-040-proches-et-appli-fermee.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/features/people/picked-person.ts": "new-picked-person",
  "src/features/people/__tests__/picked-person.test.ts": "new-picked-person-test"
};
const edits = {
  "modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/JunixAlarmModule.kt": [
    "mod-junixalarmmodule-1"
  ],
  "modules/junix-alarm/index.ts": [
    "mod-index-1",
    "mod-index-2"
  ],
  "src/app/people/[id].tsx": [
    "-id--1"
  ],
  "src/app/people/new.tsx": [
    "new-1",
    "new-2",
    "new-3",
    "new-4",
    "new-5",
    "new-6",
    "new-7",
    "new-8"
  ],
  "src/app/settings/index.tsx": [
    "index-1",
    "index-2",
    "index-3",
    "index-4",
    "index-5"
  ],
  "src/components/people/PersonField.tsx": [
    "personfield-1",
    "personfield-2"
  ],
  "src/components/people/PersonPicker.tsx": [
    "personpicker-1",
    "personpicker-2",
    "personpicker-3",
    "personpicker-4",
    "personpicker-5"
  ],
  "src/features/people/relation-label.ts": [
    "relation-label-1"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1"
  ],
  "src/services/alarm-bridge.ts": [
    "alarm-bridge-1"
  ],
  "src/use-cases/person-use-cases.ts": [
    "person-use-cases-1",
    "person-use-cases-2"
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
console.log('Sheet 040 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
