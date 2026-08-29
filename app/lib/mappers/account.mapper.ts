import { Account } from "@prisma/client";

type AccountWithDerivedBalance = Account & {
  balance: number;
  transactions: any[];
};

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
    transactions: account.transactions ?? [],
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
