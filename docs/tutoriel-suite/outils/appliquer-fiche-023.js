// Applies sheet 023 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/tutoriel-suite/outils/appliquer-fiche-023.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-023-types-de-moment-et-niveaux-d-alerte.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/moment-kind-rules.ts": "kind-rules",
  "src/domain/rules/__tests__/moment-kind-rules.test.ts": "kind-test",
  "src/domain/rules/notification-level-rules.ts": "level-rules",
  "src/domain/rules/__tests__/alert-hierarchy.test.ts": "level-test",
  "src/constants/moment-kinds.ts": "kind-looks",
  "src/components/create/form/AlertLevelField.tsx": "level-field",
  "src/components/settings/AlertDefaultsSetting.tsx": "defaults-setting"
};
const edits = {
  "src/domain/enums/index.ts": [
    "enums"
  ],
  "src/domain/entities/index.ts": [
    "ent-enums",
    "ent-import",
    "ent-reminder",
    "ent-event",
    "ent-settings"
  ],
  "src/database/migrations.ts": [
    "migration"
  ],
  "src/repositories/reminder-repository.ts": [
    "rr-create-type",
    "rr-update-type",
    "rr-import",
    "rr-row",
    "rr-insert",
    "rr-insert-2",
    "rr-update"
  ],
  "src/repositories/event-repository.ts": [
    "er-row",
    "er-insert",
    "er-insert-2",
    "er-update",
    "er-import"
  ],
  "src/repositories/settings-repository.ts": [
    "sr-row",
    "sr-update",
    "sr-import"
  ],
  "src/services/backup-service.ts": [
    "bk-rem",
    "bk-ev",
    "bk-set",
    "bk-enum",
    "bk-enum-ev"
  ],
  "src/use-cases/reminder-use-cases.ts": [
    "ru-create-type",
    "ru-create",
    "ru-update-type",
    "ru-update",
    "ru-import"
  ],
  "src/use-cases/event-use-cases.ts": [
    "eu-create-type",
    "eu-update-type",
    "eu-create",
    "eu-update",
    "eu-import"
  ],
  "src/domain/rules/reminder-notification-rules.ts": [
    "rn-repeat-sig",
    "rn-repeat-level",
    "rn-plan-sig",
    "rn-plan-level",
    "rn-repeat-call",
    "rn-helper",
    "rn-import"
  ],
  "src/domain/rules/item-notification-rules.ts": [
    "in-import",
    "in-input",
    "in-sig",
    "in-level",
    "in-leave",
    "in-before"
  ],
  "src/domain/rules/habit-notification-rules.ts": [
    "hn-sig",
    "hn-level",
    "hn-import"
  ],
  "src/services/item-notification-service.ts": [
    "svc-item"
  ],
  "src/services/habit-notification-service.ts": [
    "svc-habit"
  ],
  "src/services/reminder-notification-service.ts": [
    "svc-rem"
  ],
  "src/constants/item-forms.ts": [
    "if-types",
    "if-moment"
  ],
  "src/__tests__/item-forms.test.ts": [
    "if-test",
    "if-test-2"
  ],
  "src/features/create/edit-loaders.ts": [
    "ld-import",
    "ld-todo-type",
    "ld-rem",
    "ld-task",
    "ld-moment-type",
    "ld-moment"
  ],
  "src/features/create/TodoForm.tsx": [
    "tf-import",
    "tf-types",
    "tf-state",
    "tf-load",
    "tf-update",
    "tf-create",
    "tf-field"
  ],
  "src/features/create/MomentForm.tsx": [
    "mf-import",
    "mf-import-2",
    "mf-state",
    "mf-load",
    "mf-dictate",
    "mf-understood",
    "mf-update",
    "mf-create",
    "mf-title",
    "mf-more",
    "mf-section"
  ],
  "src/app/events/[id].tsx": [
    "ev-import",
    "ev-kind"
  ],
  "src/app/(tabs)/calendar.tsx": [
    "ca-import",
    "ca-color"
  ],
  "src/components/calendar/CalendarTimetable.tsx": [
    "tt-import",
    "tt-badge"
  ],
  "src/app/settings/index.tsx": [
    "st-import",
    "st-handler",
    "st-row"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "fr"
  ],
  "src/i18n/messages-rest-en.ts": [
    "en"
  ]
};
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
for (const file of removed) if (fs.existsSync(path.join(root, file))) fs.unlinkSync(path.join(root, file));
console.log('applied');
