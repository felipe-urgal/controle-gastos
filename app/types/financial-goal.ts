import type { SupportedCurrency } from "@/app/types/financial-summary";

export type FinancialGoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type FinancialGoalEntryType = "CONTRIBUTION" | "WITHDRAWAL";

export type FinancialGoalEntry = {
  id: string;
  type: FinancialGoalEntryType;
  amount: number;
  description: string | null;
  createdAt: string;
};

export type FinancialGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currency: SupportedCurrency;
  targetDate: string | null;
  status: FinancialGoalStatus;
  description: string | null;
  account: {
    id: string;
    name: string;
    currency: string;
    type: string;
    isActive: boolean;
  } | null;
  currentAmount: number;
  contributions: number;
  withdrawals: number;
  remainingAmount: number;
  percentage: number;
  monthlyContributionSuggestion: number | null;
  entries?: FinancialGoalEntry[];
  createdAt: string;
  updatedAt: string;
};
