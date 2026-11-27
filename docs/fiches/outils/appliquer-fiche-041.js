// Applies sheet 041 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-041.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-041-theme-neutre.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/__tests__/neutral-theme.test.ts": "new-neutral-theme-test"
};
const edits = {
  "src/app/_layout.tsx": [
    "-layout-1",
    "-layout-2",
    "-layout-3"
  ],
  "src/app/settings/index.tsx": [
    "index-1",
    "index-2",
    "index-3",
    "index-4",
    "index-5",
    "index-6",
    "index-7",
    "index-8",
    "index-9",
    "index-10",
    "index-11"
  ],
  "src/components/settings/LanguagePicker.tsx": [
    "languagepicker-1",
    "languagepicker-2"
  ],
  "src/components/ui/AmbientBackground.tsx": [
    "ambientbackground-1",
    "ambientbackground-2",
    "ambientbackground-3"
  ],
  "src/constants/palettes.ts": [
    "palettes-1"
  ],
  "src/database/migrations.ts": [
    "migrations-1"
  ],
  "src/domain/entities/index.ts": [
    "indexx-1",
    "indexx-2"
  ],
  "src/hooks/use-reduce-transparency.ts": [
    "use-reduce-transparency-1",
    "use-reduce-transparency-2"
  ],
  "src/hooks/use-theme.ts": [
    "use-theme-1",
    "use-theme-2",
    "use-theme-3",
    "use-theme-4"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1"
  ],
  "src/repositories/settings-repository.ts": [
    "settings-repository-1",
    "settings-repository-2",
    "settings-repository-3"
  ],
  "src/services/backup-service.ts": [
    "backup-service-1",
    "backup-service-2"
  ],
  "src/store/app-store.ts": [
    "app-store-1",
    "app-store-2"
  ],
  "src/styles/settings/settings-styles.ts": [
    "settings-styles-1",
    "settings-styles-2"
  ],
  "src/utils/color.ts": [
    "color-1",
    "color-2"
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
console.log('Sheet 041 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
