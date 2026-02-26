import { createBaseService } from "@/app/services/base-service";
import { TransactionDTO } from "@/app/types/transaction";

export type TransactionListResponse = {
  items: TransactionDTO[];
  additionalData: {
    income: number;
    expenses: number;
    balance: number;
  };
};

export const transactionService =
  createBaseService<TransactionDTO, TransactionListResponse>(
    "transactions"
  );
  