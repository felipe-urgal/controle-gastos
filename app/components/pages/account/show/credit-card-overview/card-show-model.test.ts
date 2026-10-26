import { describe, expect, it } from 'vitest';

import {
  daysBetween,
  isPayableStatement,
  limitTone,
  pickStatementToPay,
  usagePercent,
} from '@/app/components/pages/account/show/credit-card-overview/card-show-model';
import type { CreditCardStatementItem } from '@/app/types/credit-card';

const today = { year: 2026, month: 10, day: 22 };

function statement(overrides: Partial<CreditCardStatementItem> & { closing: [number, number, number]; due: [number, number, number] }): CreditCardStatementItem {
  const { closing, due, ...rest } = overrides;
  return {
    closingDate: { year: closing[0], month: closing[1], day: closing[2] },
    dueDate: { year: due[0], month: due[1], day: due[2] },
    total: 10_000,
    completedTotal: 10_000,
    pendingTotal: 0,
    transactionCount: 1,
    status: 'OPEN',
    payment: null,
    transactions: [],
    ...rest,
  };
}

describe('daysBetween', () => {
  it('conta dias com sinal e atravessa o mês', () => {
    expect(daysBetween(today, { year: 2026, month: 10, day: 24 })).toBe(2);
    expect(daysBetween(today, { year: 2026, month: 10, day: 20 })).toBe(-2);
    expect(daysBetween({ year: 2026, month: 10, day: 30 }, { year: 2026, month: 11, day: 2 })).toBe(3);
  });
});

describe('isPayableStatement / pickStatementToPay', () => {
  const closedOpen = statement({ closing: [2026, 10, 10], due: [2026, 10, 24] });
  const older = statement({ closing: [2026, 9, 10], due: [2026, 10, 15], total: 5_000 });
  const paid = statement({ closing: [2026, 8, 10], due: [2026, 8, 24], status: 'PAID' });
  const empty = statement({ closing: [2026, 7, 10], due: [2026, 7, 24], total: 0 });
  const current = statement({ closing: [2026, 11, 10], due: [2026, 11, 24] });

  it('só paga fatura fechada, em aberto e com valor', () => {
    expect(isPayableStatement(closedOpen, today)).toBe(true);
    expect(isPayableStatement(paid, today)).toBe(false);
    expect(isPayableStatement(empty, today)).toBe(false);
    expect(isPayableStatement(current, today)).toBe(false);
  });

  it('a fatura de fechamento hoje já pode ser paga', () => {
    expect(isPayableStatement(statement({ closing: [2026, 10, 22], due: [2026, 11, 5] }), today)).toBe(true);
  });

  it('escolhe a de vencimento mais próximo, mesmo vencida', () => {
    const picked = pickStatementToPay({ current, history: [closedOpen, older, paid, empty] }, today);

    expect(picked).toBe(older);
  });

  it('devolve null quando não há nada para pagar', () => {
    expect(pickStatementToPay({ current, history: [paid, empty] }, today)).toBeNull();
  });
});

describe('limite', () => {
  it('percentual limitado a 100 e zero sem limite', () => {
    expect(usagePercent({ creditLimit: 600_000, usedLimit: 205_000 })).toBe(34);
    expect(usagePercent({ creditLimit: 100_000, usedLimit: 150_000 })).toBe(100);
    expect(usagePercent({ creditLimit: 0, usedLimit: 10 })).toBe(0);
  });

  it('tom do limite', () => {
    expect(limitTone({ creditLimit: 100_000, usedLimit: 50_000, overLimit: 0 })).toBe('ok');
    expect(limitTone({ creditLimit: 100_000, usedLimit: 90_000, overLimit: 0 })).toBe('near');
    expect(limitTone({ creditLimit: 100_000, usedLimit: 120_000, overLimit: 20_000 })).toBe('over');
  });
});
