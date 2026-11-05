import { describe, expect, it } from 'vitest';

import { projectNetWorthTarget } from '@/app/lib/net-worth/net-worth-target-domain';

const end = { year: 2026, month: 11 };
const rising = [
  { year: 2026, month: 9, total: 1_000_000 },
  { year: 2026, month: 10, total: 1_100_000 },
  { year: 2026, month: 11, total: 1_200_000 },
];

describe('projectNetWorthTarget', () => {
  it('projeta o mês em que a meta é atingida pelo ritmo médio', () => {
    const projection = projectNetWorthTarget({ points: rising, current: 1_200_000, target: 1_700_000, end });
    expect(projection).toEqual({ status: 'ON_TRACK', monthlyPace: 100_000, months: 5, reachYear: 2027, reachMonth: 4 });
  });

  it('arredonda os meses para cima e atravessa a virada de ano', () => {
    const projection = projectNetWorthTarget({ points: rising, current: 1_200_000, target: 1_250_001, end });
    expect(projection).toMatchObject({ status: 'ON_TRACK', months: 1, reachYear: 2026, reachMonth: 12 });
    const january = projectNetWorthTarget({ points: rising, current: 1_200_000, target: 1_350_000, end });
    expect(january).toMatchObject({ months: 2, reachYear: 2027, reachMonth: 1 });
  });

  it('meta já atingida não depende do histórico', () => {
    expect(projectNetWorthTarget({ points: [], current: 2_000_000, target: 1_700_000, end })).toEqual({ status: 'REACHED' });
  });

  it('histórico curto ou com buracos não projeta', () => {
    expect(projectNetWorthTarget({ points: rising.slice(1), current: 1_200_000, target: 2_000_000, end })).toEqual({
      status: 'INSUFFICIENT_HISTORY',
    });
    // Mês sem valor não vira zero: sobram dois pontos conhecidos.
    const gap = [rising[0], { year: 2026, month: 10, total: null }, rising[2]];
    expect(projectNetWorthTarget({ points: gap, current: 1_200_000, target: 2_000_000, end })).toEqual({
      status: 'INSUFFICIENT_HISTORY',
    });
  });

  it('ritmo zero ou negativo não chega lá', () => {
    const falling = [
      { year: 2026, month: 9, total: 1_300_000 },
      { year: 2026, month: 10, total: 1_250_000 },
      { year: 2026, month: 11, total: 1_200_000 },
    ];
    expect(projectNetWorthTarget({ points: falling, current: 1_200_000, target: 2_000_000, end })).toEqual({
      status: 'NOT_GROWING',
      monthlyPace: -50_000,
    });
  });

  it('prazo acima de 50 anos vira "muito distante"', () => {
    const slow = [
      { year: 2026, month: 9, total: 1_000_000 },
      { year: 2026, month: 10, total: 1_000_001 },
      { year: 2026, month: 11, total: 1_000_002 },
    ];
    expect(projectNetWorthTarget({ points: slow, current: 1_000_002, target: 900_000_000, end })).toMatchObject({
      status: 'TOO_FAR',
    });
  });
});
