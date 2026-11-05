/**
 * Projeção "quando chego lá" para uma meta de patrimônio. Puro: valores em centavos inteiros, uma moeda por vez.
 * O ritmo é a variação média por mês entre o primeiro e o último ponto conhecido da janela; meses sem valor
 * (`null`) ficam de fora em vez de virar zero.
 */

export type NetWorthTargetPoint = { year: number; month: number; total: number | null };

export type NetWorthTargetProjection =
  | { status: 'REACHED' }
  | { status: 'INSUFFICIENT_HISTORY' }
  | { status: 'NOT_GROWING'; monthlyPace: number }
  | { status: 'TOO_FAR'; monthlyPace: number }
  | { status: 'ON_TRACK'; monthlyPace: number; months: number; reachYear: number; reachMonth: number };

export const MIN_PROJECTION_POINTS = 3;
export const MAX_PROJECTION_MONTHS = 600;

function monthIndex(point: { year: number; month: number }) {
  return point.year * 12 + (point.month - 1);
}

export function projectNetWorthTarget(input: {
  /** Histórico em ordem crescente de mês. */
  points: NetWorthTargetPoint[];
  /** Patrimônio atual na moeda (último ponto, ou o valor atual informado pelo servidor). */
  current: number;
  target: number;
  /** Mês de referência da projeção (fim do período exibido). */
  end: { year: number; month: number };
}): NetWorthTargetProjection {
  if (input.current >= input.target) return { status: 'REACHED' };

  const known = input.points.filter(
    (point): point is { year: number; month: number; total: number } => point.total !== null,
  );
  if (known.length < MIN_PROJECTION_POINTS) return { status: 'INSUFFICIENT_HISTORY' };

  const first = known[0];
  const last = known[known.length - 1];
  const span = monthIndex(last) - monthIndex(first);
  if (span < MIN_PROJECTION_POINTS - 1) return { status: 'INSUFFICIENT_HISTORY' };

  const monthlyPace = Math.round((last.total - first.total) / span);
  if (monthlyPace <= 0) return { status: 'NOT_GROWING', monthlyPace };

  const months = Math.ceil((input.target - input.current) / monthlyPace);
  if (months > MAX_PROJECTION_MONTHS) return { status: 'TOO_FAR', monthlyPace };

  const reach = monthIndex(input.end) + months;
  return {
    status: 'ON_TRACK',
    monthlyPace,
    months,
    reachYear: Math.floor(reach / 12),
    reachMonth: (reach % 12) + 1,
  };
}
