import { describe, expect, it } from 'vitest';

import { buildMonthBars } from '@/app/components/pages/transactions/index/transactions-view-helpers';
import type { TransactionDTO } from '@/app/types/transaction';

function tx(day: number, type: 'INCOME' | 'EXPENSE', amount: number): TransactionDTO {
  return { day, type, amount, status: 'COMPLETED', kind: 'NORMAL', account: { currency: 'BRL' } } as unknown as TransactionDTO;
}

describe('buildMonthBars', () => {
  it('cobre todos os dias do mês, sem lacunas nem sobreposição', () => {
    const bars = buildMonthBars([], 'BRL', 10, 2026);
    expect(bars).toHaveLength(8);
    expect(bars[0].fromDay).toBe(1);
    expect(bars[7].toDay).toBe(31);
    for (let index = 1; index < bars.length; index += 1) {
      expect(bars[index].fromDay).toBe(bars[index - 1].toDay + 1);
    }
  });

  it('separa entradas e saídas por coluna e mantém o saldo como valor', () => {
    const bars = buildMonthBars([tx(1, 'INCOME', 1_000), tx(2, 'EXPENSE', 300), tx(31, 'EXPENSE', 50)], 'BRL', 10, 2026);
    expect(bars[0]).toMatchObject({ income: 1_000, expense: 300, value: 700, tone: 'income' });
    expect(bars[7]).toMatchObject({ income: 0, expense: 50, value: 50, tone: 'expense' });
    expect(bars[3]).toMatchObject({ income: 0, expense: 0, tone: 'neutral' });
  });

  it('ignora outra moeda e transações não concluídas', () => {
    const other = { ...tx(1, 'INCOME', 500), account: { currency: 'USD' } } as unknown as TransactionDTO;
    const pending = { ...tx(1, 'INCOME', 500), status: 'PENDING' } as unknown as TransactionDTO;
    expect(buildMonthBars([other, pending], 'BRL', 10, 2026)[0]).toMatchObject({ income: 0, expense: 0 });
  });
});
