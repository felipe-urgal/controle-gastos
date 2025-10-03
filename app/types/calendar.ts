export interface Transaction {
  id?: string;
  _id?: string;
  amount?: string | number;
  type?: 'INCOME' | 'EXPENSE' | string;
  description?: string;
  transactionDate?: string;
  category?: {
    id?: string;
    name?: string;
    icon?: string;
    type?: string;
    [key: string]: any;
  };
  account?: {
    id?: string;
    name?: string;
    currency?: string;
    [key: string]: any;
  };
  categoryId?: string;
  accountId?: string;
  userId?: string;
  year?: number;
  month?: number;
  day?: number;
  status?: "PENDING" | "COMPLETED" | "CANCELLED" | string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Category {
  id?: string;
  _id?: string;
  name?: string;
  type?: string;
  icon?: string;
  color?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Account {
  id?: string;
  _id?: string;
  name?: string;
  currency?: string;
  type?: string;
  balance?: number | string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Investment {
  id?: string;
  _id?: string;
  amount?: string | number;
  type?: 'BUY' | 'SELL' | 'DIVIDEND' | string;
  description?: string;
  investmentDate?: string;
  ticker?: string;
  quantity?: number;
  unitPrice?: string | number;
  account?: {
    id?: string;
    name?: string;
    currency?: string;
    [key: string]: any;
  };
  accountId?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CalendarDay {
  date?: Date;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  income?: number;
  expenses?: number;
  transactions?: Transaction[];
  investments?: Investment[];
  [key: string]: any;
}

export interface DayModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  selectedDate?: Date | null;
  transactions?: Transaction[];
  investments?: Investment[];
  isLoading?: boolean;
  onTransactionsChange?: () => void;
  onInvestmentsChange?: () => void;
  user?: any;
  className?: string;
  [key: string]: any;
}

export interface DeleteConfirmationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  itemName?: string;
  itemType?: string;
  isDeleting?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  className?: string;
  [key: string]: any;
}

export interface InvestmentFormModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  formData?: any;
  setFormData?: (data: any) => void;
  editingInvestment?: Investment | null;
  isSubmitting?: boolean;
  accounts?: Account[];
  onSubmit?: (data: any) => void;
  selectedDate?: Date | null;
  user?: any;
  className?: string;
  [key: string]: any;
}

export interface TransactionFormModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  formData?: any;
  setFormData?: (data: any) => void;
  editingTransaction?: Transaction | null;
  isSubmitting?: boolean;
  categories?: Category[];
  accounts?: Account[];
  onSubmit?: (data: any) => void;
  selectedDate?: Date | null;
  user?: any;
  className?: string;
  [key: string]: any;
}
