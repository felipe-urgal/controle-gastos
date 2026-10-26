import type { CalendarEvent } from '@/app/types/calendar';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type CommitmentTotals = {
  currency: SupportedCurrency;
  payable: number;
  receivable: number;
  overduePayable: number;
  /** Compromissos de receita/despesa sem valor: ficam fora das somas, nunca viram zero. */
  withoutAmount: number;
};

/** Soma a pagar/a receber por moeda; marcos e transferências não entram e moedas nunca se misturam. */
export function summarizeCommitments(events: readonly CalendarEvent[]): CommitmentTotals[] {
  const totals = new Map<SupportedCurrency, CommitmentTotals>();

  for (const event of events) {
    if (event.direction !== 'INCOME' && event.direction !== 'EXPENSE') continue;

    const entry = totals.get(event.currency) ?? {
      currency: event.currency,
      payable: 0,
      receivable: 0,
      overduePayable: 0,
      withoutAmount: 0,
    };
    totals.set(event.currency, entry);

    if (event.amount === null) {
      entry.withoutAmount += 1;
    } else if (event.direction === 'INCOME') {
      entry.receivable += event.amount;
    } else {
      entry.payable += event.amount;
      if (event.commitmentState === 'OVERDUE') entry.overduePayable += event.amount;
    }
  }

  return [...totals.values()];
}
