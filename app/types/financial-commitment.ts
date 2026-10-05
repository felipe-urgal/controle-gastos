import type { SupportedCurrency } from '@/app/types/financial-summary';

export type FinancialCommitmentType =
  | 'PENDING'
  | 'RECURRING'
  | 'INSTALLMENT'
  | 'CARD_STATEMENT'
  | 'DEBT_INSTALLMENT'
  | 'GOAL_DEADLINE';

export type FinancialCommitmentDirection = 'PAYABLE' | 'RECEIVABLE' | 'MILESTONE';
export type FinancialCommitmentState = 'OVERDUE' | 'UPCOMING';

export type FinancialCommitmentDate = {
  year: number;
  month: number;
  day: number;
};

export type FinancialCommitmentSource =
  | { kind: 'TRANSACTION'; id: string }
  | { kind: 'CARD'; id: string }
  | { kind: 'DEBT'; id: string }
  | { kind: 'GOAL'; id: string };

export type FinancialCommitment = {
  id: string;
  type: FinancialCommitmentType;
  direction: FinancialCommitmentDirection;
  state: FinancialCommitmentState;
  title: string;
  amount: number | null;
  currency: SupportedCurrency;
  date: FinancialCommitmentDate;
  href: string;
  accountName: string | null;
  source: FinancialCommitmentSource;
};

export type FinancialCommitmentTotals = {
  payable: {
    count: number;
    amount: number;
  };
  receivable: {
    count: number;
    amount: number;
  };
  milestoneCount: number;
  overdueCount: number;
};

export type FinancialCommitmentsData = {
  asOf: FinancialCommitmentDate;
  through: FinancialCommitmentDate;
  currency: SupportedCurrency;
  days: 7 | 30 | 60 | 90;
  items: FinancialCommitment[];
  totals: FinancialCommitmentTotals;
};
