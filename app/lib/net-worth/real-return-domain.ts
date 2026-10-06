import type { SupportedCurrency } from "@/app/types/financial-summary";

const PERCENT_PRECISION = 1_000_000;

export type RealReturnStatus =
  | "AVAILABLE"
  | "BASELINE_NOT_POSITIVE"
  | "INFLATION_INCOMPLETE"
  | "NOMINAL_ONLY";

function roundPercentage(value: number) {
  return Math.round(value * PERCENT_PRECISION) / PERCENT_PRECISION;
}

function nominalPercentage(initial: number, current: number) {
  if (initial <= 0) return null;
  return roundPercentage((current / initial - 1) * 100);
}

export function compoundMonthlyInflation(
  monthlyPercentages: readonly number[],
) {
  const factor = monthlyPercentages.reduce(
    (current, percentage) => current * (1 + percentage / 100),
    1,
  );
  return roundPercentage((factor - 1) * 100);
}

export function calculateRealReturn(args: {
  initial: number;
  current: number;
  inflationPercentage: number | null;
  inflationComplete: boolean;
}) {
  const { initial, current, inflationPercentage, inflationComplete } = args;

  if (initial <= 0) {
    return {
      nominalPercentage: null,
      realPercentage: null,
      status: "BASELINE_NOT_POSITIVE" as const,
    };
  }

  const nominalRatio = current / initial;
  const calculatedNominal = nominalPercentage(initial, current);

  if (!inflationComplete || inflationPercentage === null) {
    return {
      nominalPercentage: calculatedNominal,
      realPercentage: null,
      status: "INFLATION_INCOMPLETE" as const,
    };
  }

  const inflationRatio = 1 + inflationPercentage / 100;
  const realPercentage = roundPercentage(
    (nominalRatio / inflationRatio - 1) * 100,
  );

  return {
    nominalPercentage: calculatedNominal,
    realPercentage,
    status: "AVAILABLE" as const,
  };
}

export function buildRealReturnByCurrency(args: {
  baselineTotals: Partial<Record<SupportedCurrency, number>>;
  currentTotals: Partial<Record<SupportedCurrency, number>>;
  inflationPercentage: number | null;
  inflationComplete: boolean;
}) {
  const currencies = ["BRL", "USD", "EUR"] as const;

  return currencies.flatMap((currency) => {
    const hasBaseline = Object.prototype.hasOwnProperty.call(
      args.baselineTotals,
      currency,
    );
    const hasCurrent = Object.prototype.hasOwnProperty.call(
      args.currentTotals,
      currency,
    );

    if (!hasBaseline && !hasCurrent) return [];

    const initial = args.baselineTotals[currency] ?? 0;
    const current = args.currentTotals[currency] ?? 0;

    if (currency !== "BRL") {
      return [
        {
          currency,
          initial,
          current,
          nominalPercentage: nominalPercentage(initial, current),
          inflationPercentage: null,
          realPercentage: null,
          status:
            initial <= 0
              ? ("BASELINE_NOT_POSITIVE" as const)
              : ("NOMINAL_ONLY" as const),
        },
      ];
    }

    const calculated = calculateRealReturn({
      initial,
      current,
      inflationPercentage: args.inflationPercentage,
      inflationComplete: args.inflationComplete,
    });

    return [
      {
        currency,
        initial,
        current,
        inflationPercentage: args.inflationPercentage,
        ...calculated,
      },
    ];
  });
}
