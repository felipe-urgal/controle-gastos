import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { RecurrenceFrequency } from '@/app/types/transaction';

export type RecurrenceLogicalDate = {
  year: number;
  month: number;
  day: number;
};

export type RecurrenceSummaryItem = {
  id: string;
  transactionId: string;
  source: 'FORMAL';
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  amount: number;
  variableAmount: false;
  currency: SupportedCurrency;
  monthlyEquivalent: number;
  annualEquivalent: number;
  nextOccurrence: RecurrenceLogicalDate;
  account: { id: string; name: string };
  category: { id: string; name: string };
};

export type RecurrenceCandidate = {
  id: string;
  source: 'DETECTED';
  description: string;
  normalizedDescription: string;
  frequency: RecurrenceFrequency;
  interval: number;
  amount: number;
  minAmount: number;
  maxAmount: number;
  variableAmount: boolean;
  currency: SupportedCurrency;
  monthlyEquivalent: number;
  annualEquivalent: number;
  nextOccurrence: RecurrenceLogicalDate;
  occurrenceCount: number;
  account: { id: string; name: string };
  category: { id: string; name: string };
};

export type RecurrenceCurrencyTotals = {
  currency: SupportedCurrency;
  monthlyEquivalent: number;
  annualEquivalent: number;
};

export type RecurrencesData = {
  formal: RecurrenceSummaryItem[];
  candidates: RecurrenceCandidate[];
  totals: RecurrenceCurrencyTotals[];
  candidateWindowMonths: number;
  candidateHistoryLimit: number;
};

export type UpdateRecurrenceSeriesInput = {
  description: string;
  amount: number;
};

export type UpdateRecurrenceSeriesResponse = {
  id: string;
  description: string;
  amount: number;
  updatedPendingCount: number;
};
