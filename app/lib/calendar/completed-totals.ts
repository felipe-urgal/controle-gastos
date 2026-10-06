import type { AccountType } from '@/app/types/account';
import {
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyFinancialSummary,
} from '@/app/types/financial-summary';
import type {
  TransactionKind,
  TransactionStatus,
  TransactionType,
} from '@/app/types/transaction';

export type CalendarTransactionForTotals = {
  amount: number;
  type: TransactionType;
  kind: TransactionKind;
  status: TransactionStatus;
  account: {
    currency: string;
    type: AccountType;
  };
};

export function calculateCompletedTransactionTotals(
  transactions: readonly CalendarTransactionForTotals[],
): CurrencyFinancialSummary[] {
  const summaries = new Map<string, CurrencyFinancialSummary>();

  for (const transaction of transactions) {
    if (transaction.status !== 'COMPLETED' || transaction.kind !== 'NORMAL') {
      continue;
    }

    if (!Number.isInteger(transaction.amount) || transaction.amount < 0) {
      throw new Error('Valor inválido no calendário');
    }

    const currency = transaction.account.currency;
    if (!isSupportedCurrency(currency)) continue;

    const summary = summaries.get(currency) ?? {
      currency,
      income: 0,
      expense: 0,
      balance: 0,
    };

    if (transaction.account.type === 'CREDIT_CARD') {
      if (transaction.type === 'EXPENSE') summary.expense += transaction.amount;
      if (transaction.type === 'INCOME') summary.expense -= transaction.amount;
    } else {
      if (transaction.type === 'INCOME') summary.income += transaction.amount;
      if (transaction.type === 'EXPENSE') summary.expense += transaction.amount;
    }

    summary.balance = summary.income - summary.expense;
    summaries.set(currency, summary);
  }

  return SUPPORTED_CURRENCIES.flatMap((currency) => {
    const summary = summaries.get(currency);
    return summary ? [summary] : [];
  });
}
