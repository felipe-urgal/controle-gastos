import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { RecurrenceFrequency } from '@/app/types/transaction';

export type SubscriptionReviewStatus = 'CONFIRMED' | 'REJECTED' | 'IGNORED';

export type SubscriptionPriceChange = {
  previousAmount: number;
  currentAmount: number;
  difference: number;
  percent: number;
};

export type SubscriptionItem = {
  id: string;
  status: 'CONFIRMED' | 'POSSIBLE';
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  currency: SupportedCurrency;
  currentAmount: number;
  typicalAmount: number;
  minAmount: number;
  maxAmount: number;
  monthlyEquivalent: number;
  annualEquivalent: number;
  lastCharge: { year: number; month: number; day: number };
  nextCharge: { year: number; month: number; day: number };
  occurrenceCount: number;
  priceChange: SubscriptionPriceChange | null;
  possiblyEnded: boolean;
  explanation: string;
  evidence: Array<{
    id: string;
    amount: number;
    description: string;
    year: number;
    month: number;
    day: number;
  }>;
  account: { id: string; name: string };
  category: { id: string; name: string };
  merchant: { id: string; name: string } | null;
};

export type SubscriptionCurrencyTotals = {
  currency: SupportedCurrency;
  monthlyEquivalent: number;
  annualEquivalent: number;
};

export type SubscriptionsData = {
  confirmed: SubscriptionItem[];
  possible: SubscriptionItem[];
  priceChanges: SubscriptionItem[];
  totals: SubscriptionCurrencyTotals[];
  windowMonths: number;
};

export type ReviewSubscriptionInput = {
  status: SubscriptionReviewStatus;
};
