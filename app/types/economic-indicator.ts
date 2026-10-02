import type { EconomicIndicatorKey } from "@/app/lib/economic-indicators/bcb-sgs-client";

export type EconomicIndicator = {
  key: EconomicIndicatorKey;
  label: string;
  seriesCode: number;
  value: number | null;
  unit: string;
  unitLabel: string;
  period: string;
  periodLabel: string;
  referenceDate: string | null;
  fetchedAt: string | null;
  source: "BCB_SGS";
  sourceLabel: "Banco Central do Brasil · SGS";
  isStale: boolean;
};

export type EconomicIndicatorSnapshot = {
  indicators: EconomicIndicator[];
  updatedAt: string | null;
};
