// Applies sheet 010 from its own code blocks (each block follows a "<!-- bloc: name -->" marker).
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const sheet = fs
  .readFileSync(path.join(root, 'docs/fiches/FICHE-010-animation-lancement-orbe.md'), 'utf8')
  .replace(/\r\n/g, '\n');
const blocks = {};
for (const m of sheet.matchAll(/<!-- bloc: ([\w-]+) -->\n+```[a-z]*\n([\s\S]*?)\n```/g)) blocks[m[1]] = m[2];

const whole = {
  'src/constants/orb-logo.ts': 'orb-logo',
  'src/components/ui/OrbMark.tsx': 'orb-mark',
  'src/components/ui/PulseLogo.tsx': 'pulse-logo',
  'src/features/launch/splash-constants.ts': 'splash-constants',
  'src/features/launch/SplashAnimation.tsx': 'splash-animation',
  'assets/logo/orbe-demarrage.svg': 'orbe-demarrage',
  'src/__tests__/launch-orb.test.tsx': 'test',
};
const edits = {
  'src/app/_layout.tsx': ['layout-react', 'layout-imports', 'layout-hook', 'layout-settings', 'layout-splash'],
  'app.json': ['app-splash'],
  'src/__tests__/app-icons.test.ts': ['icons-test'],
  'jest.setup.js': ['jest-setup'],
};
for (const name of Object.values(whole)) if (!(name in blocks)) throw new Error('missing block ' + name);

// Check every edit first, write nothing until all of them apply
const edited = {};
for (const [file, names] of Object.entries(edits)) {
  const raw = fs.readFileSync(path.join(root, file), 'utf8');
  const crlf = raw.includes('\r\n');
  let text = raw.replace(/\r\n/g, '\n');
  for (const name of names) {
    const before = blocks[`${name}-avant`];
    const after = blocks[`${name}-apres`];
    if (before === undefined || after === undefined) throw new Error('missing block ' + name);
    const count = text.split(before).length - 1;
    if (count !== 1) throw new Error(`${file}: ${name} found ${count} times`);
    text = text.replace(before, () => after);
  }
  if (file.endsWith('.json')) JSON.parse(text);
  edited[file] = crlf ? text.replace(/\n/g, '\r\n') : text;
}

for (const [file, name] of Object.entries(whole)) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), blocks[name] + '\n');
}
for (const [file, text] of Object.entries(edited)) fs.writeFileSync(path.join(root, file), text);
console.log('applied');
