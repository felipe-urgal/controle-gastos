import { describe, expect, it } from 'vitest';

import {
  buildSparkline,
  filterMovements,
  groupMovementsByDay,
  investmentValueSourceLabel,
  movementDayLabel,
} from '@/app/components/pages/account/show/account-show-model';
import type { AccountRecentTransaction } from '@/app/types/account';

const today = { year: 2026, month: 10, day: 22 };

function movement(id: string, day: number, type: 'INCOME' | 'EXPENSE', status: AccountRecentTransaction['status'] = 'COMPLETED', month = 10, year = 2026): AccountRecentTransaction {
  return {
    id,
    amount: 1_000,
    type,
    kind: 'NORMAL',
    description: id,
    status,
    reconciliationStatus: 'UNCLEARED',
    reconciledAt: null,
    year,
    month,
    day,
    category: null,
    counterpartAccount: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  } as AccountRecentTransaction;
}

describe('movementDayLabel', () => {
  it('usa Hoje, Ontem e Amanhã e depois o dia e o mês', () => {
    expect(movementDayLabel(today, today)).toBe('Hoje');
    expect(movementDayLabel({ year: 2026, month: 10, day: 21 }, today)).toBe('Ontem');
    expect(movementDayLabel({ year: 2026, month: 10, day: 23 }, today)).toBe('Amanhã');
    expect(movementDayLabel({ year: 2026, month: 10, day: 5 }, today)).toBe('5 out');
  });

  it('atravessa o mês e mostra o ano quando não é o atual', () => {
    expect(movementDayLabel({ year: 2026, month: 9, day: 30 }, { year: 2026, month: 10, day: 1 })).toBe('Ontem');
    expect(movementDayLabel({ year: 2025, month: 12, day: 31 }, today)).toBe('31 dez 2025');
  });
});

describe('filterMovements', () => {
  const list = [
    movement('in', 20, 'INCOME'),
    movement('out', 19, 'EXPENSE'),
    movement('pend', 25, 'EXPENSE', 'PENDING'),
    movement('cancel', 18, 'EXPENSE', 'CANCELLED'),
  ];

  it('todas mostra só as concluídas, sem pendentes nem canceladas', () => {
    expect(filterMovements(list, 'all').map((item) => item.id)).toEqual(['in', 'out']);
  });

  it('separa entradas, saídas e pendentes', () => {
    expect(filterMovements(list, 'in').map((item) => item.id)).toEqual(['in']);
    expect(filterMovements(list, 'out').map((item) => item.id)).toEqual(['out']);
    expect(filterMovements(list, 'pending').map((item) => item.id)).toEqual(['pend']);
  });
});

describe('groupMovementsByDay', () => {
  it('agrupa dias seguidos iguais e mantém a ordem', () => {
    const groups = groupMovementsByDay([movement('a', 22, 'EXPENSE'), movement('b', 22, 'INCOME'), movement('c', 21, 'EXPENSE'), movement('d', 5, 'EXPENSE')], today);

    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['Hoje', ['a', 'b']],
      ['Ontem', ['c']],
      ['5 out', ['d']],
    ]);
  });

  it('devolve vazio sem movimentos', () => {
    expect(groupMovementsByDay([], today)).toEqual([]);
  });
});

describe('buildSparkline', () => {
  it('expõe as coordenadas de cada ponto para a interação', () => {
    const shape = buildSparkline([0, 50, 100], 100, 40, 0)!;
    expect(shape.points).toEqual([{ x: 0, y: 40 }, { x: 50, y: 20 }, { x: 100, y: 0 }]);
  });

  it('cobre a caixa e termina no último ponto', () => {
    const shape = buildSparkline([0, 50, 100], 100, 40, 0)!;

    expect(shape.line).toBe('M 0.0 40.0 L 50.0 20.0 L 100.0 0.0');
    expect(shape.endX).toBe(100);
    expect(shape.endY).toBe(0);
    expect(shape.area.endsWith('L 100.0 40 L 0.0 40 Z')).toBe(true);
  });

  it('desenha reta no meio quando o saldo não muda', () => {
    expect(buildSparkline([5, 5, 5], 100, 40, 0)!.endY).toBe(20);
  });

  it('não desenha com menos de dois pontos', () => {
    expect(buildSparkline([], 100, 40)).toBeNull();
    expect(buildSparkline([1], 100, 40)).toBeNull();
  });
});

describe('investmentValueSourceLabel', () => {
  it('traduz a base do valor, com custo como padrão', () => {
    expect(investmentValueSourceLabel('MARKET')).toBe('mercado');
    expect(investmentValueSourceLabel('MIXED')).toBe('misto');
    expect(investmentValueSourceLabel(null)).toBe('custo');
  });
});
