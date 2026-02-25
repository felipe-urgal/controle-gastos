import { Account } from "@prisma/client";

export function toAccountDTO(account: Account & {
  _count?: {
    transactions: number;
    investments: number;
  };
}) {
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
    transactionsCount: account._count?.transactions ?? 0,
    investmentsCount: account._count?.investments ?? 0,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
};