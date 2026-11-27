// Applies sheet 037 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-037.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-037-sonneries-et-musiques.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/DeviceSounds.kt": "new-mod-devicesounds"
};
const edits = {
  "modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmService.kt": [
    "mod-alarmservice-1",
    "mod-alarmservice-2",
    "mod-alarmservice-3"
  ],
  "modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/AlarmStore.kt": [
    "mod-alarmstore-1",
    "mod-alarmstore-2",
    "mod-alarmstore-3",
    "mod-alarmstore-4"
  ],
  "modules/junix-alarm/android/src/main/java/expo/modules/junixalarm/JunixAlarmModule.kt": [
    "mod-junixalarmmodule-1",
    "mod-junixalarmmodule-2",
    "mod-junixalarmmodule-3"
  ],
  "modules/junix-alarm/index.ts": [
    "mod-index-1",
    "mod-index-2",
    "mod-index-3"
  ],
  "src/app/settings/index.tsx": [
    "index-1",
    "index-2"
  ],
  "src/components/create/form/PriorityField.tsx": [
    "priorityfield-1",
    "priorityfield-2",
    "priorityfield-3"
  ],
  "src/components/settings/SoundSetting.tsx": [
    "soundsetting-1",
    "soundsetting-2",
    "soundsetting-3",
    "soundsetting-4",
    "soundsetting-5",
    "soundsetting-6"
  ],
  "src/domain/rules/__tests__/sound-rules.test.ts": [
    "sound-rules-test-1",
    "sound-rules-test-2"
  ],
  "src/domain/rules/alarm-handover-rules.ts": [
    "alarm-handover-rules-1",
    "alarm-handover-rules-2",
    "alarm-handover-rules-3"
  ],
  "src/domain/rules/sound-rules.ts": [
    "sound-rules-1",
    "sound-rules-2",
    "sound-rules-3"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1"
  ],
  "src/services/alarm-bridge.ts": [
    "alarm-bridge-1",
    "alarm-bridge-2"
  ],
  "src/services/habit-notification-service.ts": [
    "habit-notification-service-1",
    "habit-notification-service-2"
  ],
  "src/services/item-notification-service.ts": [
    "item-notification-service-1",
    "item-notification-service-2"
  ],
  "src/services/reminder-notification-service.ts": [
    "reminder-notification-service-1",
    "reminder-notification-service-2"
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
console.log('Sheet 037 applied: ' + Object.keys(whole).length + ' new file, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
