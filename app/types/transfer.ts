export type TransferStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface CreateTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  year: number;
  month: number;
  day: number;
  description: string;
  status: "PENDING" | "COMPLETED";
}

export interface CreateTransferResponse {
  id: string;
  currency: string;
  sourceTransactionId: string;
  destinationTransactionId: string;
  status: TransferStatus;
}
