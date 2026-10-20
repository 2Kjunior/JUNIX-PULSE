/**
 * Tests unitaires pour Lot 9 (DEF-06) : Identité visuelle et assets de lancement.
 *
 * Couverture :
 * - Vérification de la transparence 100% (alpha = 0) sur les coins de splash-icon.png et android-icon-foreground.png
 * - Rendu de PulseLogo avec accessibilityLabel
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { PulseLogo } from '../components/ui/PulseLogo';
import { useAppStore } from '../store/app-store';

declare const require: (id: string) => any;
declare const Buffer: any;
declare const __dirname: string;

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function getCornerAlpha(filePath: string): number {
  const buffer = fs.readFileSync(filePath);
  let pos = 8;
  const chunks: any[] = [];
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') chunks.push(buffer.slice(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const decomp = zlib.inflateSync(Buffer.concat(chunks));
  return decomp[4];
}

describe('Lot 9 — Identité visuelle et lancement (DEF-06)', () => {
  const assetsDir = path.resolve(__dirname, '../../assets/images');

  it('garantit un fond transparent (alpha = 0) sur splash-icon.png pour éliminer le carré blanc', () => {
    const splashPath = path.join(assetsDir, 'splash-icon.png');
    expect(fs.existsSync(splashPath)).toBe(true);
    const cornerAlpha = getCornerAlpha(splashPath);
    expect(cornerAlpha).toBe(0);
  });

  it('garantit un fond transparent (alpha = 0) sur android-icon-foreground.png', () => {
    const fgPath = path.join(assetsDir, 'android-icon-foreground.png');
    expect(fs.existsSync(fgPath)).toBe(true);
    const cornerAlpha = getCornerAlpha(fgPath);
    expect(cornerAlpha).toBe(0);
  });

  it('rend correctement PulseLogo en mode statique avec accessibilité', () => {
    act(() => {
      useAppStore.setState({ themeMode: 'dark' });
    });

    let root: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      root = ReactTestRenderer.create(<PulseLogo size={64} mode="static" />);
    });

    const svg = root!.root.findByProps({ accessibilityLabel: 'Junix Pulse logo' });
    expect(svg).toBeDefined();
    expect(svg.props.width).toBe(64);
    expect(svg.props.height).toBe(64);
  });
});
