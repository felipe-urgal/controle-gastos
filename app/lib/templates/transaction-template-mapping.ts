import type { TransactionTemplateInput } from "@/app/types/transaction-template";
import type { TransactionDTO } from "@/app/types/transaction";

export function transactionToTemplateInput(
  transaction: TransactionDTO,
): TransactionTemplateInput {
  if (transaction.kind !== "NORMAL" || !transaction.category) {
    throw new Error("Somente transações comuns podem originar modelos");
  }

  return {
    name: transaction.description.slice(0, 80),
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    isFavorite: false,
    position: 0,
    accountId: transaction.account.id,
    categoryId: transaction.category.id,
  };
}
