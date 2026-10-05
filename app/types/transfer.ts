export type { CreateTransferInput, UpdateTransferInput } from "@/app/schemas/transfer.schema";

export type TransferStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface CreateTransferResponse {
  id: string;
  currency: string;
  sourceTransactionId: string;
  destinationTransactionId: string;
  status: TransferStatus;
}

export type TransferAccountDTO = {
  id: string;
  name: string;
  currency: string;
  type: string;
  color: string | null;
  icon: string | null;
};

export type TransferLegDTO = {
  transactionId: string;
  reconciliationStatus: "UNCLEARED" | "CLEARED" | "RECONCILED";
  reconciledAt: string | null;
  account: TransferAccountDTO;
  counterpartAccount: TransferAccountDTO;
};

export type TransferDTO = {
  id: string;
  amountCents: number;
  currency: string;
  year: number;
  month: number;
  day: number;
  description: string;
  status: TransferStatus;
  source: TransferLegDTO;
  destination: TransferLegDTO;
  createdAt: string;
  updatedAt: string;
};

export type TransferMutationResponse = {
  id: string;
  currency: string;
  sourceTransactionId: string;
  destinationTransactionId: string;
  amountCents: number;
  year: number;
  month: number;
  day: number;
  description: string;
  status: TransferStatus;
};
