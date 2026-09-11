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

import { undoAccountReconciliationForUser } from "@/app/lib/transactions/reconciliation-undo";

function prismaConflict(code: "P2034" | "P2002") {
  return new Prisma.PrismaClientKnownRequestError("conflict", {
    code,
    clientVersion: "7.10.0",
  });
}

describe("reconciliation undo serializable retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries transient P2034 conflicts before succeeding", async () => {
    const expected = {
      restoredCount: 2,
      idempotent: false,
    };

    mocks.transaction
      .mockRejectedValueOnce(prismaConflict("P2034"))
      .mockRejectedValueOnce(prismaConflict("P2034"))
      .mockResolvedValueOnce(expected);

    await expect(
      undoAccountReconciliationForUser("user-1", "account-1", {
        reconciledAt: "2026-09-11T12:00:00.000Z",
      })
    ).resolves.toBe(expected);

    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });

  it("returns the existing conflict contract after retry budget is exhausted", async () => {
    mocks.transaction.mockRejectedValue(prismaConflict("P2034"));

    await expect(
      undoAccountReconciliationForUser("user-1", "account-1", {
        reconciledAt: "2026-09-11T12:00:00.000Z",
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "O estado da reconciliação mudou; recarregue e tente novamente",
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });
});
