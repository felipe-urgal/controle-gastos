import type { SupportedCurrency } from "@/app/types/financial-summary";

export type DebtStatus = "ACTIVE" | "PAID" | "ARCHIVED";
export type DebtAdjustmentKind =
  | "INITIAL_BALANCE"
  | "MANUAL_ADJUSTMENT"
  | "PAYMENT";

export type DebtAdjustment = {
  id: string;
  previousBalance: number;
  newBalance: number;
  delta: number;
  kind: DebtAdjustmentKind;
  description: string | null;
  effectiveDate: string | null;
  transactionId: string | null;
  transaction: {
    id: string;
    amount: number;
    description: string;
    year: number;
    month: number;
    day: number;
    account: {
      id: string;
      name: string;
      currency: string;
    };
  } | null;
  createdAt: string;
};

export type Debt = {
  id: string;
  name: string;
  currency: SupportedCurrency;
  balance: number;
  installmentAmount: number | null;
  dueDate: string | null;
  remainingInstallments: number | null;
  institution: string | null;
  description: string | null;
  status: DebtStatus;
  adjustmentCount: number;
  adjustments?: DebtAdjustment[];
  adjustmentHistory?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  createdAt: string;
  updatedAt: string;
};
