import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getNetWorthForUser: vi.fn(),
  loadIpcaInflationForPeriod: vi.fn(),
}));

vi.mock("@/app/lib/net-worth/net-worth", () => ({
  getNetWorthForUser: mocks.getNetWorthForUser,
}));

vi.mock("@/app/lib/economic-indicators/ipca", () => ({
  loadIpcaInflationForPeriod: mocks.loadIpcaInflationForPeriod,
}));

import { getNetWorthRealReturnForUser } from "@/app/lib/net-worth/real-return";

beforeEach(() => {
  mocks.getNetWorthForUser.mockReset();
  mocks.loadIpcaInflationForPeriod.mockReset();
});

describe("real net worth return integration", () => {
  it("alinha baseline patrimonial e IPCA ao mesmo intervalo", async () => {
    mocks.getNetWorthForUser.mockResolvedValue({
      history: [
        { year: 2026, month: 4, totals: { BRL: 100_000, USD: 20_000 } },
        { year: 2026, month: 5, totals: { BRL: 102_000, USD: 20_000 } },
        { year: 2026, month: 6, totals: { BRL: 103_000, USD: 21_000 } },
        { year: 2026, month: 7, totals: { BRL: 104_000, USD: 21_000 } },
        { year: 2026, month: 8, totals: { BRL: 105_000, USD: 22_000 } },
        { year: 2026, month: 9, totals: { BRL: 106_000, USD: 22_000 } },
        { year: 2026, month: 10, totals: { BRL: 108_000, USD: 23_000 } },
      ],
    });
    mocks.loadIpcaInflationForPeriod.mockResolvedValue({
      seriesCode: 433,
      source: "BCB_SGS",
      sourceLabel: "Banco Central do Brasil · SGS",
      percentage: 5,
      complete: true,
      expectedMonths: 6,
      availableMonths: 6,
      latestReferenceDate: "2026-10-01",
    });

    const result = await getNetWorthRealReturnForUser("user-1", {
      year: 2026,
      month: 10,
      months: 6,
    });

    expect(mocks.getNetWorthForUser).toHaveBeenCalledWith("user-1", {
      year: 2026,
      month: 10,
      months: 7,
    });
    expect(mocks.loadIpcaInflationForPeriod).toHaveBeenCalledWith(
      { year: 2026, month: 4, totals: { BRL: 100_000, USD: 20_000 } },
      { year: 2026, month: 10, totals: { BRL: 108_000, USD: 23_000 } },
    );
    expect(result.semantic).toBe("EVOLUCAO_PATRIMONIAL");
    expect(result.period).toEqual({
      start: { year: 2026, month: 4 },
      end: { year: 2026, month: 10 },
      months: 6,
    });
    expect(result.byCurrency).toEqual([
      expect.objectContaining({
        currency: "BRL",
        initial: 100_000,
        current: 108_000,
        nominalPercentage: 8,
        realPercentage: 2.857143,
      }),
      expect.objectContaining({
        currency: "USD",
        initial: 20_000,
        current: 23_000,
        nominalPercentage: 15,
        inflationPercentage: null,
        realPercentage: null,
        status: "NOMINAL_ONLY",
      }),
    ]);
  });

  it("propaga período de inflação incompleto sem assumir zero", async () => {
    mocks.getNetWorthForUser.mockResolvedValue({
      history: [
        { year: 2026, month: 9, totals: { BRL: 100_000 } },
        { year: 2026, month: 10, totals: { BRL: 105_000 } },
      ],
    });
    mocks.loadIpcaInflationForPeriod.mockResolvedValue({
      seriesCode: 433,
      source: "BCB_SGS",
      sourceLabel: "Banco Central do Brasil · SGS",
      percentage: null,
      complete: false,
      expectedMonths: 1,
      availableMonths: 0,
      latestReferenceDate: null,
    });

    const result = await getNetWorthRealReturnForUser("user-1", {
      year: 2026,
      month: 10,
      months: 1,
    });

    expect(result.inflation.percentage).toBeNull();
    expect(result.byCurrency[0]).toMatchObject({
      nominalPercentage: 5,
      realPercentage: null,
      status: "INFLATION_INCOMPLETE",
    });
  });
});
