import { describe, expect, it } from "vitest";

import {
  buildRealReturnByCurrency,
  calculateRealReturn,
  compoundMonthlyInflation,
} from "@/app/lib/net-worth/real-return-domain";

describe("real net worth return domain", () => {
  it("usa a relação real em vez de subtrair percentuais", () => {
    expect(
      calculateRealReturn({
        initial: 100_000,
        current: 108_000,
        inflationPercentage: 5,
        inflationComplete: true,
      }),
    ).toEqual({
      nominalPercentage: 8,
      realPercentage: 2.857143,
      status: "AVAILABLE",
    });
  });

  it("calcula retorno negativo e inflação zero", () => {
    expect(
      calculateRealReturn({
        initial: 100_000,
        current: 90_000,
        inflationPercentage: 0,
        inflationComplete: true,
      }),
    ).toEqual({
      nominalPercentage: -10,
      realPercentage: -10,
      status: "AVAILABLE",
    });
  });

  it("não transforma patrimônio inicial zero em percentual", () => {
    expect(
      calculateRealReturn({
        initial: 0,
        current: 10_000,
        inflationPercentage: 4,
        inflationComplete: true,
      }),
    ).toEqual({
      nominalPercentage: null,
      realPercentage: null,
      status: "BASELINE_NOT_POSITIVE",
    });
  });

  it("mantém o nominal mas não inventa inflação ausente", () => {
    expect(
      calculateRealReturn({
        initial: 100_000,
        current: 110_000,
        inflationPercentage: null,
        inflationComplete: false,
      }),
    ).toEqual({
      nominalPercentage: 10,
      realPercentage: null,
      status: "INFLATION_INCOMPLETE",
    });
  });

  it("acumula inflação mensal de forma composta", () => {
    expect(compoundMonthlyInflation([1, 2])).toBe(3.02);
  });

  it("separa moedas sem agregação ou conversão silenciosa", () => {
    expect(
      buildRealReturnByCurrency({
        baselineTotals: { BRL: 100_000, USD: 20_000 },
        currentTotals: { BRL: 110_000, USD: 18_000 },
        inflationPercentage: 5,
        inflationComplete: true,
      }),
    ).toEqual([
      {
        currency: "BRL",
        initial: 100_000,
        current: 110_000,
        nominalPercentage: 10,
        inflationPercentage: 5,
        realPercentage: 4.761905,
        status: "AVAILABLE",
      },
      {
        currency: "USD",
        initial: 20_000,
        current: 18_000,
        nominalPercentage: -10,
        inflationPercentage: 5,
        realPercentage: -14.285714,
        status: "AVAILABLE",
      },
    ]);
  });
});
