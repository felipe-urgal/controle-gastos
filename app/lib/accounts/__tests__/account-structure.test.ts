import { describe, expect, it } from "vitest";

import { assertAccountStructuralChangeAllowed } from "@/app/lib/accounts/account-structure";

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
