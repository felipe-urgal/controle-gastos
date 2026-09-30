import type { SupportedCurrency } from '@/app/types/financial-summary';

export type FinancialCommitmentType =
  | 'PENDING'
  | 'RECURRING'
  | 'INSTALLMENT'
  | 'CARD_STATEMENT'
  | 'DEBT_INSTALLMENT'
  | 'GOAL_DEADLINE';

export type FinancialCommitmentDate = {
  year: number;
  month: number;
  day: number;
};

export type FinancialCommitment = {
  id: string;
  type: FinancialCommitmentType;
  title: string;
  amount: number | null;
  currency: SupportedCurrency;
  date: FinancialCommitmentDate;
  href: string;
  accountName: string | null;
};

export type FinancialCommitmentsData = {
  asOf: FinancialCommitmentDate;
  through: FinancialCommitmentDate;
  currency: SupportedCurrency;
  days: 7 | 30 | 60 | 90;
  items: FinancialCommitment[];
  totals: {
    monetaryCount: number;
    monetaryAmount: number;
    milestoneCount: number;
  };
};
