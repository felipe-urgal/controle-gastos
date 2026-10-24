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

const darkBlock = extractBlock(/\.authenticated-shell\s*\{([\s\S]*?)\n\}/);
const lightBlock = extractBlock(
  /\[data-theme="light"\]\s+\.authenticated-shell\s*\{([\s\S]*?)\n\}/,
);

const themes = {
  dark: parseHexTokens(darkBlock),
  light: parseHexTokens(lightBlock),
};

function token(theme: ThemeTokens, name: string) {
  const value = theme[name];
  if (!value) throw new Error(`Token Orbit --${name} não encontrado`);
  return value;
}

describe('tokens Orbit da área autenticada', () => {
  it('só define layout e superfícies da navegação (a identidade vem de globals.css)', () => {
    for (const block of [darkBlock, lightBlock]) {
      expect(block).not.toMatch(/--orbit-(primary|on-primary|focus)/);
      expect(block).not.toMatch(/--primary:/);
      expect(block).not.toMatch(/--primary-subtle:/);
      expect(block).not.toMatch(/--income:/);
      expect(block).not.toMatch(/--expense:/);
    }
  });

  it('mantém as superfícies de navegação definidas nos dois temas', () => {
    for (const theme of Object.values(themes)) {
      expect(token(theme, 'orbit-navigation-surface')).toMatch(/^#[0-9a-f]{6}$/);
      expect(token(theme, 'orbit-navigation-raised')).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
