import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(
  fileURLToPath(new URL('./orbit.css', import.meta.url)),
  'utf8',
);

type ThemeTokens = Record<string, string>;

function extractBlock(pattern: RegExp) {
  const block = stylesheet.match(pattern)?.[1];
  if (!block) throw new Error('Bloco Orbit não encontrado em orbit.css');
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
  dark: parseHexTokens(extractBlock(/\.authenticated-shell\s*\{([\s\S]*?)\n\}/)),
  light: parseHexTokens(
    extractBlock(/\[data-theme="light"\]\s+\.authenticated-shell\s*\{([\s\S]*?)\n\}/),
  ),
};

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
  if (!value) throw new Error(`Token Orbit --${name} não encontrado`);
  return value;
}

describe('tokens Orbit da área autenticada', () => {
  it('mantém a identidade Orbit legível no estado normal e hover', () => {
    for (const [themeName, theme] of Object.entries(themes)) {
      for (const backgroundName of ['orbit-primary', 'orbit-primary-hover']) {
        expect(
          contrastRatio(token(theme, 'orbit-on-primary'), token(theme, backgroundName)),
          `${themeName}: --orbit-on-primary sobre --${backgroundName}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('mantém o acento Orbit legível sobre a seleção sutil', () => {
    for (const [themeName, theme] of Object.entries(themes)) {
      expect(
        contrastRatio(
          token(theme, 'orbit-primary'),
          token(theme, 'orbit-primary-subtle'),
        ),
        `${themeName}: --orbit-primary sobre --orbit-primary-subtle`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('não redefine os tokens globais usados por semântica financeira', () => {
    expect(stylesheet).not.toMatch(/\n\s*--primary:/);
    expect(stylesheet).not.toMatch(/\n\s*--primary-subtle:/);
    expect(stylesheet).not.toMatch(/\n\s*--income:/);
    expect(stylesheet).not.toMatch(/\n\s*--expense:/);
  });
});
