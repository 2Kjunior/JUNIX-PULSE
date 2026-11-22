/**
 * The icons of the app: every image app.json names exists, at the size Android and the web
 * expect, and the ones drawn on top of something else keep a transparent background.
 */

// The project gives tests no Node types: like the splash test, these are declared and required
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

/** Width, height and whether the PNG has an alpha channel (colour type 4 or 6). */
function pngInfo(relative: string) {
  const bytes = fs.readFileSync(path.join(root, relative));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), alpha: bytes[25] === 4 || bytes[25] === 6 };
}

function pluginOptions(name: string): Record<string, unknown> {
  const plugin = appJson.expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === name);
  return plugin[1];
}

describe('app icons', () => {
  it('uses the orb everywhere, at the expected sizes', () => {
    const android = appJson.expo.android.adaptiveIcon;
    expect(pngInfo(appJson.expo.icon)).toMatchObject({ width: 1024, height: 1024 });
    expect(pngInfo(android.foregroundImage)).toMatchObject({ width: 1024, height: 1024, alpha: true });
    expect(pngInfo(android.monochromeImage)).toMatchObject({ width: 1024, height: 1024, alpha: true });
    expect(pngInfo(appJson.expo.web.favicon)).toMatchObject({ width: 48, height: 48 });
  });

  it('gives notifications a transparent silhouette, and the launch screen the orb', () => {
    expect(pngInfo(pluginOptions('expo-notifications').icon as string)).toEqual({ width: 96, height: 96, alpha: true });
    const splash = pluginOptions('expo-splash-screen');
    expect(pngInfo(splash.image as string)).toMatchObject({ width: 1024, height: 1024, alpha: true });
  });

  it('keeps the drawings the images are made from', () => {
    for (const source of ['orbe-icone', 'orbe-android-avant-plan', 'orbe-une-couleur', 'orbe-notification', 'orbe-demarrage']) {
      expect(fs.existsSync(path.join(root, 'assets', 'logo', `${source}.svg`))).toBe(true);
    }
  });
});
