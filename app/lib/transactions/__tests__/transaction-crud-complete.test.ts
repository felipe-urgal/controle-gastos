import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  consumeTransactionMutationRateLimit: vi.fn(),
  transaction: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  creditCardPayment: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeTransactionMutationRateLimit:
    mocks.consumeTransactionMutationRateLimit,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    transaction: mocks.transaction,
    creditCardPayment: mocks.creditCardPayment,
    $transaction: mocks.$transaction,
  },
}));

import { completePendingTransaction } from "@/app/lib/transactions/transaction-crud";

describe("completePendingTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-1");
    mocks.consumeTransactionMutationRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
    mocks.transaction.findFirst.mockResolvedValue({
      id: "transaction-1",
      year: 2030,
      month: 6,
      day: 15,
      account: {
        id: "account-1",
        type: "CREDIT_DEBIT",
        statementClosingDay: null,
        statementDueDay: null,
      },
    });
    mocks.transaction.updateMany.mockResolvedValue({ count: 1 });
    mocks.creditCardPayment.findFirst.mockResolvedValue(null);
    mocks.$transaction.mockImplementation(async (callback) =>
      callback({
        transaction: mocks.transaction,
        creditCardPayment: mocks.creditCardPayment,
      }),
    );
  });

  it("changes only the status of a pending normal transaction owned by the user", async () => {
    const response = await completePendingTransaction(
      new Request("http://localhost/api/transactions/transaction-1/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "transaction-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.transaction.updateMany).toHaveBeenCalledWith({
      where: {
        id: "transaction-1",
        userId: "user-1",
        kind: "NORMAL",
        status: "PENDING",
      },
      data: {
        status: "COMPLETED",
      },
    });
    expect(body.data).toEqual({
      id: "transaction-1",
      status: "COMPLETED",
    });
  });

  it("returns 404 without revealing whether another user's transaction exists", async () => {
    mocks.transaction.findFirst.mockResolvedValue(null);

    const response = await completePendingTransaction(
      new Request("http://localhost/api/transactions/other-transaction/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "other-transaction" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe("Transação pendente não encontrada");
    expect(mocks.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("blocks completing a card purchase after its statement was paid", async () => {
    mocks.transaction.findFirst.mockResolvedValue({
      id: "transaction-1",
      year: 2030,
      month: 6,
      day: 15,
      account: {
        id: "card-1",
        type: "CREDIT_CARD",
        statementClosingDay: 20,
        statementDueDay: 27,
      },
    });
    mocks.creditCardPayment.findFirst.mockResolvedValue({
      closingYear: 2030,
      closingMonth: 6,
      closingDay: 20,
    });

    const response = await completePendingTransaction(
      new Request("http://localhost/api/transactions/transaction-1/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "transaction-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CREDIT_CARD_STATEMENT_PAID");
    expect(mocks.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("blocks completion before any financial write when the user exceeds the mutation limit", async () => {
    mocks.consumeTransactionMutationRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 45,
    });

    const response = await completePendingTransaction(
      new Request("http://localhost/api/transactions/transaction-1/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "transaction-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(body.error.code).toBe("TRANSACTION_RATE_LIMITED");
    expect(mocks.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated completion attempts", async () => {
    mocks.getAuthenticatedUserId.mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await completePendingTransaction(
      new Request("http://localhost/api/transactions/transaction-1/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "transaction-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mocks.transaction.updateMany).not.toHaveBeenCalled();
  });
});
