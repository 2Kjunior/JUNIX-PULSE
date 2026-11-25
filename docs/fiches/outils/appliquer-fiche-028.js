// Applies sheet 028 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-028.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-028-finitions-planning-et-reglages.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/planning-settings-rules.ts": "prefs-rules",
  "src/domain/rules/__tests__/planning-settings-rules.test.ts": "prefs-test",
  "src/components/settings/PlanningSetting.tsx": "prefs-card",
  "src/features/people/relation-label.ts": "relation-label"
};
const edits = {
  "src/domain/rules/planning-move-rules.ts": [
    "move-1",
    "move-2",
    "move-3",
    "move-4"
  ],
  "src/domain/rules/person-rules.ts": [
    "person-1"
  ],
  "src/database/migrations.ts": [
    "mig-1"
  ],
  "src/domain/entities/index.ts": [
    "ent-1",
    "ent-2"
  ],
  "src/repositories/settings-repository.ts": [
    "repo-1",
    "repo-2",
    "repo-3"
  ],
  "src/services/backup-service.ts": [
    "bk-1"
  ],
  "src/app/settings/index.tsx": [
    "set-1",
    "set-2",
    "set-3",
    "set-4",
    "set-5",
    "set-6",
    "set-7",
    "set-8",
    "set-9"
  ],
  "src/app/(tabs)/calendar.tsx": [
    "cal-1",
    "cal-2",
    "cal-3",
    "cal-4",
    "cal-5",
    "cal-6",
    "cal-7",
    "cal-8",
    "cal-9",
    "cal-10",
    "cal-11",
    "cal-12"
  ],
  "src/features/planning/use-planning-move.ts": [
    "hook-1",
    "hook-2",
    "hook-3"
  ],
  "src/use-cases/planning-move-use-cases.ts": [
    "uc-1",
    "uc-2"
  ],
  "src/components/planning/DayTimeGrid.tsx": [
    "day-1",
    "day-2",
    "day-3",
    "day-4"
  ],
  "src/components/planning/MonthView.tsx": [
    "month-1",
    "month-2",
    "month-3",
    "month-4",
    "month-5"
  ],
  "src/components/schedule/WeeklyTimetableGrid.tsx": [
    "wk-1",
    "wk-2",
    "wk-3",
    "wk-4",
    "wk-5",
    "wk-6",
    "wk-7",
    "wk-8",
    "wk-9",
    "wk-10"
  ],
  "src/components/planning/PlanningCard.tsx": [
    "card-1",
    "card-2",
    "card-3",
    "card-4"
  ],
  "src/domain/rules/gesture-tip-rules.ts": [
    "tip-1",
    "tip-2"
  ],
  "src/domain/rules/mascot-message-catalog.ts": [
    "catfr-1"
  ],
  "src/domain/rules/mascot-message-catalog-en.ts": [
    "caten-1"
  ],
  "src/features/share/ShareItemCard.tsx": [
    "share-1",
    "share-2",
    "share-3"
  ],
  "src/app/(tabs)/people.tsx": [
    "ppl-1",
    "ppl-2"
  ],
  "src/app/people/[id].tsx": [
    "pid-1",
    "pid-2"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "fr-1",
    "fr-2"
  ],
  "src/i18n/messages-rest-en.ts": [
    "en-1",
    "en-2"
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
