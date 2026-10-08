import { describe, expect, it } from 'vitest';
import { getAppNavigation } from '@/app/components/layout/app-navigation';
import { chooseGlobalSearchInitialIndex, normalizeGlobalSearchMatch, scoreGlobalSearchMatch } from '@/app/lib/search/global-search-ranking';

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

describe('sinônimos de navegação', () => {
  it.each([
    ['payroll', ['salário', 'folha', 'holerite']],
    ['net-worth', ['patrimônio líquido']],
    ['merchants', ['loja', 'merchant', 'comércio']],
    ['transactions', ['lançamento']],
    ['recurrences', ['assinatura', 'recorrente']],
  ])('inclui os termos em português para %s', (key, terms) => {
    const item = getAppNavigation().find((entry) => entry.key === key);
    expect(item).toBeDefined();
    for (const term of terms) {
      expect(normalizeGlobalSearchMatch(item?.keywords ?? '')).toContain(normalizeGlobalSearchMatch(term));
    }
  });
});

describe('seleção inicial entre ações, páginas e dados', () => {
  it('prioriza um dado exato sobre navegação por keyword ou contains', () => {
    const candidates = [
      { kind: 'action' as const, title: 'Nova transação', keywords: 'conta' },
      { kind: 'navigation' as const, title: 'Contas', keywords: 'conta' },
      { kind: 'data' as const, title: 'Conta' },
    ];
    expect(chooseGlobalSearchInitialIndex(candidates, 'conta')).toBe(2);
  });

  it('mantém ação/página de nome exato antes de dado de mesmo score', () => {
    const candidates = [
      { kind: 'action' as const, title: 'Importar transações' },
      { kind: 'data' as const, title: 'Importar transações' },
    ];
    expect(chooseGlobalSearchInitialIndex(candidates, 'Importar transações')).toBe(0);
  });

  it('considera alias e match fuzzy sem esconder correspondência forte', () => {
    expect(chooseGlobalSearchInitialIndex([
      { kind: 'navigation', title: 'Transações', keywords: 'loja' },
      { kind: 'data', title: 'Corrida aplicativo', matchedText: 'Loja Central' },
    ], 'Loja Central')).toBe(1);
    expect(chooseGlobalSearchInitialIndex([
      { kind: 'data', title: '#férias' },
    ], 'férias')).toBe(0);
  });

  it('mantém fallback determinístico para lista vazia ou sem correspondência', () => {
    expect(chooseGlobalSearchInitialIndex([], 'texto')).toBe(-1);
    expect(chooseGlobalSearchInitialIndex([
      { kind: 'navigation', title: 'Contas' },
      { kind: 'data', title: 'Outros' },
    ], 'nenhum')).toBe(0);
  });
});
