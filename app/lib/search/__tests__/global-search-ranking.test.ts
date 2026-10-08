import { describe, expect, it } from 'vitest';
import { normalizeGlobalSearchMatch, scoreGlobalSearchMatch } from '@/app/lib/search/global-search-ranking';

describe('global search relevance', () => {
  it('prioriza igualdade, prefixo, contains e ausência de match', () => {
    expect(scoreGlobalSearchMatch('Café Central', 'Café Central')).toBe(400);
    expect(scoreGlobalSearchMatch('Café Central', 'café')).toBe(300);
    expect(scoreGlobalSearchMatch('Novo Café Central', 'café')).toBe(200);
    expect(scoreGlobalSearchMatch('Mercado', 'café')).toBe(0);
  });

  it('normaliza NFKC, espaços e maiúsculas sem remover acentos', () => {
    expect(normalizeGlobalSearchMatch('  ＣＡＦＥ́   Central  ')).toBe('café central');
    expect(scoreGlobalSearchMatch('Café', 'cafe')).toBe(0);
  });

  it('mantém acentos significativos nas palavras portuguesas', () => {
    for (const [accented, plain] of [
      ['Café', 'cafe'],
      ['Cartão', 'cartao'],
      ['Ação', 'acao'],
    ]) {
      expect(scoreGlobalSearchMatch(accented, accented.toLocaleLowerCase('pt-BR'))).toBe(400);
      expect(scoreGlobalSearchMatch(accented, plain)).toBe(0);
    }
  });

  it('não trata a string vazia como match universal', () => {
    expect(scoreGlobalSearchMatch('Mercado', '')).toBe(0);
    expect(scoreGlobalSearchMatch('', 'mercado')).toBe(0);
  });
});
