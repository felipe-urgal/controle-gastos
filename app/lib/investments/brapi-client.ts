import { z } from "zod";

const BRAPI_QUOTE_URL = "https://brapi.dev/api/v2/stocks/quote";
const BRAPI_TIMEOUT_MS = 5_000;

const brapiResponseSchema = z.object({
  results: z
    .array(
      z.object({
        requestedSymbol: z.string().min(1),
        symbol: z.string().min(1),
        data: z.object({
          currency: z.string().length(3),
          regularMarketPrice: z.number().positive(),
          regularMarketTime: z.string().datetime().nullable().optional(),
        }),
      }),
    )
    .min(1),
  requestedAt: z.string().datetime(),
});

type FetchLike = typeof fetch;

function priceToCents(value: number) {
  const cents = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 2_147_483_647) {
    throw new Error("Cotação da brapi excede o limite monetário suportado");
  }
  return cents;
}

function quoteError(status: number, hasToken: boolean) {
  if (status === 401 || status === 403) {
    return new Error(
      hasToken
        ? "BRAPI_TOKEN inválido ou sem acesso ao ativo solicitado"
        : "Configure BRAPI_TOKEN para consultar este ativo na brapi",
    );
  }
  if (status === 404) return new Error("Ativo não encontrado na brapi");
  if (status === 429) return new Error("Limite de requisições da brapi atingido");
  return new Error("brapi respondeu HTTP " + status);
}

export async function fetchBrapiQuote(
  symbol: string,
  fetchFn: FetchLike = fetch,
  token = process.env.BRAPI_TOKEN,
  timeoutMs = BRAPI_TIMEOUT_MS,
) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) throw new Error("Símbolo do ativo é obrigatório");

  const url = new URL(BRAPI_QUOTE_URL);
  url.searchParams.set("symbols", normalizedSymbol);

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { accept: "application/json" };
      if (token) headers.authorization = "Bearer " + token;

      const response = await fetchFn(url, {
        method: "GET",
        headers,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const error = quoteError(response.status, Boolean(token));
        if (response.status === 429 || response.status < 500) throw error;
        lastError = error;
        continue;
      }

      const payload = brapiResponseSchema.safeParse(await response.json());
      if (!payload.success) {
        throw new Error("Resposta inválida recebida da brapi");
      }

      const result =
        payload.data.results.find(
          (item) => item.requestedSymbol.toUpperCase() === normalizedSymbol,
        ) ?? payload.data.results[0];

      const referenceAt = new Date(
        result.data.regularMarketTime ?? payload.data.requestedAt,
      );
      if (Number.isNaN(referenceAt.getTime())) {
        throw new Error("Resposta inválida recebida da brapi");
      }

      return {
        requestedSymbol: normalizedSymbol,
        symbol: result.symbol.toUpperCase(),
        priceCents: priceToCents(result.data.regularMarketPrice),
        currency: result.data.currency.toUpperCase(),
        referenceAt,
      };
    } catch (error) {
      lastError = error;
      const nonRetryable =
        error instanceof Error &&
        (error.message.startsWith("Resposta inválida") ||
          error.message.startsWith("Configure BRAPI_TOKEN") ||
          error.message.startsWith("BRAPI_TOKEN") ||
          error.message.startsWith("Ativo não encontrado") ||
          error.message.startsWith("Limite de requisições"));
      if (nonRetryable) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error("Tempo limite excedido ao consultar a brapi");
  }
  if (lastError instanceof Error && lastError.message.startsWith("brapi respondeu")) {
    throw lastError;
  }
  throw new Error("Não foi possível consultar a brapi");
}
