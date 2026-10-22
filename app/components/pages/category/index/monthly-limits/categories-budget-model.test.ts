import { describe, expect, it } from 'vitest';

import {
  budgetPace,
  buildAttentionRows,
  countBudgetStates,
  filterBudgetRows,
  monthElapsedFraction,
} from '@/app/components/pages/category/index/monthly-limits/categories-budget-model';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';

function item(name: string, realized: number, limit: number | null, extra: Partial<CategoryMonthlyLimitItem> & { active?: boolean } = {}): CategoryMonthlyLimitItem {
  const planning = limit === null ? null : Math.round((realized / Math.max(limit, 1)) * 1000) / 10;
  return {
    category: { id: name, name, color: '#000000', icon: 'tag', isActive: extra.active ?? true },
    currency: 'BRL',
    limit: limit === null ? null : { id: `l-${name}`, amount: limit, currency: 'BRL' },
    realized,
    committed: 0,
    consumption: realized,
    remaining: limit === null ? null : limit - realized,
    available: limit === null ? null : limit - realized,
    percentage: planning,
    planningPercentage: planning,
    isOverBudget: limit !== null && realized > limit,
    ...extra,
  };
}

const list = [
  item('Mercado', 60_000, 100_000),
  item('Lazer', 120_000, 100_000),
  item('Moradia', 100_000, 100_000),
  item('Educação', 0, null),
  item('Saúde', 85_000, 100_000),
  item('Antiga', 5_000, 10_000, { active: false }),
];

describe('countBudgetStates', () => {
  it('separa dentro, perto (80% ou mais), estourou e sem limite', () => {
    expect(countBudgetStates(list)).toEqual({ ok: 2, near: 2, over: 1, noLimit: 1 });
  });
});

describe('monthElapsedFraction', () => {
  const today = { year: 2026, month: 10, day: 22 };

  it('mês atual é a fração do mês, passado é 1 e futuro é 0', () => {
    expect(monthElapsedFraction('2026-10', today)).toBeCloseTo(22 / 31);
    expect(monthElapsedFraction('2026-09', today)).toBe(1);
    expect(monthElapsedFraction('2026-11', today)).toBe(0);
  });

  it('devolve null para período inválido', () => {
    expect(monthElapsedFraction('abc', today)).toBeNull();
  });
});

describe('budgetPace', () => {
  it('estourou antes de qualquer outra leitura', () => {
    expect(budgetPace({ budget: 100, consumed: 120, elapsed: 0.2 })).toBe('OVER');
  });

  it('compara o consumo com o tempo decorrido, com folga de 10 pontos', () => {
    expect(budgetPace({ budget: 100, consumed: 60, elapsed: 0.45 })).toBe('AHEAD');
    expect(budgetPace({ budget: 100, consumed: 50, elapsed: 0.45 })).toBe('ON_TRACK');
  });

  it('sem orçamento, mês encerrado e mês que não começou', () => {
    expect(budgetPace({ budget: 0, consumed: 5, elapsed: 0.5 })).toBe('NO_BUDGET');
    expect(budgetPace({ budget: 100, consumed: 80, elapsed: 1 })).toBe('FINISHED');
    expect(budgetPace({ budget: 100, consumed: 0, elapsed: 0 })).toBe('NOT_STARTED');
  });
});

describe('filterBudgetRows', () => {
  it('ordena pelo uso do limite e deixa quem não tem limite por último', () => {
    expect(filterBudgetRows(list, { filter: 'all', query: '' }).map((row) => row.category.name)).toEqual([
      'Lazer',
      'Moradia',
      'Saúde',
      'Mercado',
      'Antiga',
      'Educação',
    ]);
  });

  it('filtra atenção, sem limite e inativas, sem misturar inativas nos outros filtros', () => {
    expect(filterBudgetRows(list, { filter: 'attention', query: '' }).map((row) => row.category.name)).toEqual(['Lazer', 'Moradia', 'Saúde']);
    expect(filterBudgetRows(list, { filter: 'no-limit', query: '' }).map((row) => row.category.name)).toEqual(['Educação']);
    expect(filterBudgetRows(list, { filter: 'inactive', query: '' }).map((row) => row.category.name)).toEqual(['Antiga']);
  });

  it('busca pelo nome sem diferenciar maiúsculas e acentos de caixa', () => {
    expect(filterBudgetRows(list, { filter: 'all', query: '  MERC ' }).map((row) => row.category.name)).toEqual(['Mercado']);
  });
});

describe('buildAttentionRows', () => {
  it('traz só ativas em estado crítico, limitadas a 5', () => {
    const many = Array.from({ length: 8 }, (_, index) => item(`Cat${index}`, 150_000 + index, 100_000));

    expect(buildAttentionRows(list).map((row) => row.category.name)).toEqual(['Lazer', 'Moradia', 'Saúde']);
    expect(buildAttentionRows(many)).toHaveLength(5);
  });
});
