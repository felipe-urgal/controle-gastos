import { TransactionDTO, TransactionStatus } from "@/app/types/transaction";

export interface ViewProps {
  transaction: TransactionDTO;
  searchTerm?: string;
};

export interface TransactionCardProps {
  transaction: TransactionDTO;
  searchTerm?: string;
  viewMode?: "list" | "grid";
  onChanged?: () => Promise<void> | void;
};

export interface TransactionInfoProps {
  transaction: TransactionDTO;
  isDeleting?: boolean;
};

export interface TransactionFormProps {
  transaction?: TransactionDTO | null;
  isEditing: boolean;
}

export interface FormData {
  amount: number;
  month: number;
  year: number;
  day: number;
  description: string;
  status: TransactionStatus;
  accountId: string;
  categoryId: string;
};
