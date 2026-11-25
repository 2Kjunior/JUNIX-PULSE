// Applies sheet 027 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-027.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-027-planning-glowcards-et-mois.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/constants/planning-look.ts": "look",
  "src/components/planning/PlanningCard.tsx": "card",
  "src/components/planning/DayTimeGrid.tsx": "day-grid",
  "src/components/planning/MonthView.tsx": "month-view"
};
const edits = {
  "src/components/ui/GlowCard.tsx": [
    "glow-1",
    "glow-2",
    "glow-3",
    "glow-4",
    "glow-5"
  ],
  "src/domain/rules/planning-move-rules.ts": [
    "rules-1",
    "rules-2",
    "rules-3",
    "rules-4"
  ],
  "src/domain/rules/__tests__/planning-move-rules.test.ts": [
    "test-1",
    "test-2"
  ],
  "src/components/planning/DraggableBlock.tsx": [
    "drag-1",
    "drag-2",
    "drag-3",
    "drag-4",
    "drag-5"
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
  "src/i18n/messages-rest-fr.ts": [
    "fr-1"
  ],
  "src/i18n/messages-rest-en.ts": [
    "en-1"
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
