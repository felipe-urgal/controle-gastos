import type { AccountType } from '@/app/types/account';
import type { CurrencyFinancialSummary, SupportedCurrency } from '@/app/types/financial-summary';
import type {
  TransactionSeriesType,
  TransactionStatus,
  TransferRole,
} from '@/app/types/transaction';

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type CalendarEventSourceKind =
  | 'TRANSACTION'
  | 'TRANSFER'
  | 'CARD_PAYMENT'
  | 'CARD_STATEMENT'
  | 'DEBT_INSTALLMENT'
  | 'GOAL_DEADLINE'
  | 'INVESTMENT_BUY'
  | 'INVESTMENT_SELL'
  | 'INVESTMENT_INCOME';

export type CalendarEventDirection =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'MILESTONE';

export type CalendarCommitmentState = 'OVERDUE' | 'UPCOMING';

export type CalendarEventAccount = {
  id: string;
  name: string;
  type: AccountType;
  currency: SupportedCurrency;
};

export type CalendarEvent = {
  id: string;
  sourceId: string;
  sourceKind: CalendarEventSourceKind;
  title: string;
  amount: number | null;
  currency: SupportedCurrency;
  date: CalendarDate;
  direction: CalendarEventDirection;
  status: TransactionStatus | null;
  commitmentState: CalendarCommitmentState | null;
  account: CalendarEventAccount | null;
  counterpartAccount: CalendarEventAccount | null;
  category: {
    id: string;
    name: string;
    icon: string;
  } | null;
  transferRole: TransferRole | null;
  seriesType: TransactionSeriesType | null;
  href: string;
};

export type CalendarApiDay = {
  date: CalendarDate;
  summaries: CurrencyFinancialSummary[];
  events: CalendarEvent[];
};

/** Eventos de investimento são informativos: ficam fora dos totais financeiros do dia e do mês. */
export const INVESTMENT_EVENT_KINDS: readonly CalendarEventSourceKind[] = [
  'INVESTMENT_BUY',
  'INVESTMENT_SELL',
  'INVESTMENT_INCOME',
];

export function isInvestmentEvent(event: Pick<CalendarEvent, 'sourceKind'>) {
  return INVESTMENT_EVENT_KINDS.includes(event.sourceKind);
}

export type CalendarInvestmentIncome = {
  currency: SupportedCurrency;
  /** Soma dos rendimentos líquidos recebidos no mês, em centavos. */
  amount: number;
  count: number;
};

export type CalendarReadModel = {
  period: {
    year: number;
    month: number;
  };
  asOf: CalendarDate;
  accountId: string | null;
  days: CalendarApiDay[];
  summary: CurrencyFinancialSummary[];
  /** Proventos do mês por moeda; nunca soma moedas diferentes. */
  investmentIncome: CalendarInvestmentIncome[];
  commitments: CalendarEvent[];
  commitmentCount: number;
  overdueCount: number;
};

export type CalendarDay = {
  date: Date;
  isCurrentMonth: true;
  isToday: boolean;
  summaries: CurrencyFinancialSummary[];
  events: CalendarEvent[];
};
