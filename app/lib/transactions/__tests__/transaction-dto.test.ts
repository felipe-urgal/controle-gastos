import { describe, expect, it } from "vitest";

import { toTransactionDTO } from "@/app/lib/transactions/transaction-dto";

describe("toTransactionDTO", () => {
  it("exposes transfer identity and counterpart without changing the financial type", () => {
    const createdAt = new Date("2026-09-09T12:00:00.000Z");
    const updatedAt = new Date("2026-09-09T12:01:00.000Z");
    const sourceAccount = {
      id: "account-1",
      name: "Conta principal",
      currency: "BRL",
      type: "CREDIT_DEBIT",
      color: "#111111",
      icon: "wallet",
    };
    const destinationAccount = {
      id: "account-2",
      name: "Reserva",
      currency: "BRL",
      type: "INVESTMENT",
      color: "#222222",
      icon: "piggy-bank",
    };

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
      account: sourceAccount,
      category: null,
      transfer: {
        transactions: [
          { id: "transaction-1", userId: "user-1", transferRole: "SOURCE", account: sourceAccount },
          { id: "transaction-2", userId: "user-1", transferRole: "DESTINATION", account: destinationAccount },
        ],
      },
    });

    expect(dto).toMatchObject({
      id: "transaction-1",
      type: "EXPENSE",
      kind: "TRANSFER",
      transferId: "transfer-1",
      transferRole: "SOURCE",
      counterpartAccount: destinationAccount,
    });
  });

  it("does not expose a counterpart from another user in an inconsistent transfer", () => {
    const createdAt = new Date("2026-09-09T12:00:00.000Z");

    const dto = toTransactionDTO({
      id: "transaction-1",
      amount: 12_345,
      type: "EXPENSE",
      kind: "TRANSFER",
      description: "Transferência inconsistente",
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
      updatedAt: createdAt,
      transfer: {
        transactions: [
          {
            id: "transaction-2",
            userId: "user-2",
            transferRole: "DESTINATION",
            account: {
              id: "account-secret",
              name: "Conta externa",
              currency: "BRL",
              type: "CREDIT_DEBIT",
              color: null,
              icon: null,
            },
          },
        ],
      },
    });

    expect(dto.counterpartAccount).toBeNull();
  });

  it("does not invent a counterpart for a normal transaction", () => {
    const createdAt = new Date("2026-09-09T12:00:00.000Z");

    const dto = toTransactionDTO({
      id: "transaction-normal",
      amount: 1_000,
      type: "EXPENSE",
      kind: "NORMAL",
      description: "Mercado",
      status: "COMPLETED",
      reconciliationStatus: "UNCLEARED",
      reconciledAt: null,
      year: 2026,
      month: 9,
      day: 9,
      accountId: "account-1",
      userId: "user-1",
      categoryId: "category-1",
      transferId: null,
      transferRole: null,
      seriesId: null,
      seriesIndex: null,
      importSource: null,
      importFingerprint: null,
      importExternalId: null,
      createdAt,
      updatedAt: createdAt,
    });

    expect(dto.counterpartAccount).toBeNull();
  });
});
