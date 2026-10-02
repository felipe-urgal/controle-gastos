import {
  fetchIpcaMonthlyRange,
  IPCA_MONTHLY_SERIES,
} from "@/app/lib/economic-indicators/bcb-sgs-client";
import { prisma } from "@/app/lib/prisma";

const PERCENT_PRECISION = 1_000_000;

type Period = { year: number; month: number };

function periodIndex(period: Period) {
  return period.year * 12 + (period.month - 1);
}

function periodFromIndex(index: number): Period {
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

function expectedPeriods(startExclusive: Period, endInclusive: Period) {
  const first = periodIndex(startExclusive) + 1;
  const last = periodIndex(endInclusive);
  if (first > last) return [];

  return Array.from({ length: last - first + 1 }, (_, offset) =>
    periodFromIndex(first + offset),
  );
}

function referenceDate(period: Period) {
  return new Date(Date.UTC(period.year, period.month - 1, 1));
}

function monthKey(date: Date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function roundPercentage(value: number) {
  return Math.round(value * PERCENT_PRECISION) / PERCENT_PRECISION;
}

function compoundMonthlyInflation(valueMicros: readonly number[]) {
  const factor = valueMicros.reduce(
    (current, micros) => current * (1 + micros / 1_000_000 / 100),
    1,
  );
  return roundPercentage((factor - 1) * 100);
}

async function cachedRows(periods: readonly Period[]) {
  if (periods.length === 0) return [];

  const first = referenceDate(periods[0]);
  const last = referenceDate(periods[periods.length - 1]);

  return prisma.economicIndicatorObservation.findMany({
    where: {
      key: IPCA_MONTHLY_SERIES.key,
      referenceDate: { gte: first, lte: last },
    },
    orderBy: { referenceDate: "asc" },
  });
}

export async function loadIpcaInflationForPeriod(
  startExclusive: Period,
  endInclusive: Period,
  now = new Date(),
) {
  const periods = expectedPeriods(startExclusive, endInclusive);

  if (periods.length === 0) {
    return {
      seriesCode: IPCA_MONTHLY_SERIES.seriesCode,
      source: "BCB_SGS" as const,
      sourceLabel: "Banco Central do Brasil · SGS",
      percentage: 0,
      complete: true,
      expectedMonths: 0,
      availableMonths: 0,
      latestReferenceDate: null,
    };
  }

  let rows = await cachedRows(periods);
  const cachedKeys = new Set(rows.map((row) => monthKey(row.referenceDate)));
  const missing = periods.some(
    (period) => !cachedKeys.has(periodIndex(period)),
  );

  if (missing) {
    try {
      const observations = await fetchIpcaMonthlyRange(
        periods[0],
        periods[periods.length - 1],
      );

      await Promise.all(
        observations.map((observation) =>
          prisma.economicIndicatorObservation.upsert({
            where: {
              key_referenceDate: {
                key: observation.key,
                referenceDate: observation.referenceDate,
              },
            },
            create: {
              key: observation.key,
              seriesCode: observation.seriesCode,
              valueMicros: observation.valueMicros,
              unit: observation.unit,
              period: observation.period,
              referenceDate: observation.referenceDate,
              source: observation.source,
              fetchedAt: now,
            },
            update: {
              seriesCode: observation.seriesCode,
              valueMicros: observation.valueMicros,
              unit: observation.unit,
              period: observation.period,
              source: observation.source,
              fetchedAt: now,
            },
          }),
        ),
      );
    } catch {
      // Mantém as observações já persistidas e sinaliza período incompleto.
    }

    rows = await cachedRows(periods);
  }

  const rowByPeriod = new Map(
    rows.map((row) => [monthKey(row.referenceDate), row]),
  );
  const orderedRows = periods.flatMap((period) => {
    const row = rowByPeriod.get(periodIndex(period));
    return row ? [row] : [];
  });
  const complete = orderedRows.length === periods.length;

  return {
    seriesCode: IPCA_MONTHLY_SERIES.seriesCode,
    source: "BCB_SGS" as const,
    sourceLabel: "Banco Central do Brasil · SGS",
    percentage: complete
      ? compoundMonthlyInflation(orderedRows.map((row) => row.valueMicros))
      : null,
    complete,
    expectedMonths: periods.length,
    availableMonths: orderedRows.length,
    latestReferenceDate:
      orderedRows.at(-1)?.referenceDate.toISOString().slice(0, 10) ?? null,
  };
}
