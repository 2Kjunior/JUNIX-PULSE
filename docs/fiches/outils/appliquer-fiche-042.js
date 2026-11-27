// Applies sheet 042 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-042.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-042-themes-de-couleurs.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/constants/color-themes.ts": "new-color-themes",
  "src/__tests__/color-themes.test.ts": "new-color-themes-test",
  "src/components/settings/ColorThemePicker.tsx": "new-colorthemepicker"
};
const edits = {
  "src/app/_layout.tsx": [
    "-layout-1"
  ],
  "src/app/habits/new.tsx": [
    "new-1",
    "new-2"
  ],
  "src/app/people/new.tsx": [
    "newx-1",
    "newx-2"
  ],
  "src/app/search.tsx": [
    "search-1",
    "search-2"
  ],
  "src/app/settings/index.tsx": [
    "index-1",
    "index-2",
    "index-3",
    "index-4"
  ],
  "src/components/schedule/WeeklyTimetableGrid.tsx": [
    "weeklytimetablegrid-1",
    "weeklytimetablegrid-2"
  ],
  "src/components/ui/AmbientBackground.tsx": [
    "ambientbackground-1",
    "ambientbackground-2",
    "ambientbackground-3",
    "ambientbackground-4"
  ],
  "src/components/ui/Button.tsx": [
    "button-1",
    "button-2",
    "button-3"
  ],
  "src/components/ui/GlassFloatingActionButton.tsx": [
    "glassfloatingactionbutton-1",
    "glassfloatingactionbutton-2",
    "glassfloatingactionbutton-3"
  ],
  "src/components/ui/GlowCard.tsx": [
    "glowcard-1",
    "glowcard-2"
  ],
  "src/constants/item-kinds.ts": [
    "item-kinds-1",
    "item-kinds-2"
  ],
  "src/constants/moment-kinds.ts": [
    "moment-kinds-1",
    "moment-kinds-2"
  ],
  "src/constants/palettes.ts": [
    "palettes-1",
    "palettes-2",
    "palettes-3",
    "palettes-4",
    "palettes-5"
  ],
  "src/database/migrations.ts": [
    "migrations-1"
  ],
  "src/domain/entities/index.ts": [
    "indexx-1",
    "indexx-2"
  ],
  "src/features/launch/SplashAnimation.tsx": [
    "splashanimation-1",
    "splashanimation-2",
    "splashanimation-3"
  ],
  "src/features/mascot/PulseMascot.tsx": [
    "pulsemascot-1",
    "pulsemascot-2",
    "pulsemascot-3"
  ],
  "src/features/mascot/mascot-visuals.ts": [
    "mascot-visuals-1",
    "mascot-visuals-2"
  ],
  "src/hooks/use-theme.ts": [
    "use-theme-1",
    "use-theme-2"
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
    "backup-service-1"
  ],
  "src/services/notification-service.ts": [
    "notification-service-1",
    "notification-service-2",
    "notification-service-3",
    "notification-service-4",
    "notification-service-5",
    "notification-service-6",
    "notification-service-7",
    "notification-service-8"
  ],
  "src/store/app-store.ts": [
    "app-store-1",
    "app-store-2",
    "app-store-3"
  ],
  "src/styles/common/form-styles.ts": [
    "form-styles-1",
    "form-styles-2",
    "form-styles-3",
    "form-styles-4",
    "form-styles-5",
    "form-styles-6",
    "form-styles-7"
  ],
  "src/styles/reminders/new-reminder-styles.ts": [
    "new-reminder-styles-1",
    "new-reminder-styles-2",
    "new-reminder-styles-3",
    "new-reminder-styles-4"
  ],
  "src/styles/sanctum/sanctum-styles.ts": [
    "sanctum-styles-1",
    "sanctum-styles-2",
    "sanctum-styles-3",
    "sanctum-styles-4",
    "sanctum-styles-5",
    "sanctum-styles-6",
    "sanctum-styles-7",
    "sanctum-styles-8",
    "sanctum-styles-9",
    "sanctum-styles-10",
    "sanctum-styles-11",
    "sanctum-styles-12",
    "sanctum-styles-13"
  ],
  "src/styles/tabs/calendar-styles.ts": [
    "calendar-styles-1",
    "calendar-styles-2",
    "calendar-styles-3",
    "calendar-styles-4",
    "calendar-styles-5",
    "calendar-styles-6"
  ],
  "src/styles/tabs/people-styles.ts": [
    "people-styles-1",
    "people-styles-2"
  ],
  "src/styles/tabs/pulse-styles.ts": [
    "pulse-styles-1",
    "pulse-styles-2",
    "pulse-styles-3",
    "pulse-styles-4",
    "pulse-styles-5"
  ],
  "src/styles/tabs/tasks-styles.ts": [
    "tasks-styles-1",
    "tasks-styles-2"
  ],
  "src/styles/tabs/today-styles.ts": [
    "today-styles-1",
    "today-styles-2",
    "today-styles-3",
    "today-styles-4",
    "today-styles-5",
    "today-styles-6",
    "today-styles-7",
    "today-styles-8",
    "today-styles-9"
  ],
  "src/utils/color.ts": [
    "color-1"
  ],
  "src/widget/TodayWidget.tsx": [
    "todaywidget-1",
    "todaywidget-2",
    "todaywidget-3",
    "todaywidget-4",
    "todaywidget-5"
  ],
  "src/widget/widget-mascot-svg.ts": [
    "widget-mascot-svg-1",
    "widget-mascot-svg-2"
  ],
  "src/widget/widget-task-handler.tsx": [
    "widget-task-handler-1",
    "widget-task-handler-2",
    "widget-task-handler-3",
    "widget-task-handler-4"
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
console.log('Sheet 042 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
