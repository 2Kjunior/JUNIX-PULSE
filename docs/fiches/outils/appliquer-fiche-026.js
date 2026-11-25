// Applies sheet 026 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-026.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-026-planning-jour-semaine-mois.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/domain/rules/planning-move-rules.ts": "rules",
  "src/domain/rules/__tests__/planning-move-rules.test.ts": "rules-test",
  "src/use-cases/planning-move-use-cases.ts": "use-cases",
  "src/features/planning/use-planning-move.ts": "move-hook",
  "src/components/planning/DraggableBlock.tsx": "draggable",
  "src/components/planning/DayTimeGrid.tsx": "day-grid",
  "src/components/planning/MonthView.tsx": "month-view"
};
const edits = {
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
    "cal-12",
    "cal-13",
    "cal-14",
    "cal-15"
  ],
  "src/domain/rules/gesture-tip-rules.ts": [
    "tip-1",
    "tip-2"
  ],
  "src/domain/rules/mascot-message-catalog.ts": [
    "cat-fr-1"
  ],
  "src/domain/rules/mascot-message-catalog-en.ts": [
    "cat-en-1"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "fr-1"
  ],
  "src/i18n/messages-rest-en.ts": [
    "en-1"
  ]
};
const removed = ["src/components/calendar/CalendarTimetable.tsx"];
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
