import type { Transaction } from '@/app/types/calendar';
import {
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyFinancialSummary,
} from '@/app/types/financial-summary';

type TransactionForTotals = Pick<Transaction, 'amount' | 'type' | 'status' | 'account'>;

export function calculateCompletedTransactionTotals(
  transactions: TransactionForTotals[],
): CurrencyFinancialSummary[] {
  const summaries = new Map<string, CurrencyFinancialSummary>();

  for (const transaction of transactions) {
    if (transaction.status !== 'COMPLETED') continue;

    const currency = transaction.account?.currency;
    if (!isSupportedCurrency(currency)) continue;

    const amount = Number(transaction.amount) || 0;
    const summary = summaries.get(currency) ?? {
      currency,
      income: 0,
      expense: 0,
      balance: 0,
    };

    if (transaction.type === 'INCOME') summary.income += amount;
    if (transaction.type === 'EXPENSE') summary.expense += amount;
    summary.balance = summary.income - summary.expense;
    summaries.set(currency, summary);
  }

  return SUPPORTED_CURRENCIES.flatMap((currency) => {
    const summary = summaries.get(currency);
    return summary ? [summary] : [];
  });
}
