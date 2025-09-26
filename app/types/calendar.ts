// types/calendar.ts
export interface Transaction {
  id: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  transactionDate: string;
  category?: {
    id: string;
    name: string;
  };
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  categoryId?: string;
  accountId?: string;
  userId?: string;
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

export interface Category {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  currency: string;
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

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  selectedDate: Date | null;
}

export interface TransactionFormData {
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  categoryId: string;
  accountId: string;
}

export interface InvestmentFormData {
  amount: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  description: string;
  ticker: string;
  quantity: string;
  unitPrice: string;
  accountId: string;
}