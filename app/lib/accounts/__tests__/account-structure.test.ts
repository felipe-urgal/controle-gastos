import { describe, expect, it } from "vitest";

import {
  assertAccountDeletable,
  assertAccountStructuralChangeAllowed,
} from "@/app/lib/accounts/account-structure";

const emptyUsage = {
  transactions: 0,
  investmentOperations: 0,
  investmentIncomes: 0,
  investmentFiscalEvents: 0,
  cardPayments: 0,
};

const bank = {
  type: "CREDIT_DEBIT" as const,
  currency: "BRL",
  statementClosingDay: null,
  statementDueDay: null,
};

describe("account structural invariants", () => {
  it("allows structural changes on an empty account", () => {
    expect(() =>
      assertAccountStructuralChangeAllowed(
        { currency: "USD" },
        bank as any,
        emptyUsage,
      ),
    ).not.toThrow();
  });

  it("blocks changing currency after transactions exist", () => {
    expect(() =>
      assertAccountStructuralChangeAllowed(
        { currency: "USD" },
        bank as any,
        { ...emptyUsage, transactions: 1 },
      ),
    ).toThrowError(
      expect.objectContaining({
        status: 409,
        code: "ACCOUNT_STRUCTURE_LOCKED",
      }),
    );
  });

  it("blocks converting an account with history into investment", () => {
    expect(() =>
      assertAccountStructuralChangeAllowed(
        { type: "INVESTMENT" },
        bank as any,
        { ...emptyUsage, transactions: 1 },
      ),
    ).toThrowError(
      expect.objectContaining({
        status: 409,
        code: "INVESTMENT_ACCOUNT_STRUCTURE_LOCKED",
      }),
    );
  });

  it.each([
    ["investment operation", { investmentOperations: 1 }],
    ["investment income", { investmentIncomes: 1 }],
    ["investment fiscal event", { investmentFiscalEvents: 1 }],
  ])("blocks investment structural changes after %s", (_label, change) => {
    expect(() =>
      assertAccountStructuralChangeAllowed(
        { currency: "USD" },
        { ...bank, type: "INVESTMENT" } as any,
        { ...emptyUsage, ...change },
      ),
    ).toThrowError(
      expect.objectContaining({
        status: 409,
        code: "INVESTMENT_ACCOUNT_STRUCTURE_LOCKED",
      }),
    );
  });

  it.each([
    ["transactions", { transactions: 1 }, "ACCOUNT_HAS_TRANSACTIONS"],
    ["investment operations", { investmentOperations: 1 }, "ACCOUNT_HAS_INVESTMENT_OPERATIONS"],
    ["investment incomes", { investmentIncomes: 1 }, "ACCOUNT_HAS_INVESTMENT_INCOMES"],
    ["investment fiscal events", { investmentFiscalEvents: 1 }, "ACCOUNT_HAS_INVESTMENT_FISCAL_EVENTS"],
    ["card payments", { cardPayments: 1 }, "ACCOUNT_HAS_CARD_PAYMENTS"],
  ])("blocks deleting an account with %s", (_label, change, code) => {
    expect(() =>
      assertAccountDeletable({ ...emptyUsage, ...change }),
    ).toThrowError(expect.objectContaining({ status: 409, code }));
  });

  it("keeps profile-only edits available with financial history", () => {
    expect(() =>
      assertAccountStructuralChangeAllowed(
        { name: "Conta renomeada", isActive: false },
        bank as any,
        { ...emptyUsage, transactions: 3 },
      ),
    ).not.toThrow();
  });
});
