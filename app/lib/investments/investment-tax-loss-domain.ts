export type TaxLossMonthlyResult = {
  year: number;
  month: number;
  assetType: string;
  currency: string;
  realizedResultCents: number;
  status: "OK" | "PENDING";
};

export type TaxLossAdjustment = {
  id: string;
  year: number;
  month: number;
  assetType: string;
  currency: string;
  amountCents: number;
  reason: string;
  createdAt: Date;
};

export type TaxLossLedgerRow = {
  year: number;
  month: number;
  assetType: string;
  currency: string;
  openingLossCents: number;
  realizedResultCents: number;
  generatedLossCents: number;
  compensatedLossCents: number;
  taxableResultAfterCompensationCents: number;
  closingLossCents: number;
  status: "OK" | "PENDING";
  adjustment: {
    id: string;
    amountCents: number;
    reason: string;
  } | null;
};

function keyOf(value: { assetType: string; currency: string }) {
  return `${value.assetType}|${value.currency}`;
}

function monthKey(year: number, month: number) {
  return year * 100 + month;
}

export function deriveTaxLossCarryforward(args: {
  results: readonly TaxLossMonthlyResult[];
  adjustments: readonly TaxLossAdjustment[];
}): TaxLossLedgerRow[] {
  const keys = new Set<string>();
  for (const item of args.results) keys.add(keyOf(item));
  for (const item of args.adjustments) keys.add(keyOf(item));

  const rows: TaxLossLedgerRow[] = [];

  for (const key of keys) {
    const [assetType, currency] = key.split("|");
    const results = args.results
      .filter((item) => keyOf(item) === key)
      .sort(
        (left, right) =>
          monthKey(left.year, left.month) - monthKey(right.year, right.month),
      );
    const adjustments = args.adjustments
      .filter((item) => keyOf(item) === key)
      .sort((left, right) => {
        const month =
          monthKey(left.year, left.month) - monthKey(right.year, right.month);
        if (month !== 0) return month;
        const created = left.createdAt.getTime() - right.createdAt.getTime();
        return created !== 0 ? created : left.id.localeCompare(right.id);
      });

    const firstKeys = [
      ...results.map((item) => monthKey(item.year, item.month)),
      ...adjustments.map((item) => monthKey(item.year, item.month)),
    ];
    if (firstKeys.length === 0) continue;

    const first = Math.min(...firstKeys);
    const last = Math.max(...firstKeys);
    let year = Math.floor(first / 100);
    let month = first % 100;
    let openingLossCents = 0;

    while (monthKey(year, month) <= last) {
      const monthResults = results.filter(
        (item) => item.year === year && item.month === month,
      );
      const monthAdjustments = adjustments.filter(
        (item) => item.year === year && item.month === month,
      );
      const adjustment = monthAdjustments.at(-1) ?? null;

      if (adjustment) openingLossCents = adjustment.amountCents;

      const hasPending = monthResults.some((item) => item.status === "PENDING");
      const realizedResultCents = monthResults
        .filter((item) => item.status === "OK")
        .reduce((total, item) => total + item.realizedResultCents, 0);

      let generatedLossCents = 0;
      let compensatedLossCents = 0;
      let taxableResultAfterCompensationCents = 0;
      let closingLossCents = openingLossCents;

      if (!hasPending) {
        if (realizedResultCents < 0) {
          generatedLossCents = Math.abs(realizedResultCents);
          closingLossCents += generatedLossCents;
        } else if (realizedResultCents > 0) {
          compensatedLossCents = Math.min(
            openingLossCents,
            realizedResultCents,
          );
          closingLossCents -= compensatedLossCents;
          taxableResultAfterCompensationCents =
            realizedResultCents - compensatedLossCents;
        }
      }

      if (
        monthResults.length > 0 ||
        adjustment !== null ||
        openingLossCents > 0 ||
        closingLossCents > 0
      ) {
        rows.push({
          year,
          month,
          assetType,
          currency,
          openingLossCents,
          realizedResultCents,
          generatedLossCents,
          compensatedLossCents,
          taxableResultAfterCompensationCents,
          closingLossCents,
          status: hasPending ? "PENDING" : "OK",
          adjustment: adjustment
            ? {
                id: adjustment.id,
                amountCents: adjustment.amountCents,
                reason: adjustment.reason,
              }
            : null,
        });
      }

      openingLossCents = closingLossCents;
      month += 1;
      if (month === 13) {
        year += 1;
        month = 1;
      }
    }
  }

  return rows.sort((left, right) => {
    const month =
      monthKey(left.year, left.month) - monthKey(right.year, right.month);
    if (month !== 0) return month;
    const type = left.assetType.localeCompare(right.assetType);
    if (type !== 0) return type;
    return left.currency.localeCompare(right.currency);
  });
}
