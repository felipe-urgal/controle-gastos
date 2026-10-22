import { ACCOUNT_NEAR_LIMIT_RATIO } from "@/app/lib/accounts/account-attention";
import type {
  AccountModel,
  AccountRecentTransaction,
} from "@/app/types/account";

export function getAccountPrimaryValue(account: AccountModel) {
  if (account.type === "INVESTMENT") {
    return account.investmentValueCents ?? account.balance;
  }
  if (account.type === "CREDIT_CARD") {
    return account.creditLimit ?? 0;
  }
  return account.balance;
}

export function accountTransactionDateKey(
  transaction: Pick<AccountRecentTransaction, "year" | "month" | "day">,
) {
  return transaction.year * 10_000 + transaction.month * 100 + transaction.day;
}

export function sortAccountTransactions(
  transactions: readonly AccountRecentTransaction[],
) {
  return [...transactions].sort((left, right) => {
    const byDate =
      accountTransactionDateKey(right) - accountTransactionDateKey(left);
    if (byDate !== 0) return byDate;
    return right.id.localeCompare(left.id);
  });
}

export function latestAccountTransaction(account: AccountModel) {
  return sortAccountTransactions(account.transactions)[0] ?? null;
}

export type CreditCardRowSummary = {
  /** Valor da próxima fatura; null quando não há fatura aberta ou o ciclo não está configurado. */
  statementAmount: number | null;
  statementDueDate: { year: number; month: number; day: number } | null;
  usedLimit: number;
  creditLimit: number | null;
  /** Percentual do limite usado (arredondado); null sem limite configurado. */
  usedPercent: number | null;
  tone: "ok" | "near" | "over";
  overdueCount: number;
};

/** Resumo do cartão para a linha da lista de Contas; null quando a API não trouxe o status. */
export function creditCardRowSummary(account: AccountModel): CreditCardRowSummary | null {
  const status = account.cardStatus;
  if (account.type !== "CREDIT_CARD" || !status) return null;

  const limit = account.creditLimit ?? null;
  const usedPercent = limit !== null && limit > 0 ? Math.round((status.usedLimit / limit) * 100) : null;
  const tone =
    limit !== null && status.usedLimit > limit
      ? "over"
      : limit !== null && limit > 0 && status.usedLimit >= limit * ACCOUNT_NEAR_LIMIT_RATIO
        ? "near"
        : "ok";

  return {
    statementAmount: status.nextStatement?.amount ?? null,
    statementDueDate: status.nextStatement?.dueDate ?? null,
    usedLimit: status.usedLimit,
    creditLimit: limit,
    usedPercent,
    tone,
    overdueCount: status.overdueCount,
  };
}
