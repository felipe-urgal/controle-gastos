import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  consumeImportRateLimit: vi.fn(),
  consumeTransactionMutationRateLimit: vi.fn(),
  account: {
    findFirst: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
  },
  transactionDb: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeImportRateLimit: mocks.consumeImportRateLimit,
  consumeTransactionMutationRateLimit:
    mocks.consumeTransactionMutationRateLimit,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    account: mocks.account,
    transaction: mocks.transaction,
    $transaction: mocks.transactionDb,
  },
}));

import { transactionCrud } from "@/app/lib/transactions/transaction-crud";
import {
  confirmTransactionImport,
  previewTransactionImport,
} from "@/app/lib/transactions/import/transaction-import";

describe("transaction rate limit guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-1");
    mocks.consumeImportRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
    mocks.consumeTransactionMutationRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
  });

  it("blocks normal transaction creation before starting its write transaction", async () => {
    mocks.consumeTransactionMutationRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 60,
    });

    const response = await transactionCrud.create(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: 1000,
          description: "Compra",
          status: "PENDING",
          year: 2026,
          month: 9,
          day: 18,
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          categoryId: "550e8400-e29b-41d4-a716-446655440001",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(body.error.code).toBe("TRANSACTION_RATE_LIMITED");
    expect(mocks.transactionDb).not.toHaveBeenCalled();
  });

  it("blocks import preview before reading the file or querying financial data", async () => {
    mocks.consumeImportRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 900,
    });

    const formData = new FormData();
    formData.append("accountId", "550e8400-e29b-41d4-a716-446655440000");
    formData.append(
      "file",
      new File(["data,descricao,valor\n2026-09-18,Café,-10.00"], "extrato.csv", {
        type: "text/csv",
      }),
    );

    const response = await previewTransactionImport(
      new Request("http://localhost/api/transactions/import/preview", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(body.error.code).toBe("IMPORT_RATE_LIMITED");
    expect(mocks.account.findFirst).not.toHaveBeenCalled();
    expect(mocks.transaction.findMany).not.toHaveBeenCalled();
  });

  it("blocks import confirmation before parsing or starting its write transaction", async () => {
    mocks.consumeImportRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 900,
    });

    const response = await confirmTransactionImport(
      new Request("http://localhost/api/transactions/import/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(body.error.code).toBe("IMPORT_RATE_LIMITED");
    expect(mocks.transactionDb).not.toHaveBeenCalled();
  });
});
