import { describe, expect, it } from "vitest";

import { calculateReconciliationPreview } from "@/app/lib/transactions/reconciliation-preview";

describe("calculateReconciliationPreview", () => {
  it("keeps exact cents while separating realized and cleared balances", () => {
    const preview = calculateReconciliationPreview(
      [
        {
          id: "reconciled-income",
          amount: 10_000,
          type: "INCOME",
          kind: "NORMAL",
          description: "Saldo já fechado",
          reconciliationStatus: "RECONCILED",
          year: 2026,
          month: 8,
          day: 31,
        },
        {
          id: "cleared-expense",
          amount: 2_500,
          type: "EXPENSE",
          kind: "NORMAL",
          description: "Compra conferida",
          reconciliationStatus: "CLEARED",
          year: 2026,
          month: 9,
          day: 8,
        },
        {
          id: "uncleared-expense",
          amount: 1_000,
          type: "EXPENSE",
          kind: "TRANSFER",
          description: "Transferência ainda não conferida",
          reconciliationStatus: "UNCLEARED",
          year: 2026,
          month: 9,
          day: 9,
        },
      ],
      7_500,
    );

    expect(preview).toMatchObject({
      statementBalance: 7_500,
      realizedBalance: 6_500,
      clearedBalance: 7_500,
      difference: 0,
    });
    expect(preview.unclearedItems.map((item) => item.id)).toEqual([
      "uncleared-expense",
    ]);
  });

  it("reports the exact difference without rounding", () => {
    const preview = calculateReconciliationPreview(
      [
        {
          id: "cleared-income",
          amount: 12_345,
          type: "INCOME",
          kind: "NORMAL",
          description: "Crédito conferido",
          reconciliationStatus: "CLEARED",
          year: 2026,
          month: 9,
          day: 9,
        },
      ],
      12_344,
    );

    expect(preview.difference).toBe(-1);
  });
});
