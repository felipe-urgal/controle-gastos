import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(
  fileURLToPath(new URL('./globals.css', import.meta.url)),
  'utf8',
);

type ThemeTokens = Record<string, string>;

function extractBlock(pattern: RegExp) {
  const block = stylesheet.match(pattern)?.[1];
  if (!block) throw new Error('Bloco de tema não encontrado em globals.css');
  return block;
}

function parseHexTokens(block: string): ThemeTokens {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [
      match[1],
      match[2].toLowerCase(),
    ]),
  );
}

const themes = {
  dark: parseHexTokens(extractBlock(/:root\s*\{([\s\S]*?)\n\}/)),
  light: parseHexTokens(
    extractBlock(/\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/),
  ),
};

const supportedSurfaces = [
  'background',
  'surface',
  'surface-raised',
  'surface-subtle',
] as const;

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map(
    (start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function token(theme: ThemeTokens, name: string) {
  const value = theme[name];
  if (!value) throw new Error(`Token --${name} não encontrado`);
  return value;
}

describe('contraste dos tokens do design system', () => {
  it('mantém text-muted e text-subtle em pelo menos 4.5:1 nas superfícies suportadas', () => {
    for (const [themeName, theme] of Object.entries(themes)) {
      for (const textToken of ['text-muted', 'text-subtle']) {
        for (const backgroundName of supportedSurfaces) {
          expect(
            contrastRatio(token(theme, textToken), token(theme, backgroundName)),
            `${themeName}: --${textToken} sobre --${backgroundName}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('mantém a borda forte identificável nos controles em dark e light', () => {
    for (const [themeName, theme] of Object.entries(themes)) {
      for (const adjacentName of ['background', 'surface', 'surface-raised']) {
        expect(
          contrastRatio(token(theme, 'border-strong'), token(theme, adjacentName)),
          `${themeName}: --border-strong sobre --${adjacentName}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('mantém texto dos estados semânticos em pelo menos 4.5:1', () => {
    const pairs = [
      ['income', 'primary-subtle'],
      ['expense', 'danger-subtle'],
      ['warning', 'warning-subtle'],
      ['on-primary', 'primary'],
    ] as const;

    for (const [themeName, theme] of Object.entries(themes)) {
      for (const [foregroundName, backgroundName] of pairs) {
        expect(
          contrastRatio(token(theme, foregroundName), token(theme, backgroundName)),
          `${themeName}: --${foregroundName} sobre --${backgroundName}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
