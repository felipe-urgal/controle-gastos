import { describe, expect, it } from "vitest";

import { groupInvestmentIncomesByAsset } from "@/app/lib/investments/investment-income-summary";

describe("groupInvestmentIncomesByAsset", () => {
  it("preserves each asset currency while summing incomes", () => {
    const result = groupInvestmentIncomesByAsset([
      {
        netAmountCents: 1_000,
        asset: {
          id: "brl-asset",
          symbol: "MXRF11",
          name: null,
          type: "FII",
          currency: "BRL",
          taxLocation: "BRAZIL",
        },
      },
      {
        netAmountCents: 500,
        asset: {
          id: "brl-asset",
          symbol: "MXRF11",
          name: null,
          type: "FII",
          currency: "BRL",
          taxLocation: "BRAZIL",
        },
      },
      {
        netAmountCents: 2_500,
        asset: {
          id: "usd-asset",
          symbol: "VOO",
          name: null,
          type: "ETF",
          currency: "USD",
          taxLocation: "ABROAD",
        },
      },
    ]);

    expect(result).toEqual([
      {
        assetId: "brl-asset",
        symbol: "MXRF11",
        currency: "BRL",
        amountCents: 1_500,
        count: 2,
      },
      {
        assetId: "usd-asset",
        symbol: "VOO",
        currency: "USD",
        amountCents: 2_500,
        count: 1,
      },
    ]);
  });

  it("rejects inconsistent currencies for the same asset id", () => {
    expect(() =>
      groupInvestmentIncomesByAsset([
        {
          netAmountCents: 1_000,
          asset: {
            id: "asset-1",
            symbol: "TEST",
            name: null,
            type: "ETF",
            currency: "BRL",
          },
        },
        {
          netAmountCents: 2_000,
          asset: {
            id: "asset-1",
            symbol: "TEST",
            name: null,
            type: "ETF",
            currency: "USD",
          },
        },
      ]),
    ).toThrow("moedas incompatíveis");
  });
});
