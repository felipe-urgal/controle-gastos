import { z } from "zod";

const BRAPI_BASE_URL = "https://brapi.dev/api/quote";
const BRAPI_TIMEOUT_MS = 5_000;
const BRAPI_MAX_ATTEMPTS = 2;
const BRAPI_MAX_RETRY_DELAY_MS = 1_000;

const brapiResponseSchema = z.object({
  results: z.array(
    z.object({
      symbol: z.string().min(1),
      currency: z.string().length(3),
      regularMarketPrice: z.number().positive(),
      regularMarketTime: z.string().min(10),
    }),
  ),
  requestedAt: z.string().min(10),
});

type FetchLike = typeof fetch;

export type BrapiQuote = {
  symbol: string;
  priceCents: number;
  currency: string;
  referenceAt: Date;
  source: "BRAPI";
};

export type BrapiClientOptions = {
  fetchFn?: FetchLike;
  token?: string | null;
  timeoutMs?: number;
  maxAttempts?: number;
};

class BrapiClientError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "BrapiClientError";
  }
}

function normalizedSymbol(symbol: string) {
  const value = symbol.trim().toUpperCase();
  if (!value || value.length > 24) {
    throw new BrapiClientError("Código de ativo inválido para consulta na brapi", false);
  }
  return value;
}

function parseDate(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BrapiClientError(label, false);
  }
  return parsed;
}

function priceToCents(value: number) {
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new BrapiClientError("Preço inválido recebido da brapi", false);
  }
  return cents;
}

function retryDelayMs(response: Response) {
  const raw = response.headers.get("retry-after");
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, BRAPI_MAX_RETRY_DELAY_MS);
  }
  const retryAt = Date.parse(raw);
  if (Number.isNaN(retryAt)) return 0;
  return Math.min(Math.max(0, retryAt - Date.now()), BRAPI_MAX_RETRY_DELAY_MS);
}

async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchBrapiQuote(
  symbol: string,
  options: BrapiClientOptions = {},
): Promise<BrapiQuote> {
  const ticker = normalizedSymbol(symbol);
  const fetchFn = options.fetchFn ?? fetch;
  const token = options.token === undefined ? process.env.BRAPI_TOKEN?.trim() || null : options.token;
  const timeoutMs = options.timeoutMs ?? BRAPI_TIMEOUT_MS;
  const maxAttempts = Math.max(1, options.maxAttempts ?? BRAPI_MAX_ATTEMPTS);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { accept: "application/json" };
      if (token) headers.authorization = "Bearer " + token;

      const response = await fetchFn(BRAPI_BASE_URL + "/" + encodeURIComponent(ticker), {
        method: "GET",
        headers,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const error = new BrapiClientError(
          "brapi respondeu HTTP " + response.status,
          retryable,
        );
        if (!retryable) throw error;
        lastError = error;
        if (attempt < maxAttempts - 1) {
          await sleep(retryDelayMs(response));
          continue;
        }
        break;
      }

      const parsed = brapiResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new BrapiClientError("Resposta inválida recebida da brapi", false);
      }

      const quote =
        parsed.data.results.find(
          (item) => item.symbol.trim().toUpperCase() === ticker,
        ) ?? parsed.data.results[0];
      if (!quote) {
        throw new BrapiClientError("Ativo não encontrado na brapi", false);
      }

      return {
        symbol: quote.symbol.trim().toUpperCase(),
        priceCents: priceToCents(quote.regularMarketPrice),
        currency: quote.currency.trim().toUpperCase(),
        referenceAt: parseDate(
          quote.regularMarketTime || parsed.data.requestedAt,
          "Data de cotação inválida recebida da brapi",
        ),
        source: "BRAPI",
      };
    } catch (error) {
      lastError = error;
      if (error instanceof BrapiClientError && !error.retryable) throw error;
      if (attempt < maxAttempts - 1) continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error("Tempo limite excedido ao consultar a brapi");
  }
  throw new Error("Não foi possível consultar a brapi");
}
