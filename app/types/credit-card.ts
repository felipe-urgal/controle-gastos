import type { AccountModel } from "@/app/types/account";

export type CardLogicalDate = {
  year: number;
  month: number;
  day: number;
};

export type CreditCardStatementPayment = {
  id: string;
  amount: number;
  sourceAccountId: string;
  sourceTransactionId: string;
  paidAt: string;
};

export type CreditCardStatementItem = {
  closingDate: CardLogicalDate;
  dueDate: CardLogicalDate;
  total: number;
  completedTotal: number;
  pendingTotal: number;
  transactionCount: number;
  status: "OPEN" | "PAID";
  payment: CreditCardStatementPayment | null;
  transactions: Array<{
    id: string;
    amount: number;
    year: number;
    month: number;
    day: number;
    type: "EXPENSE";
    status: "PENDING" | "COMPLETED";
    description: string;
    seriesId?: string | null;
    seriesIndex?: number | null;
  }>;
};

export type CreditCardStatementsData = {
  card: Pick<
    AccountModel,
    "id" | "name" | "currency" | "isActive" | "creditLimit" | "statementClosingDay" | "statementDueDay"
  > & {
    creditLimit: number;
    usedLimit: number;
    availableLimit: number;
    overLimit: number;
    statementClosingDay: number;
    statementDueDay: number;
  };
  asOf: CardLogicalDate;
  current: CreditCardStatementItem;
  future: CreditCardStatementItem[];
  history: CreditCardStatementItem[];
};

export type PayCreditCardStatementInput = {
  sourceAccountId: string;
  statementClosingDate: string;
  paymentDate: string;
};
