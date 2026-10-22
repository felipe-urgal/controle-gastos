import { describe, expect, it } from "vitest";

import { BALANCE_SERIES_DAYS, buildBalanceSeries } from "@/app/lib/accounts/account-activity";

const asOf = { year: 2026, month: 10, day: 22 };
const key = (year: number, month: number, day: number) => year * 10_000 + month * 100 + day;

describe("buildBalanceSeries", () => {
  it("termina no saldo atual e tem 30 pontos por padrão", () => {
    const series = buildBalanceSeries({ currentBalance: 100_000, dailyDeltas: new Map(), asOf });

    expect(series).toHaveLength(BALANCE_SERIES_DAYS);
    expect(series.at(-1)).toBe(100_000);
    expect(new Set(series)).toEqual(new Set([100_000]));
  });

  it("desfaz as movimentações andando para trás", () => {
    const series = buildBalanceSeries({
      currentBalance: 100_000,
      dailyDeltas: new Map([
        [key(2026, 10, 22), -10_000], // hoje: saída
        [key(2026, 10, 20), 50_000], // anteontem: entrada
      ]),
      asOf,
      days: 4,
    });

    // 19/10, 20/10, 21/10, 22/10
    expect(series).toEqual([60_000, 110_000, 110_000, 100_000]);
  });

  it("atravessa a virada de mês", () => {
    const series = buildBalanceSeries({
      currentBalance: 5_000,
      dailyDeltas: new Map([[key(2026, 10, 1), 2_000]]),
      asOf: { year: 2026, month: 10, day: 2 },
      days: 3,
    });

    // 30/09, 01/10, 02/10
    expect(series).toEqual([3_000, 5_000, 5_000]);
  });

  it("aceita saldo negativo", () => {
    const series = buildBalanceSeries({ currentBalance: -4_500, dailyDeltas: new Map([[key(2026, 10, 22), -4_500]]), asOf, days: 2 });

    expect(series).toEqual([0, -4_500]);
  });
});
