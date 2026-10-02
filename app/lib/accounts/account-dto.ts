import { Account } from "@prisma/client";

type AccountWithDerivedBalance = Account & {
  balance: number;
  investmentValueCents?: number | null;
  investmentValueSource?: "MARKET" | "COST" | "MIXED" | null;
  investmentPositionCount?: number;
  transactions: any[];
};

function toRecentTransactionDTO(transaction: any) {
  const counterpartAccount = transaction.kind === "TRANSFER"
    ? transaction.transfer?.transactions?.find(
        (candidate: any) =>
          candidate.id !== transaction.id &&
          candidate.userId === transaction.userId &&
          candidate.transferRole !== transaction.transferRole,
      )?.account ?? null
    : null;
  const { transfer, ...rest } = transaction;
  void transfer;

  return {
    ...rest,
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
