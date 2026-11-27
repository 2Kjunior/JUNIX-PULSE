// Applies sheet 043 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-043.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-043-couleur-d-une-carte.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/components/create/form/CardColorField.tsx": "new-cardcolorfield",
  "src/__tests__/card-color.test.ts": "new-card-color-test"
};
const edits = {
  "src/__tests__/item-forms.test.ts": [
    "item-forms-test-1"
  ],
  "src/app/(tabs)/calendar.tsx": [
    "calendar-1",
    "calendar-2",
    "calendar-3"
  ],
  "src/app/(tabs)/index.tsx": [
    "index-1",
    "index-2",
    "index-3",
    "index-4"
  ],
  "src/components/create/form/FormBricks.tsx": [
    "formbricks-1",
    "formbricks-2"
  ],
  "src/components/planning/DayTimeGrid.tsx": [
    "daytimegrid-1",
    "daytimegrid-2"
  ],
  "src/components/schedule/WeeklyTimetableGrid.tsx": [
    "weeklytimetablegrid-1",
    "weeklytimetablegrid-2"
  ],
  "src/components/todo/TodoRow.tsx": [
    "todorow-1",
    "todorow-2"
  ],
  "src/components/ui/GlowCard.tsx": [
    "glowcard-1",
    "glowcard-2",
    "glowcard-3"
  ],
  "src/constants/color-themes.ts": [
    "color-themes-1"
  ],
  "src/constants/item-forms.ts": [
    "item-forms-1",
    "item-forms-2"
  ],
  "src/constants/item-kinds.ts": [
    "item-kinds-1",
    "item-kinds-2"
  ],
  "src/database/migrations.ts": [
    "migrations-1"
  ],
  "src/domain/entities/index.ts": [
    "indexx-1",
    "indexx-2",
    "indexx-3",
    "indexx-4"
  ],
  "src/domain/rules/item-notification-rules.ts": [
    "item-notification-rules-1",
    "item-notification-rules-2",
    "item-notification-rules-3",
    "item-notification-rules-4"
  ],
  "src/domain/rules/reminder-notification-rules.ts": [
    "reminder-notification-rules-1",
    "reminder-notification-rules-2",
    "reminder-notification-rules-3",
    "reminder-notification-rules-4"
  ],
  "src/domain/rules/todo-list-rules.ts": [
    "todo-list-rules-1",
    "todo-list-rules-2",
    "todo-list-rules-3",
    "todo-list-rules-4"
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
    "todoform-9"
  ],
  "src/features/create/edit-loaders.ts": [
    "edit-loaders-1",
    "edit-loaders-2",
    "edit-loaders-3",
    "edit-loaders-4",
    "edit-loaders-5",
    "edit-loaders-6"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1"
  ],
  "src/repositories/event-repository.ts": [
    "event-repository-1",
    "event-repository-2",
    "event-repository-3",
    "event-repository-4",
    "event-repository-5"
  ],
  "src/repositories/reminder-repository.ts": [
    "reminder-repository-1",
    "reminder-repository-2",
    "reminder-repository-3",
    "reminder-repository-4",
    "reminder-repository-5",
    "reminder-repository-6",
    "reminder-repository-7"
  ],
  "src/repositories/task-repository.ts": [
    "task-repository-1",
    "task-repository-2",
    "task-repository-3",
    "task-repository-4"
  ],
  "src/services/backup-service.ts": [
    "backup-service-1"
  ],
  "src/services/item-notification-service.ts": [
    "item-notification-service-1"
  ],
  "src/services/notification-service.ts": [
    "notification-service-1",
    "notification-service-2",
    "notification-service-3",
    "notification-service-4",
    "notification-service-5"
  ],
  "src/services/reminder-notification-service.ts": [
    "reminder-notification-service-1"
  ],
  "src/use-cases/event-use-cases.ts": [
    "event-use-cases-1",
    "event-use-cases-2",
    "event-use-cases-3",
    "event-use-cases-4",
    "event-use-cases-5"
  ],
  "src/use-cases/reminder-use-cases.ts": [
    "reminder-use-cases-1",
    "reminder-use-cases-2",
    "reminder-use-cases-3",
    "reminder-use-cases-4",
    "reminder-use-cases-5"
  ],
  "src/use-cases/task-use-cases.ts": [
    "task-use-cases-1",
    "task-use-cases-2",
    "task-use-cases-3",
    "task-use-cases-4"
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
console.log('Sheet 043 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
