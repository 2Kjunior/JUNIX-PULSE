// Applies sheet 044 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
// Every replacement is checked first (found exactly once); nothing is written if one fails.
// Usage, from the project folder: node docs/fiches/outils/appliquer-fiche-044.js .
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-044-nouvel-onboarding.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  "src/features/onboarding/OnboardingFrame.tsx": "new-onboardingframe",
  "src/constants/onboarding-features.ts": "new-onboarding-features",
  "src/app/(onboarding)/try.tsx": "new-try"
};
const edits = {
  "src/__tests__/coherence-021.test.ts": [
    "coherence-021-test-1",
    "coherence-021-test-2"
  ],
  "src/__tests__/onboarding.test.tsx": [
    "onboarding-test-1",
    "onboarding-test-2",
    "onboarding-test-3",
    "onboarding-test-4"
  ],
  "src/app/(onboarding)/_layout.tsx": [
    "-layout-1"
  ],
  "src/app/(onboarding)/discover.tsx": [
    "discover-1",
    "discover-2"
  ],
  "src/app/(onboarding)/index.tsx": [
    "index-1",
    "index-2",
    "index-3"
  ],
  "src/app/(onboarding)/permissions.tsx": [
    "permissions-1"
  ],
  "src/app/(onboarding)/personalize.tsx": [
    "personalize-1",
    "personalize-2",
    "personalize-3",
    "personalize-4",
    "personalize-5",
    "personalize-6",
    "personalize-7"
  ],
  "src/app/dev/mascot.tsx": [
    "mascot-1"
  ],
  "src/domain/rules/__tests__/mascot-guide-rules.test.ts": [
    "mascot-guide-rules-test-1",
    "mascot-guide-rules-test-2",
    "mascot-guide-rules-test-3",
    "mascot-guide-rules-test-4",
    "mascot-guide-rules-test-5",
    "mascot-guide-rules-test-6",
    "mascot-guide-rules-test-7",
    "mascot-guide-rules-test-8",
    "mascot-guide-rules-test-9"
  ],
  "src/domain/rules/mascot-guide-rules.ts": [
    "mascot-guide-rules-1",
    "mascot-guide-rules-2",
    "mascot-guide-rules-3",
    "mascot-guide-rules-4",
    "mascot-guide-rules-5",
    "mascot-guide-rules-6"
  ],
  "src/domain/rules/mascot-message-catalog-en.ts": [
    "mascot-message-catalog-en-1",
    "mascot-message-catalog-en-2"
  ],
  "src/domain/rules/mascot-message-catalog.ts": [
    "mascot-message-catalog-1",
    "mascot-message-catalog-2"
  ],
  "src/i18n/messages-rest-en.ts": [
    "messages-rest-en-1"
  ],
  "src/i18n/messages-rest-fr.ts": [
    "messages-rest-fr-1"
  ]
};
// Files the sheet removes: nothing uses them any more
const removed = [
  "src/app/(onboarding)/schedule.tsx"
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
console.log('Sheet 044 applied: ' + Object.keys(whole).length + ' new files, ' + Object.keys(edited).length + ' files edited, ' + removed.length + ' removed.');
