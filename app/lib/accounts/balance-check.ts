import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { TRANSACTION_MAX_AMOUNT_CENTS } from '@/app/lib/transactions/transaction-field-contract';

export const BALANCE_ADJUSTMENT_DESCRIPTION = 'Ajuste de saldo (conferência)';

/** Só conta corrente: cartão tem fatura e investimento tem posições; o saldo do extrato não se compara com o lançamento. */
export function canCheckBalance(account: { type: string }) {
  return account.type === 'CREDIT_DEBIT';
}

/** Saldo do extrato pode ser negativo ou zero ("-1.234,56"); o parser comum só aceita valores positivos. */
export function parseStatementBalanceToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const negative = trimmed.startsWith('-') || trimmed.startsWith('−');
  const magnitude = negative ? trimmed.slice(1).trim() : trimmed;
  if (/^(?:R\$|US\$|€)?\s*0+(?:[.,]0{0,2})?$/i.test(magnitude)) return 0;

  const cents = parseMoneyInputToCents(magnitude);
  if (cents === null) return null;
  return negative ? -cents : cents;
}

export type BalanceAdjustment = { type: 'INCOME' | 'EXPENSE'; amount: number };

export type BalanceCheck = {
  statementBalance: number;
  appBalance: number;
  /** Extrato menos app: positivo = o app tem a menos (falta receita); negativo = o app tem a mais. */
  difference: number;
  matches: boolean;
  /** Ajuste que zeraria a diferença; null quando já confere ou o valor passa do limite de um lançamento. */
  adjustment: BalanceAdjustment | null;
};

export function evaluateBalanceCheck(statementBalance: number, appBalance: number): BalanceCheck {
  const difference = statementBalance - appBalance;
  const amount = Math.abs(difference);
  const adjustable = difference !== 0 && Number.isSafeInteger(difference) && amount <= TRANSACTION_MAX_AMOUNT_CENTS;

  return {
    statementBalance,
    appBalance,
    difference,
    matches: difference === 0,
    adjustment: adjustable ? { type: difference > 0 ? 'INCOME' : 'EXPENSE', amount } : null,
  };
}

export type BalanceAdjustmentPayload = {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  status: 'COMPLETED';
  year: number;
  month: number;
  day: number;
  accountId: string;
  categoryId: string;
};

/** Lançamento concluído, na data do saldo conferido, que leva o app ao saldo do extrato. */
export function buildAdjustmentPayload(args: {
  check: BalanceCheck;
  accountId: string;
  categoryId: string;
  date: { year: number; month: number; day: number };
}): BalanceAdjustmentPayload | null {
  const { check, accountId, categoryId, date } = args;
  if (!check.adjustment || !accountId || !categoryId) return null;

  return {
    amount: check.adjustment.amount,
    type: check.adjustment.type,
    description: BALANCE_ADJUSTMENT_DESCRIPTION,
    status: 'COMPLETED',
    year: date.year,
    month: date.month,
    day: date.day,
    accountId,
    categoryId,
  };
}
