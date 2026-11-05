import type { AccountType } from "@/app/types/account";
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
    type: AccountType;
    isActive: boolean;
  } | null;
  /** Percentual (1-100) da receita do mês que a pessoa quer guardar; gera só uma sugestão de aporte. */
  incomeSharePercent: number | null;
  /** Sugestão do mês (só na listagem, para metas ativas com percentual e receita no mês). */
  incomeShare: {
    percent: number;
    monthIncome: number;
    suggested: number;
    contributedThisMonth: number;
    remaining: number;
  } | null;
  currentAmount: number;
  contributions: number;
  withdrawals: number;
  remainingAmount: number;
  percentage: number;
  monthlyContributionSuggestion: number | null;
  entryCount: number;
  entries?: FinancialGoalEntry[];
  entryHistory?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  createdAt: string;
  updatedAt: string;
};
