import { describe, expect, it } from 'vitest';

import { safeToSpendMargin, safeToSpendPerDay } from '@/app/components/pages/dashboard/dashboard/cards/safe-to-spend-hero';
import type { ForecastData } from '@/app/types/forecast';

function result(realizedBalance: number, safeToSpend: number): ForecastData['safeToSpend'] {
  return { realizedBalance, pendingExpenses: 0, cardCommitments: 0, transferNet: 0, safeToSpend, accounts: [] };
}

describe('safeToSpendMargin', () => {
  it('avisa quando os compromissos passam do saldo', () => {
    expect(safeToSpendMargin(result(100_000, -5_000)).label).toBe('Compromissos acima do saldo');
  });

  it('considera margem apertada abaixo de 15% do saldo realizado', () => {
    expect(safeToSpendMargin(result(100_000, 14_999)).label).toBe('Margem apertada');
  });

  it('considera margem apertada quando não há saldo realizado positivo', () => {
    expect(safeToSpendMargin(result(0, 0)).label).toBe('Margem apertada');
  });

  it('considera confortável a partir de 15% do saldo realizado', () => {
    expect(safeToSpendMargin(result(100_000, 15_000)).label).toBe('Margem confortável');
  });
});

describe('safeToSpendPerDay', () => {
  const asOf = { year: 2026, month: 10, day: 23 };

  it('divide o disponível pelos dias que faltam até o fim do horizonte', () => {
    expect(safeToSpendPerDay(287_425, { year: 2026, month: 10, day: 31 }, asOf)).toEqual({ days: 8, perDay: 35_928 });
  });

  it('conta o último dia como um dia inteiro', () => {
    expect(safeToSpendPerDay(10_000, { year: 2026, month: 10, day: 23 }, asOf)).toEqual({ days: 1, perDay: 10_000 });
  });

  it('atravessa a virada de mês', () => {
    expect(safeToSpendPerDay(30_000, { year: 2026, month: 11, day: 2 }, asOf)?.days).toBe(10);
  });

  it('não mostra valor por dia quando não há o que gastar', () => {
    expect(safeToSpendPerDay(0, { year: 2026, month: 10, day: 31 }, asOf)).toBeNull();
    expect(safeToSpendPerDay(-500, { year: 2026, month: 10, day: 31 }, asOf)).toBeNull();
  });
});
