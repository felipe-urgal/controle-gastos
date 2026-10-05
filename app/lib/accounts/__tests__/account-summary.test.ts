import { describe, expect, it } from "vitest";

import { buildAccountPortfolioSummary } from "@/app/lib/accounts/account-summary";

describe("account portfolio summary", () => {
  it("keeps currencies separated and excludes credit-card debt from portfolio totals", () => {
    const summary = buildAccountPortfolioSummary([
      {
        type: "CREDIT_DEBIT",
        currency: "BRL",
        isActive: true,
        balance: 100_000,
      },
      {
        type: "CREDIT_CARD",
        currency: "BRL",
        isActive: true,
        balance: -25_000,
      },
      {
        type: "INVESTMENT",
        currency: "BRL",
        isActive: true,
        balance: 5_000,
        investmentValueCents: 40_000,
      },
      {
        type: "CREDIT_DEBIT",
        currency: "USD",
        isActive: false,
        balance: -1_000,
      },
    ]);

    expect(summary.balancesByCurrency).toEqual([
      { currency: "BRL", value: 140_000 },
      { currency: "USD", value: -1_000 },
    ]);
    expect(summary.bankBalancesByCurrency).toEqual([
      { currency: "BRL", value: 100_000 },
      { currency: "USD", value: -1_000 },
    ]);
    expect(summary.investmentBalancesByCurrency).toEqual([
      { currency: "BRL", value: 40_000 },
    ]);
    expect(summary.activeCount).toBe(3);
    expect(summary.negativeCount).toBe(1);
    expect(summary.totalCount).toBe(4);
    expect(summary.typeCounts).toEqual({
      CREDIT_DEBIT: 2,
      INVESTMENT: 1,
      CREDIT_CARD: 1,
    });
  });
});
