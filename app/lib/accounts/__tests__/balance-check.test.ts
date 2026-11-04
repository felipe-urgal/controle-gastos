import { describe, expect, it } from "vitest";

import {
  BALANCE_ADJUSTMENT_DESCRIPTION,
  buildAdjustmentPayload,
  canCheckBalance,
  evaluateBalanceCheck,
  parseStatementBalanceToCents,
} from "@/app/lib/accounts/balance-check";

describe("canCheckBalance", () => {
  it("só conta corrente", () => {
    expect(canCheckBalance({ type: "CREDIT_DEBIT" })).toBe(true);
    expect(canCheckBalance({ type: "CREDIT_CARD" })).toBe(false);
    expect(canCheckBalance({ type: "INVESTMENT" })).toBe(false);
  });
});

describe("parseStatementBalanceToCents", () => {
  it.each([
    ["1234,56", 123_456],
    ["R$ 1234,56", 123_456],
    ["-1234,56", -123_456],
    ["−50,00", -5_000],
    ["0", 0],
    ["0,00", 0],
    ["-0,00", 0],
    ["R$ 0,00", 0],
    ["10", 1_000],
  ])("%s → %s", (input, expected) => {
    expect(parseStatementBalanceToCents(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "1,234,56", "--5", "1e3"])("%j é inválido", (input) => {
    expect(parseStatementBalanceToCents(input)).toBeNull();
  });
});

describe("evaluateBalanceCheck", () => {
  it("confere quando iguais", () => {
    expect(evaluateBalanceCheck(10_000, 10_000)).toEqual({
      statementBalance: 10_000,
      appBalance: 10_000,
      difference: 0,
      matches: true,
      adjustment: null,
    });
  });

  it("extrato maior que o app → falta receita (ajuste de receita)", () => {
    const check = evaluateBalanceCheck(12_500, 10_000);
    expect(check.difference).toBe(2_500);
    expect(check.adjustment).toEqual({ type: "INCOME", amount: 2_500 });
  });

  it("extrato menor que o app → ajuste de despesa, também com saldos negativos", () => {
    expect(evaluateBalanceCheck(7_000, 10_000).adjustment).toEqual({ type: "EXPENSE", amount: 3_000 });
    expect(evaluateBalanceCheck(-2_000, -5_000).adjustment).toEqual({ type: "INCOME", amount: 3_000 });
    expect(evaluateBalanceCheck(-8_000, -5_000).adjustment).toEqual({ type: "EXPENSE", amount: 3_000 });
  });

  it("diferença maior que o limite de um lançamento não oferece ajuste", () => {
    const check = evaluateBalanceCheck(2_000_000_000, 0);
    expect(check.matches).toBe(false);
    expect(check.adjustment).toBeNull();
  });
});

describe("buildAdjustmentPayload", () => {
  const date = { year: 2026, month: 11, day: 4 };

  it("monta um lançamento concluído que zera a diferença", () => {
    const payload = buildAdjustmentPayload({ check: evaluateBalanceCheck(12_500, 10_000), accountId: "acc", categoryId: "cat", date });
    expect(payload).toEqual({
      amount: 2_500,
      type: "INCOME",
      description: BALANCE_ADJUSTMENT_DESCRIPTION,
      status: "COMPLETED",
      year: 2026,
      month: 11,
      day: 4,
      accountId: "acc",
      categoryId: "cat",
    });
  });

  it("sem diferença, sem conta ou sem categoria não monta nada", () => {
    expect(buildAdjustmentPayload({ check: evaluateBalanceCheck(1, 1), accountId: "acc", categoryId: "cat", date })).toBeNull();
    expect(buildAdjustmentPayload({ check: evaluateBalanceCheck(2, 1), accountId: "", categoryId: "cat", date })).toBeNull();
    expect(buildAdjustmentPayload({ check: evaluateBalanceCheck(2, 1), accountId: "acc", categoryId: "", date })).toBeNull();
  });
});
