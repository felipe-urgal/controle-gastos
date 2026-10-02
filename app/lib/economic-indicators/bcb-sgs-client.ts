import { z } from "zod";

const BCB_SGS_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";
const BCB_SGS_TIMEOUT_MS = 5_000;

export const BCB_SGS_INDICATORS = {
  IPCA_12M: {
    seriesCode: 13522,
    label: "IPCA 12 meses",
    unit: "PERCENT",
    unitLabel: "%",
    period: "TWELVE_MONTHS",
    periodLabel: "acumulado em 12 meses",
  },
  SELIC_ANNUALIZED: {
    seriesCode: 1178,
    label: "Selic",
    unit: "PERCENT_PER_YEAR",
    unitLabel: "% a.a.",
    period: "DAILY",
    periodLabel: "taxa diária anualizada (base 252)",
  },
  CDI_DAILY: {
    seriesCode: 12,
    label: "CDI",
    unit: "PERCENT_PER_DAY",
    unitLabel: "% a.d.",
    period: "DAILY",
    periodLabel: "taxa diária",
  },
} as const;

export const IPCA_MONTHLY_SERIES = {
  key: "IPCA_MONTHLY",
  seriesCode: 433,
  label: "IPCA mensal",
  unit: "PERCENT",
  period: "MONTHLY",
} as const;

export type EconomicIndicatorKey = keyof typeof BCB_SGS_INDICATORS;

const bcbSgsResponseSchema = z.array(
  z.object({
    data: z.string().min(10),
    valor: z.string().min(1),
  }),
);

type FetchLike = typeof fetch;

function buildLatestUrl(seriesCode: number) {
  return new URL(
    BCB_SGS_BASE_URL + "." + seriesCode + "/dados/ultimos/1?formato=json",
  );
}

function formatQueryDate(date: Date) {
  return [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    date.getUTCFullYear(),
  ].join("/");
}

function buildRangeUrl(
  seriesCode: number,
  start: { year: number; month: number },
  end: { year: number; month: number },
) {
  const startDate = new Date(Date.UTC(start.year, start.month - 1, 1));
  const endDate = new Date(Date.UTC(end.year, end.month, 0));
  const url = new URL(
    BCB_SGS_BASE_URL + "." + seriesCode + "/dados",
  );
  url.searchParams.set("formato", "json");
  url.searchParams.set("dataInicial", formatQueryDate(startDate));
  url.searchParams.set("dataFinal", formatQueryDate(endDate));
  return url;
}

function parseReferenceDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) throw new Error("Data inválida recebida do BCB SGS");

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Data inválida recebida do BCB SGS");
  }

  return date;
}

function parseValueMicros(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) {
    throw new Error("Valor inválido recebido do BCB SGS");
  }

  const micros = Math.round(numeric * 1_000_000);
  if (
    !Number.isSafeInteger(micros) ||
    micros < -2_147_483_648 ||
    micros > 2_147_483_647
  ) {
    throw new Error("Valor do BCB SGS excede o limite suportado");
  }

  return micros;
}

function httpError(status: number) {
  if (status === 429) return new Error("Limite de requisições do BCB SGS atingido");
  return new Error("BCB SGS respondeu HTTP " + status);
}

async function requestRows(
  url: URL,
  fetchFn: FetchLike,
  timeoutMs: number,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const error = httpError(response.status);
        if (response.status !== 429 && response.status < 500) throw error;
        lastError = error;
        continue;
      }

      const payload = bcbSgsResponseSchema.safeParse(await response.json());
      if (!payload.success) {
        throw new Error("Resposta inválida recebida do BCB SGS");
      }

      return payload.data;
    } catch (error) {
      lastError = error;
      const nonRetryable =
        error instanceof Error &&
        (error.message.startsWith("Resposta inválida") ||
          /^BCB SGS respondeu HTTP 4(?!29)/.test(error.message));
      if (nonRetryable) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error("Tempo limite excedido ao consultar o BCB SGS");
  }
  if (lastError instanceof Error && lastError.message.startsWith("BCB SGS respondeu")) {
    throw lastError;
  }
  if (lastError instanceof Error && lastError.message.startsWith("Limite de requisições")) {
    throw lastError;
  }
  throw new Error("Não foi possível consultar o BCB SGS");
}

export async function fetchBcbSgsIndicator(
  key: EconomicIndicatorKey,
  fetchFn: FetchLike = fetch,
  timeoutMs = BCB_SGS_TIMEOUT_MS,
) {
  const definition = BCB_SGS_INDICATORS[key];
  const rows = await requestRows(
    buildLatestUrl(definition.seriesCode),
    fetchFn,
    timeoutMs,
  );

  const row = rows.at(-1);
  if (!row) throw new Error("Resposta inválida recebida do BCB SGS");

  return {
    key,
    seriesCode: definition.seriesCode,
    valueMicros: parseValueMicros(row.valor),
    unit: definition.unit,
    period: definition.period,
    referenceDate: parseReferenceDate(row.data),
    source: "BCB_SGS" as const,
  };
}

export async function fetchIpcaMonthlyRange(
  start: { year: number; month: number },
  end: { year: number; month: number },
  fetchFn: FetchLike = fetch,
  timeoutMs = BCB_SGS_TIMEOUT_MS,
) {
  const startKey = start.year * 12 + start.month;
  const endKey = end.year * 12 + end.month;
  if (startKey > endKey) {
    throw new Error("Período inválido para consulta do IPCA");
  }

  const rows = await requestRows(
    buildRangeUrl(IPCA_MONTHLY_SERIES.seriesCode, start, end),
    fetchFn,
    timeoutMs,
  );

  return rows.map((row) => ({
    key: IPCA_MONTHLY_SERIES.key,
    seriesCode: IPCA_MONTHLY_SERIES.seriesCode,
    valueMicros: parseValueMicros(row.valor),
    unit: IPCA_MONTHLY_SERIES.unit,
    period: IPCA_MONTHLY_SERIES.period,
    referenceDate: parseReferenceDate(row.data),
    source: "BCB_SGS" as const,
  }));
}
