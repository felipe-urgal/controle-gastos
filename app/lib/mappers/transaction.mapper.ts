import { Transaction } from "@prisma/client";

export function toTransactionDTO(transaction: Transaction & { account?: any; category?: any }) {
  return {
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    description: transaction.description,
    status: transaction.status,
    year: transaction.year,
    month: transaction.month,
    day: transaction.day,
    account: transaction.account,
    category: transaction.category,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
};
