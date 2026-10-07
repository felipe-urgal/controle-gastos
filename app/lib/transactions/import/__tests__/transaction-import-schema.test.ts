import { describe, expect, it } from "vitest";

import { confirmTransactionImportSchema } from "@/app/lib/transactions/import/transaction-import-schema";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from "@/app/lib/transactions/transaction-field-contract";

function input(amountCents: number, description: string) {
  return {
    accountId: "11111111-1111-4111-8111-111111111111",
    previewToken: "token",
    items: [
      {
        index: 0,
        source: "CSV",
        date: "2026-10-07",
        amountCents,
        type: "EXPENSE",
        description,
        errors: [],
        fingerprint: "a".repeat(64),
        duplicate: false,
        selected: true,
        categoryId: "22222222-2222-4222-8222-222222222222",
        merchantId: null,
      },
    ],
  };
}

describe("transaction import field contract", () => {
  it("shares canonical transaction amount and description limits", () => {
    expect(
      confirmTransactionImportSchema.safeParse(
        input(
          TRANSACTION_MAX_AMOUNT_CENTS,
          "x".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH),
        ),
      ).success,
    ).toBe(true);

    expect(
      confirmTransactionImportSchema.safeParse(
        input(
          TRANSACTION_MAX_AMOUNT_CENTS + 1,
          "x".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH),
        ),
      ).success,
    ).toBe(false);

    expect(
      confirmTransactionImportSchema.safeParse(
        input(
          TRANSACTION_MAX_AMOUNT_CENTS,
          "x".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH + 1),
        ),
      ).success,
    ).toBe(false);
  });
});
