import type { Account, Category, Transaction } from "@prisma/client";

import type { AccountRecentTransaction } from "@/app/types/account";

type AccountWithDerivedBalance = Account & {
  balance: number;
  investmentValueCents?: number | null;
  investmentValueSource?: "MARKET" | "COST" | "MIXED" | null;
  investmentPositionCount?: number;
  transactions: RecentTransactionRecord[];
};

type RecentTransactionAccount = {
  id: string;
  name: string;
  currency: string;
  type: string;
  color: string | null;
  icon: string | null;
};

type RecentTransactionRecord = Transaction & {
  category: Pick<Category, "id" | "name" | "type" | "color" | "icon"> | null;
  transfer: {
    transactions: Array<{
      id: string;
      userId: string;
      transferRole: string | null;
      account: RecentTransactionAccount;
    }>;
  } | null;
};

function toRecentTransactionDTO(
  transaction: RecentTransactionRecord,
): AccountRecentTransaction {
  const counterpartAccount =
    transaction.kind === "TRANSFER"
      ? transaction.transfer?.transactions.find(
          (candidate) =>
            candidate.id !== transaction.id &&
            candidate.userId === transaction.userId &&
            candidate.transferRole !== transaction.transferRole,
        )?.account ?? null
      : null;
  const { transfer, ...rest } = transaction;
  void transfer;

  return {
    ...rest,
    reconciledAt: rest.reconciledAt?.toISOString() ?? null,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    counterpartAccount,
  };
}

export function toAccountDTO(account: AccountWithDerivedBalance) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    balance: account.balance,
    investmentValueCents: account.investmentValueCents ?? null,
    investmentValueSource: account.investmentValueSource ?? null,
    investmentPositionCount: account.investmentPositionCount ?? 0,
    currency: account.currency,
    isActive: account.isActive,
    color: account.color,
    icon: account.icon,
    description: account.description,
    creditLimit: account.creditLimit,
    statementClosingDay: account.statementClosingDay,
    statementDueDay: account.statementDueDay,
    transactions: (account.transactions ?? []).map(toRecentTransactionDTO),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
