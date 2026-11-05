import { describe, expect, it } from 'vitest';

import { buildStatementCsv, formatStatementAmount } from '@/app/lib/accounts/account-statement';

describe('formatStatementAmount', () => {
  it('usa ponto decimal, duas casas e preserva o sinal', () => {
    expect(formatStatementAmount(123456)).toBe('1234.56');
    expect(formatStatementAmount(-5)).toBe('-0.05');
    expect(formatStatementAmount(0)).toBe('0.00');
    expect(formatStatementAmount(-100)).toBe('-1.00');
  });
});

describe('buildStatementCsv', () => {
  const from = { year: 2026, month: 10, day: 1 };
  const to = { year: 2026, month: 10, day: 31 };

  it('traz saldo inicial, saldo corrente por lançamento e saldo final', () => {
    const csv = buildStatementCsv({
      from,
      to,
      openingBalance: 10_000,
      rows: [
        { date: { year: 2026, month: 10, day: 5 }, description: 'Salário', category: 'Renda', signedAmount: 500_000 },
        { date: { year: 2026, month: 10, day: 9 }, description: 'Mercado', category: null, signedAmount: -4_590 },
      ],
    });
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines).toEqual([
      '"data","descricao","categoria","valor","saldo"',
      '"2026-10-01","Saldo inicial","",,100.00',
      '"2026-10-05","Salário","Renda",5000.00,5100.00',
      '"2026-10-09","Mercado","",-45.90,5054.10',
      '"2026-10-31","Saldo final","",,5054.10',
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
  });

  it('período sem lançamentos mantém o saldo e neutraliza fórmulas e aspas na descrição', () => {
    const empty = buildStatementCsv({ from, to, openingBalance: -2_500, rows: [] });
    expect(empty).toContain('"Saldo final","",,-25.00');

    const risky = buildStatementCsv({
      from,
      to,
      openingBalance: 0,
      rows: [{ date: from, description: '=HYPERLINK("x")', category: null, signedAmount: 100 }],
    });
    expect(risky).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
