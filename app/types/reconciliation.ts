export type ReconciliationStatus = 'UNCLEARED' | 'CLEARED' | 'RECONCILED';

export interface ReconciliationInput {
  year: number;
  month: number;
  day: number;
  statementBalance: number;
}

export interface ReconciliationItem {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  kind: 'NORMAL' | 'TRANSFER';
  description: string;
  reconciliationStatus: ReconciliationStatus;
  year: number;
  month: number;
  day: number;
}

export interface ReconciliationPreview {
  account: {
    id: string;
    name: string;
    currency: string;
  };
  cutoff: {
    year: number;
    month: number;
    day: number;
  };
  statementBalance: number;
  realizedBalance: number;
  clearedBalance: number;
  difference: number;
  unclearedItems: ReconciliationItem[];
  clearedItems: ReconciliationItem[];
  reconciledCount: number;
  latestReconciliation: null | {
    reconciledAt: string;
    transactionCount: number;
    cutoff: null | {
      year: number;
      month: number;
      day: number;
    };
    statementBalance: number | null;
  };
}

export interface ReconciliationConfirmation {
  account: ReconciliationPreview['account'];
  cutoff: ReconciliationPreview['cutoff'];
  statementBalance: number;
  clearedBalance: number;
  difference: 0;
  reconciledCount: number;
  reconciledAt: string | null;
}

export interface ReconciliationUndoResult {
  account: ReconciliationPreview['account'];
  batchReconciledAt: string;
  restoredCount: number;
  undoneAt: string;
  idempotent: boolean;
}
