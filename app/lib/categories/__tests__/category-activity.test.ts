import { describe, expect, it } from "vitest";

import {
  buildCategoryHistory,
  buildMonthWindow,
  pickPrimaryCurrency,
  previousAverage,
} from "@/app/lib/categories/category-activity";

describe("buildMonthWindow", () => {
  it("devolve 6 meses terminando no mês atual, do mais antigo para o atual", () => {
    expect(buildMonthWindow({ year: 2026, month: 10 })).toEqual([
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ]);
  });

  it("atravessa a virada de ano", () => {
    const window = buildMonthWindow({ year: 2026, month: 2 });

    expect(window[0]).toEqual({ year: 2025, month: 9 });
    expect(window[3]).toEqual({ year: 2025, month: 12 });
    expect(window[5]).toEqual({ year: 2026, month: 2 });
  });
});

describe("buildCategoryHistory", () => {
  const window = buildMonthWindow({ year: 2026, month: 10 });

  it("soma por mês e preenche meses sem movimento com zero", () => {
    const history = buildCategoryHistory(window, [
      { year: 2026, month: 10, amount: 20_000 },
      { year: 2026, month: 10, amount: 5_000 },
      { year: 2026, month: 8, amount: 7_000 },
      { year: 2025, month: 1, amount: 99_999 },
    ]);

    expect(history.map((point) => point.realized)).toEqual([0, 0, 0, 7_000, 0, 25_000]);
  });
});

describe("previousAverage", () => {
  it("é a média dos meses anteriores ao atual, contando meses vazios", () => {
    const history = [10_000, 0, 20_000, 0, 20_000, 99_000].map((realized, index) => ({ year: 2026, month: index + 5, realized }));

    expect(previousAverage(history)).toBe(10_000);
  });

  it("devolve zero sem histórico", () => {
    expect(previousAverage([])).toBe(0);
    expect(previousAverage([{ year: 2026, month: 10, realized: 5 }])).toBe(0);
  });
});

describe("pickPrimaryCurrency", () => {
  it("escolhe a moeda de maior movimento e cai em BRL sem movimento", () => {
    expect(pickPrimaryCurrency(new Map([["BRL", 1_000], ["USD", 5_000]]))).toBe("USD");
    expect(pickPrimaryCurrency(new Map())).toBe("BRL");
  });
});
