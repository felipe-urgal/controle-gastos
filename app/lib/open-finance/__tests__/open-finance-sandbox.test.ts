import { describe, expect, it, vi } from "vitest";

import {
  OpenFinanceSandboxClient,
  OpenFinanceSandboxError,
  toSandboxImportPreview,
} from "@/app/lib/open-finance/open-finance-sandbox";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function client(fetchFn: typeof fetch) {
  return new OpenFinanceSandboxClient({
    baseUrl: "https://mock-bank.sandbox.example/",
    accessToken: "sandbox-token",
    consentId: "consent-123",
    runtimeEnv: "test",
    fetchFn,
  });
}

describe("OpenFinanceSandboxClient", () => {
  it("is blocked in production and rejects non-sandbox hosts", () => {
    expect(
      () =>
        new OpenFinanceSandboxClient({
          baseUrl: "https://mock-bank.sandbox.example/",
          accessToken: "token",
          consentId: "consent",
          runtimeEnv: "production",
        }),
    ).toThrow(
      expect.objectContaining({ code: "PRODUCTION_BLOCKED" }),
    );

    expect(
      () =>
        new OpenFinanceSandboxClient({
          baseUrl: "https://api.real-bank.example/",
          accessToken: "token",
          consentId: "consent",
          runtimeEnv: "test",
        }),
    ).toThrow(expect.objectContaining({ code: "UNSAFE_BASE_URL" }));
  });

  it("maps sandbox accounts into neutral external accounts", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        data: [
          {
            accountId: "acc-1",
            type: "CONTA_DEPOSITO_A_VISTA",
            subtype: "INDIVIDUAL",
            currency: "BRL",
            name: "Conta Mock",
          },
        ],
        meta: { totalRecords: 1, totalPages: 1 },
      }),
    ) as unknown as typeof fetch;

    const result = await client(fetchFn).listAccounts();

    expect(result).toEqual([
      {
        externalId: "acc-1",
        name: "Conta Mock",
        currency: "BRL",
        type: "CONTA_DEPOSITO_A_VISTA",
        subtype: "INDIVIDUAL",
      },
    ]);
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetchFn).mock.calls[0];
    expect(String(url)).toContain("/open-banking/accounts/v2/accounts");
    expect(String(url)).not.toContain("sandbox-token");
    expect((init?.headers as Record<string, string>).authorization).toBe(
      "Bearer sandbox-token",
    );
  });

  it("maps transactions, pagination and booking filters", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        data: [
          {
            transactionId: "tx-1",
            transactionName: "Mercado",
            creditDebitType: "DEBITO",
            transactionAmount: { amount: "123.45", currency: "BRL" },
            transactionDateTime: "2026-09-15T10:00:00Z",
            status: "BOOKED",
          },
          {
            transactionId: "tx-2",
            transactionName: "Salário",
            creditDebitType: "CREDITO",
            transactionAmount: { amount: "5000.00", currency: "BRL" },
            transactionDate: "2026-09-16",
            status: "PENDING",
          },
        ],
        meta: { totalRecords: 4, totalPages: 2 },
      }),
    ) as unknown as typeof fetch;

    const result = await client(fetchFn).listTransactions("acc/1", {
      page: 1,
      pageSize: 2,
      fromDate: "2026-09-01",
      toDate: "2026-09-30",
    });

    expect(result.nextPage).toBe(2);
    expect(result.totalRecords).toBe(4);
    expect(result.items).toEqual([
      expect.objectContaining({
        externalId: "tx-1",
        accountExternalId: "acc/1",
        date: "2026-09-15",
        amountCents: 12345,
        type: "EXPENSE",
        status: "BOOKED",
      }),
      expect.objectContaining({
        externalId: "tx-2",
        amountCents: 500000,
        type: "INCOME",
        status: "PENDING",
      }),
    ]);

    const [url] = vi.mocked(fetchFn).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toContain("acc%2F1/transactions");
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.get("page-size")).toBe("2");
    expect(parsed.searchParams.get("fromBookingDateTime")).toBe("2026-09-01");
  });

  it("marks pending and duplicate transactions in preview without persistence", () => {
    const preview = toSandboxImportPreview([
      {
        externalId: "tx-1",
        accountExternalId: "acc-1",
        date: "2026-09-15",
        amountCents: 1000,
        type: "EXPENSE",
        description: "Compra",
        currency: "BRL",
        status: "PENDING",
      },
      {
        externalId: "tx-1",
        accountExternalId: "acc-1",
        date: "2026-09-15",
        amountCents: 1000,
        type: "EXPENSE",
        description: "Compra duplicada",
        currency: "BRL",
        status: "BOOKED",
      },
    ]);

    expect(preview[0].errors).toContain(
      "Transação pendente; revisar antes de qualquer importação.",
    );
    expect(preview[1].errors).toContain(
      "Identificador externo repetido no payload do sandbox.",
    );
  });

  it("normalizes expired consent, invalid payload and timeout errors", async () => {
    const expired = client(
      vi.fn(async () => jsonResponse({}, 401)) as unknown as typeof fetch,
    );
    await expect(expired.listAccounts()).rejects.toMatchObject({
      code: "CONSENT_EXPIRED",
    });

    const invalid = client(
      vi.fn(async () => jsonResponse({ data: [{ accountId: "" }] })) as unknown as typeof fetch,
    );
    await expect(invalid.listAccounts()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });

    const timeout = client(
      vi.fn(async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }) as unknown as typeof fetch,
    );
    await expect(timeout.listAccounts()).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("enforces the page-size boundary before making a request", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await expect(
      client(fetchFn).listTransactions("acc-1", { pageSize: 101 }),
    ).rejects.toThrow("pageSize");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("uses a stable normalized error class", () => {
    const error = new OpenFinanceSandboxError("x", "NETWORK_ERROR");
    expect(error.name).toBe("OpenFinanceSandboxError");
    expect(error.code).toBe("NETWORK_ERROR");
  });
});
