import { describe, expect, it } from "vitest";
import {
  createAccountSchema,
  updateAccountSchema,
  validateAccountUpdateState,
} from "@/app/lib/accounts/account-schema";

describe("account schemas", () => {
  it("applies safe defaults when creating an account", () => {
    const result = createAccountSchema.parse({
      name: "Conta principal",
      type: "CREDIT_DEBIT",
      description: null,
    });

    expect(result.currency).toBe("BRL");
    expect(result.isActive).toBe(true);
  });

  it("rejects invalid account colors", () => {
    const result = createAccountSchema.safeParse({
      name: "Investimentos",
      type: "INVESTMENT",
      description: null,
      color: "blue",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a complete credit card configuration", () => {
    const result = createAccountSchema.parse({
      name: "Cartão principal",
      type: "CREDIT_CARD",
      description: null,
      creditLimit: 500_000,
      statementClosingDay: 5,
      statementDueDay: 12,
    });

    expect(result).toMatchObject({
      type: "CREDIT_CARD",
      creditLimit: 500_000,
      statementClosingDay: 5,
      statementDueDay: 12,
    });
  });

  it("rejects a credit card without billing configuration", () => {
    const result = createAccountSchema.safeParse({
      name: "Cartão incompleto",
      type: "CREDIT_CARD",
      description: null,
    });

    expect(result.success).toBe(false);
  });

  it("rejects credit-card fields on regular accounts", () => {
    const result = createAccountSchema.safeParse({
      name: "Conta principal",
      type: "CREDIT_DEBIT",
      description: null,
      creditLimit: 100_000,
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial account updates without injecting create defaults", () => {
    const result = updateAccountSchema.parse({ isActive: false });

    expect(result).toEqual({ isActive: false });
    expect(result).not.toHaveProperty("currency");
  });

  it("does not reset omitted fields when updating an account", () => {
    const result = updateAccountSchema.parse({ name: "Conta renomeada" });

    expect(result).toEqual({ name: "Conta renomeada" });
    expect(result).not.toHaveProperty("currency");
    expect(result).not.toHaveProperty("isActive");
  });

  it("validates the merged state when changing account type", () => {
    const existing = {
      name: "Conta principal",
      type: "CREDIT_DEBIT" as const,
      currency: "BRL" as const,
      color: "#7C3AED",
      icon: "wallet",
      description: null,
      isActive: true,
      creditLimit: null,
      statementClosingDay: null,
      statementDueDay: null,
    };

    expect(() =>
      validateAccountUpdateState({ type: "CREDIT_CARD" }, existing),
    ).toThrow();

    expect(
      validateAccountUpdateState(
        {
          type: "CREDIT_CARD",
          creditLimit: 250_000,
          statementClosingDay: 10,
          statementDueDay: 18,
        },
        existing,
      ),
    ).toEqual({
      type: "CREDIT_CARD",
      creditLimit: 250_000,
      statementClosingDay: 10,
      statementDueDay: 18,
    });
  });

  it("requires clearing card fields when converting back to a regular account", () => {
    const existing = {
      name: "Cartão",
      type: "CREDIT_CARD" as const,
      currency: "BRL" as const,
      color: "#7C3AED",
      icon: "credit-card",
      description: null,
      isActive: true,
      creditLimit: 250_000,
      statementClosingDay: 10,
      statementDueDay: 18,
    };

    expect(() =>
      validateAccountUpdateState({ type: "CREDIT_DEBIT" }, existing),
    ).toThrow();

    expect(
      validateAccountUpdateState(
        {
          type: "CREDIT_DEBIT",
          creditLimit: null,
          statementClosingDay: null,
          statementDueDay: null,
        },
        existing,
      ),
    ).toBeTruthy();
  });
});
