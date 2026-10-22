import type { MerchantDTO, MerchantMonthSummary, MerchantSpend } from '@/app/types/merchant';

type SummaryCurrency = MerchantMonthSummary['currencies'][number];

/** O gasto exibido na linha: o da moeda do resumo, ou o primeiro disponível. */
export function pickSpend(spend: MerchantDTO['monthSpend'], currency: string | undefined) {
  if (!spend || spend.length === 0) return null;
  return spend.find((entry) => entry.currency === currency) ?? spend[0];
}

export type SpendDelta = { kind: 'NEW' | 'SAME' | 'UP' | 'DOWN' | 'NONE'; percent: number };

/** Variação contra o mês anterior; sem mês anterior o gasto é "novo no mês". */
export function spendDelta(spend: Pick<MerchantSpend, 'expense' | 'previousExpense'> | null): SpendDelta {
  if (!spend || spend.expense <= 0) return { kind: 'NONE', percent: 0 };
  if (spend.previousExpense <= 0) return { kind: 'NEW', percent: 0 };
  if (spend.expense === spend.previousExpense) return { kind: 'SAME', percent: 0 };

  const percent = Math.round((Math.abs(spend.expense - spend.previousExpense) / spend.previousExpense) * 100);
  return { kind: spend.expense > spend.previousExpense ? 'UP' : 'DOWN', percent };
}

export function spendDeltaLabel(delta: SpendDelta) {
  if (delta.kind === 'NEW') return 'novo no mês';
  if (delta.kind === 'SAME') return 'igual ao mês anterior';
  if (delta.kind === 'UP') return `+${delta.percent}%`;
  if (delta.kind === 'DOWN') return `−${delta.percent}%`;
  return '';
}

/** Largura (0 a 100) da barra de participação, relativa ao maior gasto da página. */
export function shareWidth(expense: number, max: number) {
  if (expense <= 0 || max <= 0) return 0;
  return Math.max(4, Math.round((expense / max) * 100));
}

/** Percentual do gasto em estabelecimentos que foi para os maiores; null sem gasto. */
export function topShare(entry: SummaryCurrency) {
  if (entry.assigned <= 0) return null;
  const top = entry.top.reduce((sum, merchant) => sum + merchant.expense, 0);
  return Math.round((top / entry.assigned) * 100);
}

/** "A", "A e B" ou "A, B e C". */
export function joinNames(names: readonly string[]) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
