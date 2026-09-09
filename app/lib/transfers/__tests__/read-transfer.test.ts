import { describe, expect, it } from "vitest";

import { toTransferReadDTO } from "@/app/lib/transfers/read-transfer";

describe("toTransferReadDTO", () => {
  it("exposes each transfer leg with its counterparty account", () => {
    const createdAt = new Date("2026-09-09T12:00:00.000Z");
    const updatedAt = new Date("2026-09-09T12:01:00.000Z");
    const accountBase = {
      currency: "BRL",
      type: "CREDIT_DEBIT" as const,
      color: null,
      icon: null,
    };

    const transfer = {
      id: "transfer-1",
      userId: "user-1",
      idempotencyKeyHash: "hash",
      requestHash: "request-hash",
      deletedAt: null,
      createdAt,
      updatedAt,
      transactions: [
        {
          id: "source-transaction",
          amount: 5_000,
          year: 2026,
          month: 9,
          day: 9,
          type: "EXPENSE" as const,
          kind: "TRANSFER" as const,
          description: "Reserva mensal",
          status: "COMPLETED" as const,
          reconciliationStatus: "CLEARED" as const,
          reconciledAt: null,
          accountId: "source-account",
          userId: "user-1",
          categoryId: null,
          transferId: "transfer-1",
          transferRole: "SOURCE" as const,
          seriesId: null,
          seriesIndex: null,
          importSource: null,
          importFingerprint: null,
          importExternalId: null,
          createdAt,
          updatedAt,
          account: { id: "source-account", name: "Carteira", ...accountBase },
        },
        {
          id: "destination-transaction",
          amount: 5_000,
          year: 2026,
          month: 9,
          day: 9,
          type: "INCOME" as const,
          kind: "TRANSFER" as const,
          description: "Reserva mensal",
          status: "COMPLETED" as const,
          reconciliationStatus: "UNCLEARED" as const,
          reconciledAt: null,
          accountId: "destination-account",
          userId: "user-1",
          categoryId: null,
          transferId: "transfer-1",
          transferRole: "DESTINATION" as const,
          seriesId: null,
          seriesIndex: null,
          importSource: null,
          importFingerprint: null,
          importExternalId: null,
          createdAt,
          updatedAt,
          account: { id: "destination-account", name: "Banco", ...accountBase },
        },
      ],
    } as unknown as Parameters<typeof toTransferReadDTO>[0];

    const dto = toTransferReadDTO(transfer);

    expect(dto).toMatchObject({
      id: "transfer-1",
      amountCents: 5_000,
      currency: "BRL",
      source: {
        transactionId: "source-transaction",
        account: { id: "source-account", name: "Carteira" },
        counterpartAccount: { id: "destination-account", name: "Banco" },
      },
      destination: {
        transactionId: "destination-transaction",
        account: { id: "destination-account", name: "Banco" },
        counterpartAccount: { id: "source-account", name: "Carteira" },
      },
    });
  });
});
