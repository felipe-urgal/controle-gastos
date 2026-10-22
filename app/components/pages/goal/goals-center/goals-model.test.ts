import { describe, expect, it } from 'vitest';

import {
  activeCurrencies,
  buildLede,
  countByStatus,
  deadlineLabel,
  goalPace,
  sortGoals,
  summarizeActive,
} from '@/app/components/pages/goal/goals-center/goals-model';
import type { FinancialGoal } from '@/app/types/financial-goal';

const now = new Date(2026, 9, 22);
const money = (cents: number) => 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');

function goal(partial: Partial<FinancialGoal> & { id: string }): FinancialGoal {
  return {
    name: partial.id,
    targetAmount: 100000,
    currency: 'BRL',
    targetDate: null,
    status: 'ACTIVE',
    description: null,
    account: null,
    currentAmount: 0,
    contributions: 0,
    withdrawals: 0,
    remainingAmount: 100000,
    percentage: 0,
    monthlyContributionSuggestion: null,
    entryCount: 0,
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-22T12:00:00.000Z',
    ...partial,
  };
}

describe('goals-model', () => {
  it('descreve o prazo em dias ou meses, no passado e no futuro', () => {
    expect(deadlineLabel(null, now)).toBe('Sem prazo definido');
    expect(deadlineLabel('2026-10-22', now)).toBe('Prazo é hoje');
    expect(deadlineLabel('2026-11-01', now)).toBe('em 10 dias');
    expect(deadlineLabel('2027-03-20', now)).toBe('em 5 meses');
    expect(deadlineLabel('2026-09-30', now)).toBe('venceu há 22 dias');
  });

  it('estima o ritmo pelo tempo decorrido contra o progresso e marca prazo vencido', () => {
    // criada em 22/04, prazo 22/10 do ano seguinte: ~metade do tempo já passou
    const base = { id: 'a', targetDate: '2027-04-22', createdAt: '2026-04-22T12:00:00.000Z' };
    expect(goalPace(goal({ ...base, percentage: 60 }), now)).toBe('ON_TRACK');
    expect(goalPace(goal({ ...base, percentage: 10 }), now)).toBe('BEHIND');
    expect(goalPace(goal({ id: 'b', targetDate: '2026-09-30', percentage: 87, remainingAmount: 800 }), now)).toBe('OVERDUE');
    expect(goalPace(goal({ id: 'c', percentage: 10 }), now)).toBeNull();
    expect(goalPace(goal({ id: 'd', status: 'COMPLETED', targetDate: '2027-04-22', remainingAmount: 0 }), now)).toBeNull();
  });

  it('ordena ativas por prazo, depois concluídas e arquivadas, e conta por status', () => {
    const goals = [
      goal({ id: 'arch', status: 'ARCHIVED' }),
      goal({ id: 'semprazo' }),
      goal({ id: 'done', status: 'COMPLETED', remainingAmount: 0 }),
      goal({ id: 'tarde', targetDate: '2027-12-31' }),
      goal({ id: 'cedo', targetDate: '2027-03-20' }),
    ];
    expect(sortGoals(goals).map((item) => item.id)).toEqual(['cedo', 'tarde', 'semprazo', 'done', 'arch']);
    expect(countByStatus(goals)).toEqual({ ALL: 5, ACTIVE: 3, COMPLETED: 1, ARCHIVED: 1 });
  });

  it('resume só as ativas da moeda, sem misturar moedas, e escreve a frase', () => {
    const goals = [
      goal({ id: 'viagem', name: 'Viagem', targetAmount: 2000000, currentAmount: 1420000, remainingAmount: 580000, percentage: 71, targetDate: '2027-03-20', monthlyContributionSuggestion: 116000 }),
      goal({ id: 'apto', targetAmount: 5000000, currentAmount: 1200000, remainingAmount: 3800000, percentage: 24, targetDate: '2027-12-31', monthlyContributionSuggestion: 271400 }),
      goal({ id: 'usd', currency: 'USD', targetAmount: 100000, currentAmount: 5000, remainingAmount: 95000 }),
      goal({ id: 'done', status: 'COMPLETED', targetAmount: 3000000, currentAmount: 3000000, remainingAmount: 0, percentage: 100 }),
    ];
    expect(activeCurrencies(goals)).toEqual(['BRL', 'USD']);

    const summary = summarizeActive(goals, 'BRL', now);
    expect(summary).toMatchObject({ count: 2, current: 2620000, target: 7000000, remaining: 4380000, percent: 37, monthly: 387400 });
    expect(summary.nearest).toEqual({ name: 'Viagem', label: 'em 5 meses' });
    expect(buildLede(summary, money)).toBe('Para chegar nos prazos, guarde cerca de R$ 3874,00 por mês entre as 2 metas ativas. A mais próxima é Viagem, em 5 meses.');
    expect(buildLede(summarizeActive(goals, 'EUR', now), money)).toBe('Nenhuma meta ativa nesta moeda no momento.');
  });
});
