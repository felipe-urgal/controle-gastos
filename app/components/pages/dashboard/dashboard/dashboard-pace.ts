import type { DashboardPeriodRelation } from '@/app/types/dashboard';

export type PaceStatus = 'OVER_BUDGET' | 'AHEAD' | 'ON_TRACK' | 'FINISHED' | 'NOT_STARTED' | 'NO_DATA';

export type MonthPace = {
  daysInMonth: number;
  /** Dias já decorridos (0 em mês futuro, todos em mês passado). */
  elapsedDays: number;
  /** Gasto acumulado por dia até `elapsedDays` (centavos). */
  cumulative: number[];
  /** Gasto acumulado do mês anterior, dia a dia. */
  previousCumulative: number[];
  spent: number;
  /** Quanto o mês anterior já tinha gasto no mesmo dia; null quando não há base. */
  previousSameDay: number | null;
  /** Projeção linear do gasto no fim do mês; só existe com o mês em andamento. */
  projected: number | null;
  budget: number;
  status: PaceStatus;
};

function accumulate(values: number[], limit = values.length) {
  let total = 0;
  return values.slice(0, limit).map((value) => (total += value));
}

/** Folga antes de chamar de "acelerado": gastar 10 pontos percentuais acima do tempo decorrido. */
const AHEAD_MARGIN = 0.1;

export function buildMonthPace({
  current,
  previous,
  budget,
  relation,
  today,
}: {
  current: number[];
  previous: number[];
  budget: number;
  relation: DashboardPeriodRelation;
  /** Dia do mês de hoje, usado só quando o mês selecionado é o atual. */
  today: number;
}): MonthPace {
  const daysInMonth = current.length;
  const elapsedDays =
    relation === 'PAST' ? daysInMonth : relation === 'FUTURE' ? 0 : Math.min(Math.max(today, 0), daysInMonth);
  const cumulative = accumulate(current, elapsedDays);
  const previousCumulative = accumulate(previous);
  const spent = cumulative[cumulative.length - 1] ?? 0;
  const previousSameDay = elapsedDays > 0 && previousCumulative.length > 0
    ? previousCumulative[Math.min(elapsedDays, previousCumulative.length) - 1]
    : null;
  const projected = relation === 'CURRENT' && elapsedDays > 0 ? Math.round((spent / elapsedDays) * daysInMonth) : null;

  let status: PaceStatus;
  if (relation === 'FUTURE' || elapsedDays === 0) {
    status = 'NOT_STARTED';
  } else if (relation === 'PAST') {
    status = 'FINISHED';
  } else if (budget > 0 && spent > budget) {
    status = 'OVER_BUDGET';
  } else if (budget > 0) {
    status = spent / budget > elapsedDays / daysInMonth + AHEAD_MARGIN ? 'AHEAD' : 'ON_TRACK';
  } else if (previousSameDay !== null && previousSameDay > 0) {
    status = spent > previousSameDay * (1 + AHEAD_MARGIN) ? 'AHEAD' : 'ON_TRACK';
  } else {
    status = spent > 0 ? 'ON_TRACK' : 'NO_DATA';
  }

  return { daysInMonth, elapsedDays, cumulative, previousCumulative, spent, previousSameDay, projected, budget, status };
}
