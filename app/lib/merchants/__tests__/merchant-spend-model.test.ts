import { describe, expect, it } from "vitest";

import {
  buildMerchantSummary,
  merchantSpend,
  previousMonth,
  type MerchantSpendRow,
} from "@/app/lib/merchants/merchant-spend-model";

const asOf = { year: 2026, month: 10 };

function row(overrides: Partial<MerchantSpendRow>): MerchantSpendRow {
  return { merchantId: "m1", currency: "BRL", accountType: "CREDIT_DEBIT", type: "EXPENSE", year: 2026, month: 10, count: 1, total: 1_000, ...overrides };
}

describe("previousMonth", () => {
  it("volta um mês e atravessa o ano", () => {
    expect(previousMonth({ year: 2026, month: 10 })).toEqual({ year: 2026, month: 9 });
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
  });
});

describe("merchantSpend", () => {
  it("separa mês atual e anterior por moeda e ignora outros meses", () => {
    const rows = [
      row({ total: 5_000, count: 2 }),
      row({ month: 9, total: 3_000 }),
      row({ month: 8, total: 99_000 }),
      row({ currency: "USD", total: 700 }),
      row({ merchantId: "m2", total: 123 }),
    ];

    expect(merchantSpend(rows, "m1", asOf)).toEqual([
      { currency: "BRL", expense: 5_000, previousExpense: 3_000, count: 2 },
      { currency: "USD", expense: 700, previousExpense: 0, count: 1 },
    ]);
    expect(merchantSpend(rows, "ninguem", asOf)).toEqual([]);
  });

  it("estorno em cartão reduz a despesa e receita comum não conta", () => {
    const rows = [
      row({ accountType: "CREDIT_CARD", total: 4_000 }),
      row({ accountType: "CREDIT_CARD", type: "INCOME", total: 1_000 }),
      row({ type: "INCOME", total: 9_000 }),
    ];

    expect(merchantSpend(rows, "m1", asOf)[0].expense).toBe(3_000);
  });
});

describe("buildMerchantSummary", () => {
  const names = new Map([["m1", "Mercado"], ["m2", "iFood"], ["m3", "Posto"], ["m4", "Netflix"]]);

  it("separa o que foi para estabelecimentos do que ficou sem, com os três maiores", () => {
    const summary = buildMerchantSummary(
      [
        row({ merchantId: "m1", total: 8_000 }),
        row({ merchantId: "m2", total: 4_000 }),
        row({ merchantId: "m3", total: 3_000 }),
        row({ merchantId: "m4", total: 500 }),
        row({ merchantId: null, total: 2_500 }),
        row({ merchantId: "m1", month: 9, total: 70_000 }),
      ],
      asOf,
      names,
    );

    expect(summary.currencies).toHaveLength(1);
    expect(summary.currencies[0]).toMatchObject({ currency: "BRL", assigned: 15_500, unassigned: 2_500 });
    expect(summary.currencies[0].top.map((entry) => entry.name)).toEqual(["Mercado", "iFood", "Posto"]);
  });

  it("mantém moedas separadas, a de maior valor primeiro, e some sem gasto", () => {
    const summary = buildMerchantSummary(
      [row({ total: 1_000 }), row({ currency: "EUR", total: 9_000 }), row({ merchantId: null, currency: "USD", total: 100 })],
      asOf,
      names,
    );

    expect(summary.currencies.map((entry) => entry.currency)).toEqual(["EUR", "BRL", "USD"]);
    expect(buildMerchantSummary([], asOf, names).currencies).toEqual([]);
  });
});
