// Applies sheet 033 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Apply sheet 032 first. Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-033.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-033-temps-pour-le-faire-et-focus.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/duration-rules.ts": "new-duration-rules",
  "src/domain/rules/__tests__/duration-rules.test.ts": "new-duration-rules-test",
  "src/components/create/form/DurationField.tsx": "new-durationfield",
  "src/features/focus/open-focus.ts": "new-open-focus"
};
const edits = {
  "src/__tests__/item-forms.test.ts": [
    "item-forms-test-1"
  ],
  "src/app/(tabs)/calendar.tsx": [
    "calendar-1",
    "calendar-2"
  ],
  "src/app/focus.tsx": [
    "focus-1",
    "focus-2",
    "focus-3",
    "focus-4",
    "focus-5",
    "focus-6"
  ],
  "src/app/tasks/[id].tsx": [
    "-id--1",
    "-id--2"
  ],
  "src/components/planning/DayTimeGrid.tsx": [
    "daytimegrid-1",
    "daytimegrid-2",
    "daytimegrid-3",
    "daytimegrid-4",
    "daytimegrid-5"
  ],
  "src/components/planning/MonthView.tsx": [
    "monthview-1",
    "monthview-2"
  ],
  "src/components/schedule/WeeklyTimetableGrid.tsx": [
    "weeklytimetablegrid-1"
  ],
  "src/components/todo/TodoRow.tsx": [
    "todorow-1",
    "todorow-2",
    "todorow-3"
  ],
  "src/constants/item-forms.ts": [
    "item-forms-1",
    "item-forms-2"
  ],
  "src/database/migrations.ts": [
    "migrations-1"
  ],
  "src/domain/entities/index.ts": [
    "index-1",
    "index-2",
    "index-3"
  ],
  "src/domain/rules/__tests__/notification-level-rules.test.ts": [
    "notification-level-rules-test-1",
    "notification-level-rules-test-2"
  ],
  "src/domain/rules/notification-level-rules.ts": [
    "notification-level-rules-1"
  ],
  "src/domain/rules/todo-list-rules.ts": [
    "todo-list-rules-1",
    "todo-list-rules-2",
    "todo-list-rules-3",
    "todo-list-rules-4"
  ],
  "src/features/create/TodoForm.tsx": [
    "todoform-1",
    "todoform-2",
    "todoform-3",
    "todoform-4",
    "todoform-5",
    "todoform-6"
  ],
  "src/features/create/edit-loaders.ts": [
    "edit-loaders-1"
  ],
  "src/features/todo/TodoTabScreen.tsx": [
    "todotabscreen-1",
    "todotabscreen-2"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1",
    "messages-rest-en-2"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1",
    "messages-rest-fr-2"
  ],
  "src/repositories/reminder-repository.ts": [
    "reminder-repository-1",
    "reminder-repository-2",
    "reminder-repository-3",
    "reminder-repository-4",
    "reminder-repository-5",
    "reminder-repository-6"
  ],
  "src/repositories/task-repository.ts": [
    "task-repository-1",
    "task-repository-2"
  ],
  "src/services/backup-service.ts": [
    "backup-service-1"
  ],
  "src/use-cases/reminder-use-cases.ts": [
    "reminder-use-cases-1",
    "reminder-use-cases-2",
    "reminder-use-cases-3",
    "reminder-use-cases-4"
  ]
};
// Files the sheet removes: none
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
console.log('Sheet 033 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
