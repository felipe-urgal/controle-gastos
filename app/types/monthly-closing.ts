import type { DashboardComparison, DashboardPeriod, DashboardSummary } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type MonthlyClosingLogicalDate = {
  year: number;
  month: number;
  day: number;
};

export type MonthlyClosingPeriodStatus =
  | 'FUTURE'
  | 'IN_PROGRESS'
  | 'REVIEWABLE';

export type MonthlyClosingReadinessStatus =
  | 'READY'
  | 'HAS_PENDING_ITEMS';

export type MonthlyClosingReconciliationStatus =
  | 'RECONCILED'
  | 'PARTIAL'
  | 'NEVER_RECONCILED'
  | 'UNRECONCILED_ITEMS';

export type MonthlyClosingCardStatementState =
  | 'PAID'
  | 'OPEN'
  | 'OVERDUE';

export type MonthlyClosingPendingTransactions = {
  checked: true;
  totalCount: number;
  income: {
    count: number;
    amount: number;
  };
  expense: {
    count: number;
    amount: number;
  };
};

export type MonthlyClosingReconciliationAccount = {
  accountId: string;
  accountName: string;
  accountType: 'CREDIT_DEBIT' | 'INVESTMENT';
  status: MonthlyClosingReconciliationStatus;
  completedCount: number;
  unreconciledCount: number;
  latestCutoff: MonthlyClosingLogicalDate | null;
  href: string;
};

export type MonthlyClosingCardStatement = {
  cardId: string;
  cardName: string;
  amount: number;
  transactionCount: number;
  closingDate: MonthlyClosingLogicalDate;
  dueDate: MonthlyClosingLogicalDate;
  state: MonthlyClosingCardStatementState;
  href: string;
};

export type MonthlyClosingReadiness = {
  checked: true;
  status: MonthlyClosingReadinessStatus;
  pendingTransactions: MonthlyClosingPendingTransactions;
  reconciliation: {
    checked: true;
    accountCount: number;
    reconciledCount: number;
    issueCount: number;
    accounts: MonthlyClosingReconciliationAccount[];
  };
  cardStatements: {
    checked: true;
    count: number;
    paidCount: number;
    openCount: number;
    overdueCount: number;
    items: MonthlyClosingCardStatement[];
  };
};

export type MonthlyClosingRetrospective = {
  summary: DashboardSummary;
  comparison: DashboardComparison;
  planning: {
    budget: number;
    realized: number;
    committed: number;
    available: number;
    overBudgetCategories: number;
    realizedIncome: number;
    expectedIncome: number;
    totalIncome: number;
  };
  topCategories: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    realized: number;
    sharePercentage: number;
  }>;
  netWorth: {
    previous: number;
    current: number;
    difference: number;
  } | null;
  netWorthMethodology: {
    basis: 'TRANSACTION_BALANCE';
    currentPointAsOf: MonthlyClosingLogicalDate;
    description: string;
  };
  readiness: MonthlyClosingReadiness;
};

type MonthlyClosingBase = {
  period: DashboardPeriod;
  currency: SupportedCurrency;
  asOf: MonthlyClosingLogicalDate;
};

export type MonthlyClosingData =
  | (MonthlyClosingBase & {
      status: 'FUTURE';
      retrospective: null;
    })
  | (MonthlyClosingBase & {
      status: 'IN_PROGRESS' | 'REVIEWABLE';
      retrospective: MonthlyClosingRetrospective;
    });
