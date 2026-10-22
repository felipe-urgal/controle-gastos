import { describe, expect, it } from "vitest";

import {
  aggregateTagCurrencies,
  aggregateTagHistory,
  parseTagReportPeriod,
  tagHistoryWindow,
  type TagReportRow,
} from "@/app/lib/tags/tag-report-model";

const asOf = { year: 2026, month: 10 };

function row(overrides: Partial<TagReportRow>): TagReportRow {
  return { currency: "BRL", accountType: "CREDIT_DEBIT", type: "EXPENSE", year: 2026, month: 10, count: 1, total: 1_000, ...overrides };
}

describe("parseTagReportPeriod", () => {
  it("aceita month e year e cai em all para o resto", () => {
    expect(parseTagReportPeriod("month")).toBe("month");
    expect(parseTagReportPeriod("year")).toBe("year");
    expect(parseTagReportPeriod("tudo")).toBe("all");
    expect(parseTagReportPeriod(null)).toBe("all");
  });
});

describe("tagHistoryWindow", () => {
  it("devolve seis meses terminando no atual e atravessa o ano", () => {
    expect(tagHistoryWindow({ year: 2026, month: 2 })).toEqual([
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
  });
});

describe("aggregateTagCurrencies", () => {
  const rows = [
    row({ total: 5_000 }),
    row({ month: 3, total: 2_000, count: 2 }),
    row({ year: 2025, month: 12, total: 9_000 }),
    row({ currency: "EUR", total: 700 }),
    row({ type: "INCOME", total: 1_500 }),
  ];

  it("filtra por mês, ano ou tudo e mantém cada moeda separada", () => {
    const month = aggregateTagCurrencies(rows, "month", asOf);
    expect(month).toEqual([
      { currency: "BRL", transactionCount: 2, income: 1_500, expense: 5_000, balance: -3_500 },
      { currency: "EUR", transactionCount: 1, income: 0, expense: 700, balance: -700 },
    ]);

    expect(aggregateTagCurrencies(rows, "year", asOf).find((entry) => entry.currency === "BRL")).toMatchObject({ transactionCount: 4, expense: 7_000 });
    expect(aggregateTagCurrencies(rows, "all", asOf).find((entry) => entry.currency === "BRL")).toMatchObject({ transactionCount: 5, expense: 16_000 });
  });

  it("trata despesa de cartão como despesa e estorno como redução", () => {
    const card = aggregateTagCurrencies(
      [row({ accountType: "CREDIT_CARD", total: 4_000 }), row({ accountType: "CREDIT_CARD", type: "INCOME", total: 1_000 })],
      "all",
      asOf,
    );

    expect(card[0]).toMatchObject({ income: 0, expense: 3_000, balance: -3_000 });
  });
});

describe("aggregateTagHistory", () => {
  it("preenche meses vazios com zero e ignora o que está fora da janela", () => {
    const history = aggregateTagHistory(
      [row({ month: 10, total: 3_000 }), row({ month: 8, total: 1_000 }), row({ month: 8, type: "INCOME", total: 400 }), row({ year: 2025, month: 1, total: 99_000 }), row({ currency: "USD", month: 9, total: 50 })],
      asOf,
    );

    expect(history.map((entry) => entry.currency)).toEqual(["BRL", "USD"]);
    expect(history[0].points.map((point) => point.expense)).toEqual([0, 0, 0, 1_000, 0, 3_000]);
    expect(history[0].points[3].income).toBe(400);
    expect(history[1].points[4].expense).toBe(50);
  });

  it("não devolve histórico sem movimentos", () => {
    expect(aggregateTagHistory([], asOf)).toEqual([]);
  });
});
