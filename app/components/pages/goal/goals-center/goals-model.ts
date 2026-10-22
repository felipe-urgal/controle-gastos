import type { FinancialGoal, FinancialGoalStatus } from '@/app/types/financial-goal';

export type GoalPace = 'ON_TRACK' | 'BEHIND' | 'OVERDUE';

type Money = (cents: number) => string;

const DAY = 86_400_000;

function dayStart(value: Date) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysToDeadline(targetDate: string, now: Date) {
  return Math.round((parseDate(targetDate) - dayStart(now)) / DAY);
}

/** Prazo em linguagem natural: dias até ~6 semanas, meses depois disso. */
export function deadlineLabel(targetDate: string | null, now: Date) {
  if (!targetDate) return 'Sem prazo definido';
  const days = daysToDeadline(targetDate, now);
  const abs = Math.abs(days);
  const span = abs <= 45 ? `${abs} ${abs === 1 ? 'dia' : 'dias'}` : `${Math.round(abs / 30.44)} meses`;
  if (days === 0) return 'Prazo é hoje';
  return days > 0 ? `em ${span}` : `venceu há ${span}`;
}

/**
 * Ritmo estimado de uma meta ativa com prazo: compara o tempo decorrido desde a criação com o progresso
 * (tolerância de 5 pontos). Metas sem prazo ou já atingidas não têm ritmo.
 */
export function goalPace(goal: FinancialGoal, now: Date): GoalPace | null {
  if (goal.status !== 'ACTIVE' || !goal.targetDate || goal.remainingAmount <= 0) return null;

  const end = parseDate(goal.targetDate);
  if (end < dayStart(now)) return 'OVERDUE';

  const start = parseDate(goal.createdAt);
  if (end <= start) return null;

  const elapsed = Math.min(1, Math.max(0, (dayStart(now) - start) / (end - start)));
  return goal.percentage / 100 >= elapsed - 0.05 ? 'ON_TRACK' : 'BEHIND';
}

export function countByStatus(goals: FinancialGoal[]) {
  const counts: Record<FinancialGoalStatus | 'ALL', number> = { ALL: goals.length, ACTIVE: 0, COMPLETED: 0, ARCHIVED: 0 };
  for (const goal of goals) counts[goal.status] += 1;
  return counts;
}

const STATUS_ORDER: Record<FinancialGoalStatus, number> = { ACTIVE: 0, COMPLETED: 1, ARCHIVED: 2 };

/** Ativas por prazo mais próximo (sem prazo por último), depois concluídas e arquivadas. */
export function sortGoals(goals: FinancialGoal[]) {
  return [...goals].sort((left, right) => {
    if (left.status !== right.status) return STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (left.targetDate === right.targetDate) return left.name.localeCompare(right.name, 'pt-BR');
    if (!left.targetDate) return 1;
    if (!right.targetDate) return -1;
    return left.targetDate < right.targetDate ? -1 : 1;
  });
}

/** Moedas com metas ativas, na ordem em que aparecem. */
export function activeCurrencies(goals: FinancialGoal[]) {
  return [...new Set(goals.filter((goal) => goal.status === 'ACTIVE').map((goal) => goal.currency))];
}

/** Resumo das metas ativas de uma moeda; moedas diferentes nunca são somadas. */
export function summarizeActive(goals: FinancialGoal[], currency: string, now: Date) {
  const active = goals.filter((goal) => goal.status === 'ACTIVE' && goal.currency === currency);
  const current = active.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const target = active.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const upcoming = active
    .filter((goal) => goal.targetDate && daysToDeadline(goal.targetDate, now) >= 0 && goal.remainingAmount > 0)
    .sort((left, right) => (left.targetDate! < right.targetDate! ? -1 : 1))[0];

  return {
    count: active.length,
    current,
    target,
    remaining: Math.max(0, target - current),
    percent: target === 0 ? 0 : Math.max(0, Math.min(100, Math.round((current / target) * 100))),
    monthly: active.reduce((sum, goal) => sum + (goal.monthlyContributionSuggestion ?? 0), 0),
    behind: active.filter((goal) => {
      const pace = goalPace(goal, now);
      return pace === 'BEHIND' || pace === 'OVERDUE';
    }).length,
    nearest: upcoming ? { name: upcoming.name, label: deadlineLabel(upcoming.targetDate, now) } : null,
  };
}

export function buildLede(summary: ReturnType<typeof summarizeActive>, money: Money) {
  if (summary.count === 0) return 'Nenhuma meta ativa nesta moeda no momento.';
  const parts: string[] = [];
  if (summary.monthly > 0) {
    parts.push(
      `Para chegar nos prazos, guarde cerca de ${money(summary.monthly)} por mês entre ${summary.count === 1 ? 'a meta ativa' : `as ${summary.count} metas ativas`}.`,
    );
  } else {
    parts.push(`Você tem ${summary.count === 1 ? '1 meta ativa' : `${summary.count} metas ativas`}.`);
  }
  if (summary.nearest) parts.push(`A mais próxima é ${summary.nearest.name}, ${summary.nearest.label}.`);
  return parts.join(' ');
}
