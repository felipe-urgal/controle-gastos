import { describe, expect, it } from "vitest";

import {
  buildMonthlyPeriods,
  buildNetWorthHistory,
} from "@/app/lib/net-worth/net-worth-domain";

describe("net worth domain", () => {
  it("builds monthly periods across year boundaries", () => {
    expect(buildMonthlyPeriods({ year: 2028, month: 2 }, 4)).toEqual([
      { year: 2027, month: 11 },
      { year: 2027, month: 12 },
      { year: 2028, month: 1 },
      { year: 2028, month: 2 },
    ]);
  });

  it("keeps currencies independent while carrying balances forward", () => {
    const history = buildNetWorthHistory({
      accounts: [
        {
          id: "brl",
          name: "BRL",
          type: "CREDIT_DEBIT",
          currency: "BRL",
          isActive: true,
          color: null,
          icon: null,
          valuationBasis: "TRANSACTION_BALANCE",
        },
        {
          id: "usd",
          name: "USD",
          type: "INVESTMENT",
          currency: "USD",
          isActive: true,
          color: null,
          icon: null,
          valuationBasis: "TRANSACTION_BALANCE",
        },
      ],
      openingRows: [
        { accountId: "brl", type: "INCOME", _sum: { amount: 10_000 } },
      ],
      rows: [
        {
          accountId: "usd",
          year: 2028,
          month: 1,
          type: "INCOME",
          _sum: { amount: 5_000 },
        },
      ],
      periods: [
        { year: 2028, month: 1 },
        { year: 2028, month: 2 },
      ],
    });

    expect(history).toEqual([
      { year: 2028, month: 1, totals: { BRL: 10_000, USD: 5_000 } },
      { year: 2028, month: 2, totals: { BRL: 10_000, USD: 5_000 } },
    ]);
  });
});
