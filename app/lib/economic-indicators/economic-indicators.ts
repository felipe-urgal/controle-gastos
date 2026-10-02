import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  BCB_SGS_INDICATORS,
  fetchBcbSgsIndicator,
  type EconomicIndicatorKey,
} from "@/app/lib/economic-indicators/bcb-sgs-client";
import { prisma } from "@/app/lib/prisma";
import type {
  EconomicIndicator,
  EconomicIndicatorSnapshot,
} from "@/app/types/economic-indicator";

const INDICATOR_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;
const INDICATOR_KEYS = Object.keys(
  BCB_SGS_INDICATORS,
) as EconomicIndicatorKey[];

type IndicatorRow = {
  key: string;
  seriesCode: number;
  valueMicros: number;
  unit: string;
  period: string;
  referenceDate: Date;
  source: string;
  fetchedAt: Date;
};

function isStale(fetchedAt: Date, now: Date) {
  return now.getTime() - fetchedAt.getTime() >= INDICATOR_CACHE_TTL_MS;
}

async function latestRows() {
  const rows = await prisma.economicIndicatorObservation.findMany({
    where: { key: { in: INDICATOR_KEYS } },
    orderBy: [{ referenceDate: "desc" }, { fetchedAt: "desc" }],
  });

  const byKey = new Map<EconomicIndicatorKey, IndicatorRow>();
  for (const row of rows) {
    const key = row.key as EconomicIndicatorKey;
    if (INDICATOR_KEYS.includes(key) && !byKey.has(key)) {
      byKey.set(key, row);
    }
  }
  return byKey;
}

async function refreshStaleIndicators(
  cached: Map<EconomicIndicatorKey, IndicatorRow>,
  now: Date,
) {
  const keysToRefresh = INDICATOR_KEYS.filter((key) => {
    const row = cached.get(key);
    return !row || isStale(row.fetchedAt, now);
  });

  await Promise.all(
    keysToRefresh.map(async (key) => {
      try {
        const indicator = await fetchBcbSgsIndicator(key);
        await prisma.economicIndicatorObservation.upsert({
          where: {
            key_referenceDate: {
              key: indicator.key,
              referenceDate: indicator.referenceDate,
            },
          },
          create: {
            key: indicator.key,
            seriesCode: indicator.seriesCode,
            valueMicros: indicator.valueMicros,
            unit: indicator.unit,
            period: indicator.period,
            referenceDate: indicator.referenceDate,
            source: indicator.source,
            fetchedAt: now,
          },
          update: {
            seriesCode: indicator.seriesCode,
            valueMicros: indicator.valueMicros,
            unit: indicator.unit,
            period: indicator.period,
            source: indicator.source,
            fetchedAt: now,
          },
        });
      } catch {
        // A última observação válida permanece disponível como fallback stale.
      }
    }),
  );
}

function serializeIndicator(
  key: EconomicIndicatorKey,
  row: IndicatorRow | undefined,
  now: Date,
): EconomicIndicator {
  const definition = BCB_SGS_INDICATORS[key];

  return {
    key,
    label: definition.label,
    seriesCode: definition.seriesCode,
    value: row ? row.valueMicros / 1_000_000 : null,
    unit: row?.unit ?? definition.unit,
    unitLabel: definition.unitLabel,
    period: row?.period ?? definition.period,
    periodLabel: definition.periodLabel,
    referenceDate: row
      ? row.referenceDate.toISOString().slice(0, 10)
      : null,
    fetchedAt: row?.fetchedAt.toISOString() ?? null,
    source: "BCB_SGS",
    sourceLabel: "Banco Central do Brasil · SGS",
    isStale: row ? isStale(row.fetchedAt, now) : false,
  };
}

export async function loadEconomicIndicatorSnapshot(
  now = new Date(),
): Promise<EconomicIndicatorSnapshot> {
  let rows = await latestRows();
  await refreshStaleIndicators(rows, now);
  rows = await latestRows();

  const indicators = INDICATOR_KEYS.map((key) =>
    serializeIndicator(key, rows.get(key), now),
  );
  const fetchedTimes = indicators
    .map((indicator) => indicator.fetchedAt)
    .filter((value): value is string => value !== null)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  return {
    indicators,
    updatedAt:
      fetchedTimes.length > 0
        ? new Date(Math.max(...fetchedTimes)).toISOString()
        : null,
  };
}

export async function getEconomicIndicators() {
  try {
    await getAuthenticatedUserId();
    return success(await loadEconomicIndicatorSnapshot());
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autorizado", 401, "UNAUTHORIZED");
    }
    return failure("Erro ao carregar indicadores econômicos", 500);
  }
}
