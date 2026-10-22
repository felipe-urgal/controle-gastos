import { describe, expect, it } from 'vitest';

import { safeToSpendMargin } from '@/app/components/pages/dashboard/dashboard/cards/safe-to-spend-hero';
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
