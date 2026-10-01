import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { RecurrenceFrequency, TransactionType } from '@/app/types/transaction';

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
  type: TransactionType;
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
  merchant: { id: string; name: string } | null;
};

export type RecurrenceCandidateEvidence = {
  id: string;
  amount: number;
  description: string;
  year: number;
  month: number;
  day: number;
};

export type RecurrenceCandidate = {
  id: string;
  signature: string;
  source: 'DETECTED';
  description: string;
  normalizedDescription: string;
  type: TransactionType;
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
  explanation: string;
  evidence: RecurrenceCandidateEvidence[];
  account: { id: string; name: string };
  category: { id: string; name: string };
  merchant: { id: string; name: string } | null;
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
