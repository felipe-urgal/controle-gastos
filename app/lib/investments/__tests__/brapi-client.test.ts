import { describe, expect, it, vi } from "vitest";

import { fetchBrapiQuote } from "@/app/lib/investments/brapi-client";

function quoteResponse(
  data: {
    symbol?: string;
    currency?: string;
    price?: number;
    referenceAt?: string | null;
  } = {},
  status = 200,
) {
  return new Response(
    JSON.stringify({
      results: [
        {
          requestedSymbol: data.symbol ?? "PETR4",
          symbol: data.symbol ?? "PETR4",
          changed: false,
          data: {
            currency: data.currency ?? "BRL",
            regularMarketPrice: data.price ?? 38.5,
            regularMarketTime:
              data.referenceAt === undefined
                ? "2026-10-02T13:00:00.000Z"
                : data.referenceAt,
          },
        },
      ],
      requestedAt: "2026-10-02T13:01:00.000Z",
      took: 10,
    }),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

describe("brapi quote client", () => {
  it("converte preço para centavos e preserva timestamp da cotação", async () => {
    const fetchMock = vi.fn(async () => quoteResponse()) as unknown as typeof fetch;

    await expect(
      fetchBrapiQuote("petr4", fetchMock, "secret"),
    ).resolves.toEqual({
      requestedSymbol: "PETR4",
      symbol: "PETR4",
      priceCents: 3_850,
      currency: "BRL",
      referenceAt: new Date("2026-10-02T13:00:00.000Z"),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: "Bearer secret",
    });
  });

  it("usa requestedAt quando a cotação não possui horário próprio", async () => {
    const fetchMock = vi.fn(async () =>
      quoteResponse({ referenceAt: null }),
    ) as unknown as typeof fetch;

    const quote = await fetchBrapiQuote("PETR4", fetchMock);
    expect(quote.referenceAt).toEqual(new Date("2026-10-02T13:01:00.000Z"));
  });

  it("não repete rate limit", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 429 })) as unknown as typeof fetch;

    await expect(fetchBrapiQuote("PETR4", fetchMock)).rejects.toThrow(
      "Limite de requisições",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("repete uma única vez falha transitória", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(quoteResponse()) as unknown as typeof fetch;

    await fetchBrapiQuote("PETR4", fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("trata payload inválido sem retry", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    await expect(fetchBrapiQuote("PETR4", fetchMock)).rejects.toThrow(
      "Resposta inválida",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aplica timeout explícito", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;

    await expect(
      fetchBrapiQuote("PETR4", fetchMock, undefined, 5),
    ).rejects.toThrow("Tempo limite excedido");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
