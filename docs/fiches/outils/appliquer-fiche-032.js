// Applies sheet 032 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-032.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-032-la-priorite-choisit-le-son.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/components/create/form/PriorityField.tsx": "new-priorityfield"
};
const edits = {
  "src/__tests__/item-forms.test.ts": [
    "item-forms-test-1"
  ],
  "src/components/settings/SoundSetting.tsx": [
    "soundsetting-1",
    "soundsetting-2"
  ],
  "src/constants/item-forms.ts": [
    "item-forms-1",
    "item-forms-2"
  ],
  "src/database/migrations.ts": [
    "migrations-1"
  ],
  "src/domain/entities/index.ts": [
    "index-1"
  ],
  "src/domain/rules/__tests__/item-notification-rules.test.ts": [
    "item-notification-rules-test-1"
  ],
  "src/domain/rules/__tests__/notification-level-rules.test.ts": [
    "notification-level-rules-test-1",
    "notification-level-rules-test-2"
  ],
  "src/domain/rules/__tests__/reminder-notification-rules.test.ts": [
    "reminder-notification-rules-test-1"
  ],
  "src/domain/rules/__tests__/sound-rules.test.ts": [
    "sound-rules-test-1"
  ],
  "src/domain/rules/item-notification-rules.ts": [
    "item-notification-rules-1",
    "item-notification-rules-2",
    "item-notification-rules-3",
    "item-notification-rules-4",
    "item-notification-rules-5"
  ],
  "src/domain/rules/notification-level-rules.ts": [
    "notification-level-rules-1",
    "notification-level-rules-2"
  ],
  "src/domain/rules/reminder-notification-rules.ts": [
    "reminder-notification-rules-1",
    "reminder-notification-rules-2",
    "reminder-notification-rules-3",
    "reminder-notification-rules-4",
    "reminder-notification-rules-5"
  ],
  "src/domain/rules/sound-rules.ts": [
    "sound-rules-1",
    "sound-rules-2"
  ],
  "src/features/create/MomentForm.tsx": [
    "momentform-1",
    "momentform-2",
    "momentform-3",
    "momentform-4",
    "momentform-5",
    "momentform-6",
    "momentform-7"
  ],
  "src/features/create/TodoForm.tsx": [
    "todoform-1",
    "todoform-2",
    "todoform-3",
    "todoform-4",
    "todoform-5",
    "todoform-6",
    "todoform-7",
    "todoform-8",
    "todoform-9",
    "todoform-10"
  ],
  "src/features/create/edit-loaders.ts": [
    "edit-loaders-1",
    "edit-loaders-2"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1",
    "messages-rest-en-2",
    "messages-rest-en-3"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1",
    "messages-rest-fr-2",
    "messages-rest-fr-3"
  ],
  "src/repositories/event-repository.ts": [
    "event-repository-1",
    "event-repository-2",
    "event-repository-3",
    "event-repository-4",
    "event-repository-5"
  ],
  "src/services/backup-service.ts": [
    "backup-service-1",
    "backup-service-2"
  ],
  "src/services/item-notification-service.ts": [
    "item-notification-service-1",
    "item-notification-service-2"
  ],
  "src/services/notification-service.ts": [
    "notification-service-1",
    "notification-service-2",
    "notification-service-3",
    "notification-service-4",
    "notification-service-5",
    "notification-service-6",
    "notification-service-7"
  ],
  "src/services/reminder-notification-service.ts": [
    "reminder-notification-service-1",
    "reminder-notification-service-2"
  ],
  "src/use-cases/event-use-cases.ts": [
    "event-use-cases-1",
    "event-use-cases-2",
    "event-use-cases-3",
    "event-use-cases-4",
    "event-use-cases-5"
  ]
};
// Files the sheet removes: nothing uses them any more
const removed = [
  "src/components/create/form/AlertLevelField.tsx"
];
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
console.log('Sheet 032 applied: ' + Object.keys(whole).length + ' new file, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
