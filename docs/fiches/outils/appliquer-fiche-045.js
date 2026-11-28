// Applies sheet 045 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-045.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-045-visite-des-onglets.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/features/mascot/TourInfoButton.tsx": "new-tourinfobutton",
  "src/__tests__/screen-tours.test.ts": "new-screen-tours-test"
};
const edits = {
  "src/app/(tabs)/calendar.tsx": [
    "calendar-1",
    "calendar-2",
    "calendar-3",
    "calendar-4",
    "calendar-5",
    "calendar-6",
    "calendar-7",
    "calendar-8"
  ],
  "src/app/(tabs)/index.tsx": [
    "index-1",
    "index-2"
  ],
  "src/app/(tabs)/people.tsx": [
    "people-1",
    "people-2",
    "people-3",
    "people-4"
  ],
  "src/components/todo/TodoRow.tsx": [
    "todorow-1",
    "todorow-2",
    "todorow-3"
  ],
  "src/components/ui/GlassFloatingActionButton.tsx": [
    "glassfloatingactionbutton-1",
    "glassfloatingactionbutton-2",
    "glassfloatingactionbutton-3",
    "glassfloatingactionbutton-4",
    "glassfloatingactionbutton-5",
    "glassfloatingactionbutton-6"
  ],
  "src/domain/rules/mascot-message-catalog-en.ts": [
    "mascot-message-catalog-en-1"
  ],
  "src/domain/rules/mascot-message-catalog.ts": [
    "mascot-message-catalog-1"
  ],
  "src/domain/rules/mascot-tour-rules.ts": [
    "mascot-tour-rules-1",
    "mascot-tour-rules-2",
    "mascot-tour-rules-3"
  ],
  "src/features/mascot/HomeTour.tsx": [
    "hometour-1",
    "hometour-2",
    "hometour-3",
    "hometour-4",
    "hometour-5",
    "hometour-6"
  ],
  "src/features/mascot/MascotSettingsSection.tsx": [
    "mascotsettingssection-1",
    "mascotsettingssection-2"
  ],
  "src/features/mascot/MascotTabsLayer.tsx": [
    "mascottabslayer-1"
  ],
  "src/features/mascot/TourTarget.tsx": [
    "tourtarget-1"
  ],
  "src/features/todo/TodoTabScreen.tsx": [
    "todotabscreen-1",
    "todotabscreen-2",
    "todotabscreen-3",
    "todotabscreen-4",
    "todotabscreen-5",
    "todotabscreen-6"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1"
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
console.log('Sheet 045 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
