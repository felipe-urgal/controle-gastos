import { describe, expect, it } from 'vitest';

import { buildMonthPace } from '@/app/components/pages/dashboard/dashboard/dashboard-pace';

const days = (length: number, fill: Record<number, number>) =>
  Array.from({ length }, (_, index) => fill[index + 1] ?? 0);

describe('buildMonthPace', () => {
  it('acumula o gasto até hoje e projeta linearmente o fim do mês', () => {
    const pace = buildMonthPace({
      current: days(30, { 1: 10_000, 5: 20_000, 10: 10_000 }),
      previous: days(31, { 3: 5_000 }),
      budget: 0,
      relation: 'CURRENT',
      today: 10,
    });

    expect(pace.elapsedDays).toBe(10);
    expect(pace.cumulative).toHaveLength(10);
    expect(pace.spent).toBe(40_000);
    expect(pace.projected).toBe(120_000);
  });

  it('marca estouro do orçamento antes de qualquer outra leitura', () => {
    const pace = buildMonthPace({ current: days(30, { 2: 60_000 }), previous: days(31, {}), budget: 50_000, relation: 'CURRENT', today: 3 });

    expect(pace.status).toBe('OVER_BUDGET');
  });

  it('compara o gasto com o tempo decorrido quando há orçamento', () => {
    const base = { previous: days(31, {}), budget: 100_000, relation: 'CURRENT' as const };

    expect(buildMonthPace({ ...base, current: days(30, { 1: 40_000 }), today: 8 }).status).toBe('AHEAD');
    expect(buildMonthPace({ ...base, current: days(30, { 1: 40_000 }), today: 15 }).status).toBe('ON_TRACK');
  });

  it('sem orçamento compara com o mesmo ponto do mês anterior', () => {
    const base = { previous: days(31, { 2: 10_000 }), budget: 0, relation: 'CURRENT' as const, today: 5 };

    expect(buildMonthPace({ ...base, current: days(30, { 3: 20_000 }) }).status).toBe('AHEAD');
    expect(buildMonthPace({ ...base, current: days(30, { 3: 10_500 }) }).status).toBe('ON_TRACK');
    expect(buildMonthPace({ ...base, current: days(30, { 3: 10_000 }) }).previousSameDay).toBe(10_000);
  });

  it('mês passado usa todos os dias e não projeta', () => {
    const pace = buildMonthPace({ current: days(30, { 28: 7_000 }), previous: days(31, {}), budget: 50_000, relation: 'PAST', today: 3 });

    expect(pace.elapsedDays).toBe(30);
    expect(pace.status).toBe('FINISHED');
    expect(pace.projected).toBeNull();
  });

  it('mês futuro não começou', () => {
    const pace = buildMonthPace({ current: days(30, {}), previous: days(31, {}), budget: 0, relation: 'FUTURE', today: 20 });

    expect(pace).toMatchObject({ elapsedDays: 0, spent: 0, projected: null, status: 'NOT_STARTED' });
  });

  it('sem gasto e sem base fica sem dados', () => {
    const pace = buildMonthPace({ current: days(30, {}), previous: days(31, {}), budget: 0, relation: 'CURRENT', today: 5 });

    expect(pace.status).toBe('NO_DATA');
  });
});
