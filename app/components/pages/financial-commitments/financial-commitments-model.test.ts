import { describe, expect, it } from 'vitest';

import {
  buildLede,
  filterItems,
  groupByDay,
  overdueLabel,
  payableShare,
  signedAmount,
  splitCommitments,
  weekBuckets,
} from '@/app/components/pages/financial-commitments/financial-commitments-model';
import type { FinancialCommitment, FinancialCommitmentsData } from '@/app/types/financial-commitment';

const asOf = { year: 2026, month: 10, day: 22 };
const money = (cents: number) => 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');

function item(partial: Partial<FinancialCommitment> & { id: string }): FinancialCommitment {
  return {
    type: 'PENDING',
    direction: 'PAYABLE',
    state: 'UPCOMING',
    title: partial.id,
    amount: 1000,
    currency: 'BRL',
    date: asOf,
    href: '/x',
    accountName: null,
    source: { kind: 'TRANSACTION', id: partial.id },
    ...partial,
  };
}

function data(totals: Partial<FinancialCommitmentsData['totals']> = {}): FinancialCommitmentsData {
  return {
    asOf,
    through: { year: 2026, month: 11, day: 21 },
    currency: 'BRL',
    days: 30,
    items: [],
    totals: { payable: { count: 0, amount: 0 }, receivable: { count: 0, amount: 0 }, milestoneCount: 0, overdueCount: 0, ...totals },
  };
}

describe('financial-commitments-model', () => {
  it('dá sinal só a pagar e a receber e deixa marcos e valores desconhecidos sem valor', () => {
    expect(signedAmount(item({ id: 'a', amount: 500 }))).toBe(-500);
    expect(signedAmount(item({ id: 'b', direction: 'RECEIVABLE', amount: 500 }))).toBe(500);
    expect(signedAmount(item({ id: 'c', direction: 'MILESTONE', amount: null }))).toBeNull();
    expect(signedAmount(item({ id: 'd', amount: null }))).toBeNull();
  });

  it('separa vencidos e agrupa o restante por dia, com rótulo relativo e líquido do dia', () => {
    const items = [
      item({ id: 'late', state: 'OVERDUE', date: { year: 2026, month: 10, day: 18 } }),
      item({ id: 'today', amount: 389 }),
      item({ id: 'salary', direction: 'RECEIVABLE', amount: 3200, date: { year: 2026, month: 10, day: 23 } }),
      item({ id: 'rent', amount: 2100, date: { year: 2026, month: 10, day: 26 } }),
      item({ id: 'card', amount: 584, date: { year: 2026, month: 10, day: 26 } }),
      item({ id: 'goal', direction: 'MILESTONE', amount: null, date: { year: 2026, month: 11, day: 20 } }),
    ];
    const { overdue, upcoming } = splitCommitments(items);
    expect(overdue.map((entry) => entry.id)).toEqual(['late']);

    const days = groupByDay(upcoming, asOf);
    expect(days.map((day) => day.label)).toEqual([
      'Hoje · qui, 22 de out',
      'Amanhã · sex, 23 de out',
      'Seg, 26 de out · em 4 dias',
      'Sex, 20 de nov · em 29 dias',
    ]);
    expect(days.map((day) => day.net)).toEqual([-389, 3200, -2684, null]);
    expect(overdueLabel({ year: 2026, month: 10, day: 18 }, asOf)).toBe('há 4 dias');
  });

  it('filtra por direção e agrupa semanas só com valores, na mesma escala', () => {
    const items = [
      item({ id: 'a', amount: 400 }),
      item({ id: 'b', direction: 'RECEIVABLE', amount: 1600 }),
      item({ id: 'c', amount: 800, date: { year: 2026, month: 10, day: 30 } }),
      item({ id: 'g', direction: 'MILESTONE', amount: null, date: { year: 2026, month: 12, day: 1 } }),
    ];
    expect(filterItems(items, 'PAYABLE').map((entry) => entry.id)).toEqual(['a', 'c']);
    expect(filterItems(items, 'all')).toHaveLength(4);

    const weeks = weekBuckets(items, asOf);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ label: '22 out – 28 out', payable: 400, receivable: 1600, payableWidth: 25, receivableWidth: 100 });
    expect(weeks[1]).toMatchObject({ label: '29 out – 4 nov', payable: 800, payableWidth: 50 });
  });

  it('descreve o horizonte sem inventar saldo e trata o horizonte vazio', () => {
    expect(buildLede(data(), money)).toContain('Nada previsto para os próximos 30 dias');
    const lede = buildLede(
      data({ payable: { count: 9, amount: 748260 }, receivable: { count: 1, amount: 520000 }, overdueCount: 2 }),
      money,
    );
    expect(lede).toBe('Você tem 9 compromissos a pagar e 1 entrada a receber nos próximos 30 dias. Descontando o que entra, saem R$ 2282,60 a mais do que entram. Há 2 itens vencidos.');
    expect(buildLede(data({ receivable: { count: 1, amount: 100 } }), money)).toContain('entram R$ 1,00 a mais do que saem');
  });

  it('calcula a parcela a pagar para a barra e aceita total zero', () => {
    expect(payableShare(data({ payable: { count: 1, amount: 770 }, receivable: { count: 1, amount: 230 } }).totals)).toBe(77);
    expect(payableShare(data().totals)).toBe(0);
  });
});
