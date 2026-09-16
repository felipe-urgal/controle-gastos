import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    authRateLimit: {
      deleteMany: mocks.deleteMany,
    },
  },
}));

import { consumeRateLimit } from "@/app/lib/security/rate-limit";

const rule = {
  action: "adapter-conflict-test",
  identifier: "user-123",
  maxAttempts: 5,
  windowMs: 60_000,
  blockMs: 60_000,
};

function driverAdapterConflict(originalCode: "40001" | "40P01") {
  return Object.assign(new Error("TransactionWriteConflict"), {
    name: "DriverAdapterError",
    cause: {
      kind:
        originalCode === "40001" ? "TransactionWriteConflict" : "postgres",
      originalCode,
      originalMessage:
        originalCode === "40001"
          ? "could not serialize access due to read/write dependencies among transactions"
          : "deadlock detected",
    },
  });
}

describe("rate limiter transaction retries", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    mocks.transaction.mockReset();
    mocks.deleteMany.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["40001", "40P01"] as const)(
    "retries adapter-level PostgreSQL conflict %s",
    async (originalCode) => {
      mocks.transaction
        .mockRejectedValueOnce(driverAdapterConflict(originalCode))
        .mockResolvedValueOnce({ limited: false, retryAfterSeconds: 0 });

      await expect(consumeRateLimit(rule)).resolves.toEqual({
        limited: false,
        retryAfterSeconds: 0,
      });
      expect(mocks.transaction).toHaveBeenCalledTimes(2);
    },
  );

  it("does not retry unrelated adapter failures", async () => {
    const error = Object.assign(new Error("UniqueConstraintViolation"), {
      name: "DriverAdapterError",
      cause: {
        kind: "UniqueConstraintViolation",
        originalCode: "23505",
      },
    });
    mocks.transaction.mockRejectedValue(error);

    await expect(consumeRateLimit(rule)).rejects.toBe(error);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
