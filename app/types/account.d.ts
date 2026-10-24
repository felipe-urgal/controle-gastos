import type {
  ReconciliationStatus,
  TransactionKind,
  TransactionStatus,
  TransactionType,
  TransferRole,
} from '@/app/types/transaction';

export type AccountType = 'CREDIT_DEBIT' | 'INVESTMENT' | 'CREDIT_CARD';

export interface AccountRecentTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  kind: TransactionKind;
  description: string;
  status: TransactionStatus;
  reconciliationStatus: ReconciliationStatus;
  reconciledAt: string | null;
  year: number;
  month: number;
  day: number;
  transferId?: string | null;
  transferRole?: TransferRole | null;
  category: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon: string;
  } | null;
  counterpartAccount: {
    id: string;
    name: string;
    currency: string;
    type: string;
    color: string | null;
    icon: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountLogicalDate {
  year: number;
  month: number;
  day: number;
}

export interface AccountCardStatus {
  usedLimit: number;
  availableLimit: number | null;
  overLimit: number;
  nextStatement: {
    amount: number;
    closingDate: AccountLogicalDate;
    dueDate: AccountLogicalDate;
    transactionCount: number;
  } | null;
  overdueCount: number;
}

export type AccountAttentionKind = 'CARD_OVERDUE' | 'CARD_DUE_SOON' | 'NEGATIVE_BALANCE' | 'CARD_NEAR_LIMIT';

export interface AccountAttentionItem {
  kind: AccountAttentionKind;
  accountId: string;
  name: string;
  currency: string;
  amount: number;
  dueDate: AccountLogicalDate | null;
  daysUntilDue: number | null;
  limitUsedPercent: number | null;
}

export interface AccountActivity {
  monthIncome: number;
  monthExpense: number;
  pendingNet: number;
  pendingCount: number;
  /** Saldo dos últimos 30 dias, do mais antigo para hoje. */
  balanceSeries: number[];
}

export interface AccountModel {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  investmentValueCents?: number | null;
  investmentValueSource?: 'MARKET' | 'COST' | 'MIXED' | null;
  investmentPositionCount?: number;
  cardStatus?: AccountCardStatus | null;
  /** Só vem na leitura de uma conta. Com histórico, tipo, moeda e ciclo do cartão ficam travados. */
  hasFinancialHistory?: boolean | null;
  /** Sem movimentações (o saldo inicial não conta): a conta pode ser excluída. */
  isDeletable?: boolean | null;
  /** Só vem na leitura de uma conta corrente. */
  activity?: AccountActivity | null;
  currency: string;
  isActive: boolean;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  creditLimit?: number | null;
  statementClosingDay?: number | null;
  statementDueDay?: number | null;
  createdAt: string;
  updatedAt: string;
  transactions: AccountRecentTransaction[];
};

export interface AccountResponse {
  status: string | number;
  success: boolean;
  message: string;
  data: {
    items: AccountModel[];
  };
};


export interface AccountListSummary {
  balancesByCurrency: Array<{ currency: string; value: number }>;
  bankBalancesByCurrency: Array<{ currency: string; value: number }>;
  investmentBalancesByCurrency: Array<{ currency: string; value: number }>;
  activeCount: number;
  negativeCount: number;
  totalCount: number;
  typeCounts: Record<AccountType, number>;
  openStatementsByCurrency: Array<{ currency: string; value: number }>;
  attention: AccountAttentionItem[];
}
