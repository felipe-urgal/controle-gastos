import type { SupportedCurrency } from "@/app/types/financial-summary";

export type DebtStatus = "ACTIVE" | "PAID" | "ARCHIVED";

export type DebtAdjustment = {
  id: string;
  previousBalance: number;
  newBalance: number;
  delta: number;
  description: string | null;
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
  adjustments?: DebtAdjustment[];
  createdAt: string;
  updatedAt: string;
};
