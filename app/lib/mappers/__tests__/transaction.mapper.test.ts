import { describe, expect, it } from "vitest";

import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";

describe("toTransactionDTO", () => {
  it("exposes transfer identity without changing the financial type", () => {
    const createdAt = new Date("2026-09-09T12:00:00.000Z");
    const updatedAt = new Date("2026-09-09T12:01:00.000Z");

    const dto = toTransactionDTO({
      id: "transaction-1",
      amount: 12_345,
      type: "EXPENSE",
      kind: "TRANSFER",
      description: "Transferência interna",
      status: "COMPLETED",
      reconciliationStatus: "UNCLEARED",
      reconciledAt: null,
      year: 2026,
      month: 9,
      day: 9,
      accountId: "account-1",
      userId: "user-1",
      categoryId: null,
      transferId: "transfer-1",
      transferRole: "SOURCE",
      seriesId: null,
      seriesIndex: null,
      importSource: null,
      importFingerprint: null,
      importExternalId: null,
      createdAt,
      updatedAt,
    });

    expect(dto).toMatchObject({
      id: "transaction-1",
      type: "EXPENSE",
      kind: "TRANSFER",
      transferId: "transfer-1",
      transferRole: "SOURCE",
    });
  });
});
