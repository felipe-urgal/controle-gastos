import { describe, expect, it } from "vitest";

import { deriveTaxLossCarryforward } from "@/app/lib/investments/investment-tax-loss-domain";

describe("investment tax loss carryforward domain", () => {
  it("carries a loss forward and compensates only later gains", () => {
    const rows = deriveTaxLossCarryforward({
      results: [
        {
          year: 2026,
          month: 1,
          assetType: "FII",
          currency: "BRL",
          realizedResultCents: -10_000,
          status: "OK",
        },
        {
          year: 2026,
          month: 2,
          assetType: "FII",
          currency: "BRL",
          realizedResultCents: 4_000,
          status: "OK",
        },
        {
          year: 2026,
          month: 3,
          assetType: "FII",
          currency: "BRL",
          realizedResultCents: 8_000,
          status: "OK",
        },
      ],
      adjustments: [],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        month: 1,
        openingLossCents: 0,
        generatedLossCents: 10_000,
        compensatedLossCents: 0,
        closingLossCents: 10_000,
      }),
      expect.objectContaining({
        month: 2,
        openingLossCents: 10_000,
        generatedLossCents: 0,
        compensatedLossCents: 4_000,
        taxableResultAfterCompensationCents: 0,
        closingLossCents: 6_000,
      }),
      expect.objectContaining({
        month: 3,
        openingLossCents: 6_000,
        compensatedLossCents: 6_000,
        taxableResultAfterCompensationCents: 2_000,
        closingLossCents: 0,
      }),
    ]);
  });

  it("never mixes different fiscal classes", () => {
    const rows = deriveTaxLossCarryforward({
      results: [
        {
          year: 2026,
          month: 1,
          assetType: "FII",
          currency: "BRL",
          realizedResultCents: -10_000,
          status: "OK",
        },
        {
          year: 2026,
          month: 2,
          assetType: "STOCK",
          currency: "BRL",
          realizedResultCents: 20_000,
          status: "OK",
        },
      ],
      adjustments: [],
    });

    const fii = rows.filter((row) => row.assetType === "FII");
    const stock = rows.filter((row) => row.assetType === "STOCK");

    expect(fii.at(-1)?.closingLossCents).toBe(10_000);
    expect(stock.at(-1)?.taxableResultAfterCompensationCents).toBe(20_000);
  });

  it("uses a manual adjustment as an auditable opening balance", () => {
    const rows = deriveTaxLossCarryforward({
      results: [
        {
          year: 2026,
          month: 2,
          assetType: "FII",
          currency: "BRL",
          realizedResultCents: 3_000,
          status: "OK",
        },
      ],
      adjustments: [
        {
          id: "baseline",
          year: 2026,
          month: 2,
          assetType: "FII",
          currency: "BRL",
          amountCents: 5_000,
          reason: "Saldo informado na declaração anterior",
          createdAt: new Date("2026-02-01T12:00:00Z"),
        },
      ],
    });

    expect(rows[0]).toMatchObject({
      openingLossCents: 5_000,
      compensatedLossCents: 3_000,
      closingLossCents: 2_000,
      adjustment: {
        id: "baseline",
        amountCents: 5_000,
      },
    });
  });

  it("does not consume a carryforward when the monthly result is pending", () => {
    const rows = deriveTaxLossCarryforward({
      results: [
        {
          year: 2026,
          month: 1,
          assetType: "FII",
          currency: "BRL",
          realizedResultCents: -5_000,
          status: "OK",
        },
        {
          year: 2026,
          month: 2,
          assetType: "FII",
          currency: "BRL",
          realizedResultCents: 0,
          status: "PENDING",
        },
      ],
      adjustments: [],
    });

    expect(rows[1]).toMatchObject({
      openingLossCents: 5_000,
      closingLossCents: 5_000,
      compensatedLossCents: 0,
      status: "PENDING",
    });
  });
});
