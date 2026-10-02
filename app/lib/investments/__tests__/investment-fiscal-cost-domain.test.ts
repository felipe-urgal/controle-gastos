import { describe, expect, it } from "vitest";

import {
  deriveFiscalCostBasis,
  fiscalQuantityMismatchMessage,
} from "@/app/lib/investments/investment-fiscal-cost-domain";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    type: "BUY" as const,
    quantityUnits: parseInvestmentQuantity("10")!,
    year: 2026,
    month: 1,
    day: 1,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    operation: {
      unitPriceCents: 1_000,
      feesCents: 0,
    },
    ...overrides,
  };
}

describe("investment fiscal cost domain", () => {
  it("derives weighted fiscal cost across buys and partial sells", () => {
    const result = deriveFiscalCostBasis({
      events: [
        event({ id: "buy-1" }),
        event({
          id: "buy-2",
          quantityUnits: parseInvestmentQuantity("10")!,
          day: 2,
          operation: { unitPriceCents: 2_000, feesCents: 100 },
        }),
        event({
          id: "sell",
          type: "SELL",
          quantityUnits: parseInvestmentQuantity("5")!,
          day: 3,
          operation: { unitPriceCents: 2_500, feesCents: 50 },
        }),
      ],
      adjustments: [],
    });

    expect(result).toMatchObject({
      quantityUnits: parseInvestmentQuantity("15"),
      costBasisCents: 22_575,
      averageUnitCostCents: 1_505,
      pending: [],
    });
  });

  it("ignores custody transfers in global fiscal cost", () => {
    const result = deriveFiscalCostBasis({
      events: [
        event(),
        event({
          id: "out",
          type: "CUSTODY_TRANSFER_OUT",
          quantityUnits: parseInvestmentQuantity("10")!,
          day: 2,
          operation: null,
        }),
        event({
          id: "in",
          type: "CUSTODY_TRANSFER_IN",
          quantityUnits: parseInvestmentQuantity("10")!,
          day: 3,
          operation: null,
        }),
      ],
      adjustments: [],
    });

    expect(result).toMatchObject({
      quantityUnits: parseInvestmentQuantity("10"),
      costBasisCents: 10_000,
      averageUnitCostCents: 1_000,
      pending: [],
    });
  });

  it("uses an audit adjustment as a verified fiscal baseline", () => {
    const result = deriveFiscalCostBasis({
      events: [
        event({
          id: "transfer",
          type: "CUSTODY_TRANSFER_IN",
          quantityUnits: parseInvestmentQuantity("2100")!,
          operation: null,
        }),
        event({
          id: "new-buy",
          quantityUnits: parseInvestmentQuantity("33")!,
          day: 2,
          operation: { unitPriceCents: 910, feesCents: 0 },
        }),
      ],
      adjustments: [
        {
          id: "baseline",
          quantityUnits: parseInvestmentQuantity("2100")!,
          costBasisCents: 20_000_00,
          year: 2026,
          month: 1,
          day: 1,
          createdAt: new Date("2026-01-01T18:00:00Z"),
        },
      ],
    });

    expect(result.quantityUnits).toBe(parseInvestmentQuantity("2133"));
    expect(result.costBasisCents).toBe(2_030_030);
    expect(result.pending).toEqual([]);
    expect(result.lastAdjustmentId).toBe("baseline");
  });

  it("reports missing fiscal history instead of treating it as zero", () => {
    const result = deriveFiscalCostBasis({
      events: [
        event({
          id: "sell",
          type: "SELL",
          quantityUnits: parseInvestmentQuantity("2")!,
          operation: { unitPriceCents: 1_000, feesCents: 0 },
        }),
      ],
      adjustments: [],
    });

    expect(result.pending[0]?.code).toBe("INSUFFICIENT_FISCAL_POSITION");
  });

  it("detects divergence between fiscal and economic quantities", () => {
    expect(
      fiscalQuantityMismatchMessage({
        fiscalQuantityUnits: parseInvestmentQuantity("33")!,
        economicQuantityUnits: parseInvestmentQuantity("2133")!,
      }),
    ).toContain("Quantidade fiscal não conciliada");
  });
});
