// Applies sheet 031 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Then it composes the sounds (scripts/sons/composer-sons.js) into assets/sounds.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-031.js .
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-031-sons.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "scripts/sons/composer-sons.js": "new-composer-sons",
  "src/domain/rules/sound-rules.ts": "new-sound-rules",
  "src/domain/rules/__tests__/sound-rules.test.ts": "new-sound-rules-test",
  "src/components/settings/SoundSetting.tsx": "new-soundsetting"
};
const edits = {
  "app.json": [
    "app-1"
  ],
  "jest.setup.js": [
    "jest-setup-1"
  ],
  "src/__tests__/finishing-touches.test.tsx": [
    "finishing-touches-test-1",
    "finishing-touches-test-2"
  ],
  "src/__tests__/notification-sound-service.test.ts": [
    "notification-sound-service-test-1"
  ],
  "src/__tests__/reminder-notification-service.test.ts": [
    "reminder-notification-service-test-1",
    "reminder-notification-service-test-2"
  ],
  "src/app/_layout.tsx": [
    "-layout-1"
  ],
  "src/app/settings/index.tsx": [
    "index-1",
    "index-2",
    "index-3",
    "index-4",
    "index-5"
  ],
  "src/components/create/form/AlertLevelField.tsx": [
    "alertlevelfield-1",
    "alertlevelfield-2"
  ],
  "src/components/planning/DayTimeGrid.tsx": [
    "daytimegrid-1",
    "daytimegrid-2"
  ],
  "src/components/planning/DraggableBlock.tsx": [
    "draggableblock-1",
    "draggableblock-2"
  ],
  "src/components/planning/MonthView.tsx": [
    "monthview-1",
    "monthview-2"
  ],
  "src/components/planning/PlanningCard.tsx": [
    "planningcard-1",
    "planningcard-2",
    "planningcard-3",
    "planningcard-4"
  ],
  "src/components/schedule/WeeklyTimetableGrid.tsx": [
    "weeklytimetablegrid-1"
  ],
  "src/components/todo/TodoRow.tsx": [
    "todorow-1"
  ],
  "src/database/migrations.ts": [
    "migrations-1"
  ],
  "src/domain/entities/index.ts": [
    "indexx-1",
    "indexx-2"
  ],
  "src/domain/rules/item-notification-rules.ts": [
    "item-notification-rules-1",
    "item-notification-rules-2",
    "item-notification-rules-3",
    "item-notification-rules-4"
  ],
  "src/domain/rules/todo-list-rules.ts": [
    "todo-list-rules-1",
    "todo-list-rules-2"
  ],
  "src/features/reminders/offer-exact-alarms.ts": [
    "offer-exact-alarms-1"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1",
    "messages-rest-en-2"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1",
    "messages-rest-fr-2"
  ],
  "src/repositories/settings-repository.ts": [
    "settings-repository-1",
    "settings-repository-2",
    "settings-repository-3"
  ],
  "src/services/backup-service.ts": [
    "backup-service-1"
  ],
  "src/services/habit-notification-service.ts": [
    "habit-notification-service-1",
    "habit-notification-service-2",
    "habit-notification-service-3",
    "habit-notification-service-4"
  ],
  "src/services/item-notification-service.ts": [
    "item-notification-service-1",
    "item-notification-service-2",
    "item-notification-service-3",
    "item-notification-service-4"
  ],
  "src/services/notification-service.ts": [
    "notification-service-1",
    "notification-service-2",
    "notification-service-3",
    "notification-service-4",
    "notification-service-5",
    "notification-service-6",
    "notification-service-7",
    "notification-service-8",
    "notification-service-9",
    "notification-service-10"
  ],
  "src/services/reminder-notification-service.ts": [
    "reminder-notification-service-1",
    "reminder-notification-service-2",
    "reminder-notification-service-3",
    "reminder-notification-service-4"
  ],
  "src/services/sound/NotificationSoundService.ts": [
    "notificationsoundservice-1",
    "notificationsoundservice-2",
    "notificationsoundservice-3",
    "notificationsoundservice-4",
    "notificationsoundservice-5",
    "notificationsoundservice-6"
  ],
  "src/services/sound/notification-sound-constants.ts": [
    "notification-sound-constants-1"
  ],
  "src/styles/settings/settings-styles.ts": [
    "settings-styles-1"
  ]
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
execFileSync(process.execPath, [path.join(root, 'scripts/sons/composer-sons.js'), path.join(root, 'assets/sounds')], { stdio: 'inherit' });
console.log('Sheet 031 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, sounds composed.');
