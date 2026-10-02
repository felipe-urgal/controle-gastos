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

export type EconomicIndicatorKey = keyof typeof BCB_SGS_INDICATORS;

const bcbSgsResponseSchema = z
  .array(
    z.object({
      data: z.string().min(10),
      valor: z.string().min(1),
    }),
  )
  .min(1);

type FetchLike = typeof fetch;

function buildUrl(seriesCode: number) {
  return new URL(
    BCB_SGS_BASE_URL + "." + seriesCode + "/dados/ultimos/1?formato=json",
  );
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

export async function fetchBcbSgsIndicator(
  key: EconomicIndicatorKey,
  fetchFn: FetchLike = fetch,
  timeoutMs = BCB_SGS_TIMEOUT_MS,
) {
  const definition = BCB_SGS_INDICATORS[key];
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(buildUrl(definition.seriesCode), {
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

      const row = payload.data[payload.data.length - 1];
      return {
        key,
        seriesCode: definition.seriesCode,
        valueMicros: parseValueMicros(row.valor),
        unit: definition.unit,
        period: definition.period,
        referenceDate: parseReferenceDate(row.data),
        source: "BCB_SGS" as const,
      };
    } catch (error) {
      lastError = error;
      const nonRetryable =
        error instanceof Error &&
        (error.message.startsWith("Resposta inválida") ||
          error.message.startsWith("Data inválida") ||
          error.message.startsWith("Valor inválido") ||
          error.message.startsWith("Valor do BCB") ||
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
