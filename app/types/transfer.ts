export type { CreateTransferInput } from "@/app/schemas/transfer.schema";

export type TransferStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface CreateTransferResponse {
  id: string;
  currency: string;
  sourceTransactionId: string;
  destinationTransactionId: string;
  status: TransferStatus;
}
