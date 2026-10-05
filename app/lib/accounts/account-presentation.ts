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
