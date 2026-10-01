import { TransactionDTO, TransactionStatus } from "@/app/types/transaction";

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
  merchantId?: string | null;
  allocations?: Array<{ categoryId: string; amount: number }>;
  tagIds?: string[];
};
