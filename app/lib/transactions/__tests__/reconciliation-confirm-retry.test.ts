import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { HttpError } from "@/app/lib/http-error";
import { confirmAccountReconciliationForUser } from "@/app/lib/transactions/reconciliation-confirm";

const input = { year: 2026, month: 9, day: 9, statementBalance: 7_500 };

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError("serialization conflict", {
    code: "P2034",
    clientVersion: "7.10.0",
  });
}

describe("reconciliation confirmation serializable retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries transient P2034 conflicts before succeeding", async () => {
    const expected = { reconciledCount: 1, difference: 0 };
    mocks.transaction
      .mockRejectedValueOnce(serializationConflict())
      .mockRejectedValueOnce(serializationConflict())
      .mockResolvedValueOnce(expected);

    await expect(
      confirmAccountReconciliationForUser("user-1", "account-1", input),
    ).resolves.toBe(expected);

    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });

  it("returns HTTP 409 after the retry budget is exhausted", async () => {
    mocks.transaction.mockRejectedValue(serializationConflict());

    await expect(
      confirmAccountReconciliationForUser("user-1", "account-1", input),
    ).rejects.toMatchObject({
      status: 409,
      message: "O estado da reconciliação mudou; recarregue e tente novamente",
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });

  it("does not retry domain conflicts", async () => {
    const conflict = new HttpError("A diferença não é zero", 409);
    mocks.transaction.mockRejectedValueOnce(conflict);

    await expect(
      confirmAccountReconciliationForUser("user-1", "account-1", input),
    ).rejects.toBe(conflict);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
