import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  transaction: {
    updateMany: vi.fn(),
  },
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    transaction: mocks.transaction,
    $transaction: vi.fn(),
  },
}));

import { completePendingTransaction } from "@/app/lib/crud/transaction.crud";

describe("completePendingTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-1");
  });

  it("changes only the status of a pending normal transaction owned by the user", async () => {
    mocks.transaction.updateMany.mockResolvedValue({ count: 1 });

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
    mocks.transaction.updateMany.mockResolvedValue({ count: 0 });

    const response = await completePendingTransaction(
      new Request("http://localhost/api/transactions/other-transaction/complete", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "other-transaction" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe("Transação pendente não encontrada");
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
