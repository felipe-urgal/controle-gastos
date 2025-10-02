export interface Transaction {
  id: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  transactionDate: string;
  category?: {
    id: string;
    name: string;
    icon: string;
  };
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  categoryId?: string;
  accountId?: string;
  userId?: string;
  year: number;
  month: number;
  day: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
}

export interface Category {
  id: string;
  name: string;
  type: string;
}

export interface Account {
  id: string;
  name: string;
  currency: string;
}

export interface Investment {
  id: string;
  amount: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  description: string;
  investmentDate: string;
  ticker?: string;
  quantity?: number;
  unitPrice?: string;
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  accountId?: string;
  userId?: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  income: number;
  expenses: number;
  transactions: Transaction[];
  investments: Investment[];
}

export interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  transactions: Transaction[];
  investments: Investment[];
  isLoading: boolean;
  onTransactionsChange: () => void;
}

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  isDeleting?: boolean;
}

export interface InvestmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  setFormData: (data: any) => void;
  editingInvestment: Investment | null;
  isSubmitting: boolean;
  accounts: Account[];
  onSubmit: (e: React.FormEvent) => void;
  selectedDate: Date | null;
}

export interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  setFormData: (data: any) => void;
  editingTransaction: Transaction | null;
  isSubmitting: boolean;
  categories: Category[];
  accounts: Account[];
  onSubmit: (e: React.FormEvent) => void;
  selectedDate: Date | null;
}