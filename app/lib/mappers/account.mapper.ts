import { Account } from "@prisma/client";

type AccountWithDerivedBalance = Account & {
  balance: number;
  transactions: any[];
};

function toRecentTransactionDTO(transaction: any) {
  const counterpartAccount = transaction.kind === "TRANSFER"
    ? transaction.transfer?.transactions?.find(
        (candidate: any) =>
          candidate.id !== transaction.id &&
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
    currency: account.currency,
    isActive: account.isActive,
    color: account.color,
    icon: account.icon,
    description: account.description,
    transactions: (account.transactions ?? []).map(toRecentTransactionDTO),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
