import { FormData } from "@/app/lib/interface/transaction.interface";
import { TransactionDTO, TransactionStatus } from "@/app/types/transaction";

export function getDuplicateTransactionValues(
  transaction: TransactionDTO
): FormData {
  if (transaction.kind !== "NORMAL" || !transaction.category) {
    throw new Error("Apenas transações comuns podem ser duplicadas");
  }

  return {
    amount: transaction.amount,
    month: transaction.month,
    year: transaction.year,
    day: transaction.day,
    description: transaction.description,
    status: transaction.status,
    accountId: transaction.account.id,
    categoryId: transaction.category.id,
    merchantId: transaction.merchant?.id ?? null,
    tagIds: transaction.tags?.map((tag) => tag.id) ?? [],
  };
}

export function canCompleteTransaction(status: TransactionStatus) {
  return status === "PENDING";
}
