import { describe, expect, it } from "vitest";

import {
  calculateInvestmentGrossCents,
  deriveInvestmentPositions,
  formatInvestmentQuantity,
  InvestmentPositionError,
  parseInvestmentQuantity,
  type InvestmentOperationForPosition,
} from "@/app/lib/investments/investment-domain";

function operation(
  overrides: Partial<InvestmentOperationForPosition> = {},
): InvestmentOperationForPosition {
  return {
    id: "op-1",
    type: "BUY",
    quantityUnits: parseInvestmentQuantity("1")!,
    unitPriceCents: 1_000,
    feesCents: 0,
    year: 2026,
    month: 10,
    day: 1,
    createdAt: new Date("2026-10-01T12:00:00Z"),
    accountId: "account-1",
    accountName: "Corretora",
    assetId: "asset-1",
    assetSymbol: "TEST3",
    assetName: "Ativo teste",
    assetType: "STOCK",
    currency: "BRL",
    ...overrides,
  };
}

describe("investment domain", () => {
  it("parses and formats fractional quantities with eight decimals", () => {
    expect(parseInvestmentQuantity("0,125")).toBe(12_500_000n);
    expect(parseInvestmentQuantity("0.00000001")).toBe(1n);
    expect(formatInvestmentQuantity(12_500_000n)).toBe("0.125");
    expect(formatInvestmentQuantity(100_000_000n)).toBe("1");
    expect(parseInvestmentQuantity("0")).toBeNull();
    expect(parseInvestmentQuantity("1.000000001")).toBeNull();
  });

  it("rounds fractional gross amounts to the nearest cent", () => {
    const quantity = parseInvestmentQuantity("0.5")!;
    expect(calculateInvestmentGrossCents(quantity, 1_001)).toBe(501);
  });

  it("derives weighted cost basis across buys, fees and a partial sell", () => {
    const operations = [
      operation({
        id: "buy-1",
        quantityUnits: parseInvestmentQuantity("10")!,
        unitPriceCents: 1_000,
      }),
      operation({
        id: "buy-2",
        quantityUnits: parseInvestmentQuantity("5")!,
        unitPriceCents: 2_000,
        feesCents: 100,
        day: 2,
      }),
      operation({
        id: "sell-1",
        type: "SELL",
        quantityUnits: parseInvestmentQuantity("3")!,
        unitPriceCents: 2_500,
        feesCents: 50,
        day: 3,
      }),
    ];

    expect(deriveInvestmentPositions(operations)).toEqual([
      expect.objectContaining({
        quantity: "12",
        investedCents: 16_080,
        averageUnitCostCents: 1_340,
      }),
    ]);
  });

  it("removes the position after a full sell", () => {
    expect(
      deriveInvestmentPositions([
        operation({
          id: "buy",
          quantityUnits: parseInvestmentQuantity("2.5")!,
        }),
        operation({
          id: "sell",
          type: "SELL",
          quantityUnits: parseInvestmentQuantity("2.5")!,
          day: 2,
        }),
      ]),
    ).toEqual([]);
  });

  it("rejects a sell that exceeds the available position", () => {
    expect(() =>
      deriveInvestmentPositions([
        operation({
          id: "sell",
          type: "SELL",
          quantityUnits: parseInvestmentQuantity("1")!,
        }),
      ]),
    ).toThrow(InvestmentPositionError);
  });

  it("keeps positions separated by account and asset", () => {
    const positions = deriveInvestmentPositions([
      operation({ id: "a", accountId: "account-a" }),
      operation({ id: "b", accountId: "account-b" }),
      operation({ id: "c", assetId: "asset-b", assetSymbol: "OTHER" }),
    ]);

    expect(positions).toHaveLength(3);
  });
});
