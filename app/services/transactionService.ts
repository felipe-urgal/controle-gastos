import { createBaseService } from "@/app/services/base-service";
import { TransactionDTO } from "@/app/types/transaction";

export type TransactionListResponse = {
  items: TransactionDTO[];
  summary: {
    income: number;
    expense: number;
    balance: number;
  };
};

export const transactionService =
  createBaseService<TransactionDTO, TransactionListResponse>(
    "transactions"
  );
  