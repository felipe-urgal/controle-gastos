import { describe, expect, it } from "vitest";

import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { deriveRealizedInvestmentResults } from "@/app/lib/investments/investment-realized-result-domain";

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    type: "BUY" as const,
    quantityUnits: parseInvestmentQuantity("10")!,
    year: 2026,
    month: 1,
    day: 1,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    assetId: "asset-1",
    symbol: "TEST11",
    assetType: "FII",
    currency: "BRL",
    operation: {
      unitPriceCents: 1_000,
      feesCents: 0,
    },
    ...overrides,
  };
}

describe("investment realized result domain", () => {
  it("calculates realized gain on a partial sale using proportional fiscal cost", () => {
    const sales = deriveRealizedInvestmentResults({
      events: [
        event({ id: "buy-1" }),
        event({
          id: "buy-2",
          day: 2,
          quantityUnits: parseInvestmentQuantity("10")!,
          operation: { unitPriceCents: 2_000, feesCents: 100 },
        }),
        event({
          id: "sell-1",
          type: "SELL",
          day: 3,
          quantityUnits: parseInvestmentQuantity("5")!,
          operation: { unitPriceCents: 2_500, feesCents: 50 },
        }),
      ],
      adjustments: [],
    });

    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({
      grossProceedsCents: 12_500,
      feesCents: 50,
      netProceedsCents: 12_450,
      allocatedCostCents: 7_525,
      realizedResultCents: 4_925,
      status: "OK",
    });
  });

  it("calculates realized loss and keeps fees out of proceeds", () => {
    const sales = deriveRealizedInvestmentResults({
      events: [
        event(),
        event({
          id: "sell",
          type: "SELL",
          day: 2,
          quantityUnits: parseInvestmentQuantity("10")!,
          operation: { unitPriceCents: 900, feesCents: 100 },
        }),
      ],
      adjustments: [],
    });

    expect(sales[0]).toMatchObject({
      netProceedsCents: 8_900,
      allocatedCostCents: 10_000,
      realizedResultCents: -1_100,
      status: "OK",
    });
  });

  it("uses an audited baseline before later sales", () => {
    const sales = deriveRealizedInvestmentResults({
      events: [
        event({
          id: "transfer",
          type: "CUSTODY_TRANSFER_IN",
          quantityUnits: parseInvestmentQuantity("100")!,
          operation: null,
        }),
        event({
          id: "sell",
          type: "SELL",
          day: 2,
          quantityUnits: parseInvestmentQuantity("20")!,
          operation: { unitPriceCents: 1_200, feesCents: 40 },
        }),
      ],
      adjustments: [
        {
          id: "baseline",
          assetId: "asset-1",
          quantityUnits: parseInvestmentQuantity("100")!,
          costBasisCents: 100_000,
          year: 2026,
          month: 1,
          day: 1,
          createdAt: new Date("2026-01-01T18:00:00Z"),
        },
      ],
    });

    expect(sales[0]).toMatchObject({
      allocatedCostCents: 20_000,
      netProceedsCents: 23_960,
      realizedResultCents: 3_960,
      status: "OK",
    });
  });

  it("marks a sale pending when prior fiscal cost is incomplete", () => {
    const sales = deriveRealizedInvestmentResults({
      events: [
        event({
          id: "bad-buy",
          operation: null,
        }),
        event({
          id: "sell",
          type: "SELL",
          day: 2,
          quantityUnits: parseInvestmentQuantity("5")!,
          operation: { unitPriceCents: 1_200, feesCents: 0 },
        }),
      ],
      adjustments: [],
    });

    expect(sales[0]?.status).toBe("PENDING");
    expect(sales[0]?.pending[0]).toContain("Histórico fiscal anterior");
    expect(sales[0]?.realizedResultCents).toBe(0);
  });

  it("does not create realized results for custody transfers or market value changes", () => {
    const sales = deriveRealizedInvestmentResults({
      events: [
        event(),
        event({
          id: "out",
          type: "CUSTODY_TRANSFER_OUT",
          day: 2,
          operation: null,
        }),
        event({
          id: "in",
          type: "CUSTODY_TRANSFER_IN",
          day: 3,
          operation: null,
        }),
      ],
      adjustments: [],
    });

    expect(sales).toEqual([]);
  });
});
