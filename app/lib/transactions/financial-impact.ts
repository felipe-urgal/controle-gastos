import type { AccountType } from "@/app/types/account";
import type { TransactionType } from "@/app/types/transaction";

export type TransactionFinancialImpact = {
  income: number;
  expense: number;
};

export function transactionFinancialImpact(
  accountType: AccountType,
  transactionType: TransactionType,
  amount: number,
): TransactionFinancialImpact {
  if (accountType === "CREDIT_CARD") {
    return transactionType === "EXPENSE"
      ? { income: 0, expense: amount }
      : { income: 0, expense: -amount };
  }

  return transactionType === "INCOME"
    ? { income: amount, expense: 0 }
    : { income: 0, expense: amount };
}
