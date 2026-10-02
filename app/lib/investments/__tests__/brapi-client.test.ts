import { describe, expect, it, vi } from "vitest";

import { fetchBrapiQuote } from "@/app/lib/investments/brapi-client";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    results: [{
      symbol: "PETR4",
      currency: "BRL",
      regularMarketPrice: 36.65,
      regularMarketTime: "2026-10-02T13:00:00.000Z",
      ...overrides,
    }],
    requestedAt: "2026-10-02T13:00:02.000Z",
  };
}

describe("brapi client", () => {
  it("parses a valid quote into integer cents and keeps the token in the header", async () => {
    let requestUrl: RequestInfo | URL = "";
    let requestInit: RequestInit = {};
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requestUrl = input;
        requestInit = init;
        return new Response(JSON.stringify(payload()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );
    const quote = await fetchBrapiQuote("petr4", {
      fetchFn: fetchMock as typeof fetch,
      token: "secret-token",
    });

    expect(quote).toEqual({
      symbol: "PETR4",
      priceCents: 3_665,
      currency: "BRL",
      referenceAt: new Date("2026-10-02T13:00:00.000Z"),
      source: "BRAPI",
    });
    expect(String(requestUrl)).not.toContain("secret-token");
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      "Bearer secret-token",
    );
  });

  it("rejects invalid payloads without retrying", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payload({ regularMarketPrice: null })), { status: 200 }),
    );
    await expect(fetchBrapiQuote("PETR4", {
      fetchFn: fetchMock as typeof fetch,
      token: null,
    })).rejects.toThrow("Resposta inválida");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a missing asset", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 404 }));
    await expect(fetchBrapiQuote("INEXISTENTE", {
      fetchFn: fetchMock as typeof fetch,
      token: null,
    })).rejects.toThrow("HTTP 404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a rate limit once", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", {
        status: 429,
        headers: { "retry-after": "0" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload()), { status: 200 }));

    await expect(fetchBrapiQuote("PETR4", {
      fetchFn: fetchMock as typeof fetch,
      token: null,
    })).resolves.toMatchObject({ priceCents: 3_665 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts on timeout", async () => {
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    await expect(fetchBrapiQuote("PETR4", {
      fetchFn: fetchMock as typeof fetch,
      token: null,
      timeoutMs: 5,
      maxAttempts: 1,
    })).rejects.toThrow("Tempo limite");
  });
});
