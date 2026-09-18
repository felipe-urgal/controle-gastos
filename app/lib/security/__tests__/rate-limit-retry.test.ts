import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  action: "retry-test",
  identifier: "user-1",
  maxAttempts: 5,
  windowMs: 60_000,
  blockMs: 60_000,
};

function driverAdapterConflict(originalCode: string, kind = "TransactionWriteConflict") {
  return Object.assign(new Error("TransactionWriteConflict"), {
    name: "DriverAdapterError",
    kind,
    originalCode,
    originalMessage:
      originalCode === "40P01"
        ? "deadlock detected"
        : "could not serialize access due to read/write dependencies among transactions",
  });
}

function prismaConflict(code: "P2034" | "P2002") {
  return new Prisma.PrismaClientKnownRequestError("conflict", {
    code,
    clientVersion: "7.10.0",
  });
}

describe("rate limiter transaction retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(1);
  });

  it.each(["40001", "40P01"])(
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

  it("recovers after four consecutive Prisma P2034 conflicts", async () => {
    mocks.transaction
      .mockRejectedValueOnce(prismaConflict("P2034"))
      .mockRejectedValueOnce(prismaConflict("P2034"))
      .mockRejectedValueOnce(prismaConflict("P2034"))
      .mockRejectedValueOnce(prismaConflict("P2034"))
      .mockResolvedValueOnce({ limited: false, retryAfterSeconds: 0 });

    await expect(consumeRateLimit(rule)).resolves.toEqual({
      limited: false,
      retryAfterSeconds: 0,
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(5);
  });

  it("keeps retrying Prisma P2034 conflicts", async () => {
    mocks.transaction
      .mockRejectedValueOnce(prismaConflict("P2034"))
      .mockResolvedValueOnce({ limited: false, retryAfterSeconds: 0 });

    await expect(consumeRateLimit(rule)).resolves.toEqual({
      limited: false,
      retryAfterSeconds: 0,
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry unrelated adapter errors", async () => {
    const error = driverAdapterConflict("23505", "postgres");
    mocks.transaction.mockRejectedValue(error);

    await expect(consumeRateLimit(rule)).rejects.toBe(error);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
