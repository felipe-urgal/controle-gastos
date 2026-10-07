import { describe, expect, it } from "vitest";
import { importRuleInputSchema } from "@/app/lib/transactions/import/import-rule-schema";

const validInput = {
  name: "Mercado",
  isActive: true,
  priority: 10,
  accountId: null,
  transactionType: "EXPENSE" as const,
  descriptionOperator: "CONTAINS" as const,
  descriptionPattern: "mercado",
  minAmountCents: null,
  maxAmountCents: null,
  categoryId: "22222222-2222-4222-8222-222222222222",
};

describe("import rule input schema", () => {
  it("accepts the complete deterministic MVP contract", () => {
    expect(importRuleInputSchema.parse(validInput)).toEqual(validInput);
  });

  it("accepts account scoping and inclusive cent bounds", () => {
    const result = importRuleInputSchema.parse({
      ...validInput,
      accountId: "11111111-1111-4111-8111-111111111111",
      minAmountCents: 12_345,
      maxAmountCents: 12_345,
    });

    expect(result.minAmountCents).toBe(12_345);
    expect(result.maxAmountCents).toBe(12_345);
  });

  it("rejects negative or inverted amount bounds", () => {
    expect(
      importRuleInputSchema.safeParse({
        ...validInput,
        minAmountCents: -1,
      }).success
    ).toBe(false);

    const inverted = importRuleInputSchema.safeParse({
      ...validInput,
      minAmountCents: 20_000,
      maxAmountCents: 10_000,
    });

    expect(inverted.success).toBe(false);
    if (!inverted.success) {
      expect(inverted.error.issues[0]?.path).toEqual(["maxAmountCents"]);
    }
  });

  it("accepts monetary maximum and rejects maximum plus one", () => {
    const scoped = {
      ...validInput,
      accountId: "11111111-1111-4111-8111-111111111111",
    };

    expect(
      importRuleInputSchema.parse({
        ...scoped,
        minAmountCents: 1_000_000_000,
        maxAmountCents: 1_000_000_000,
      }).maxAmountCents,
    ).toBe(1_000_000_000);

    expect(
      importRuleInputSchema.safeParse({
        ...scoped,
        maxAmountCents: 1_000_000_001,
      }).success,
    ).toBe(false);
  });

  it("rejects blank names and patterns", () => {
    for (const input of [
      { ...validInput, name: "   " },
      { ...validInput, descriptionPattern: "   " },
    ]) {
      expect(importRuleInputSchema.safeParse(input).success).toBe(false);
    }
  });

  it("rejects malformed account/category ids", () => {
    expect(
      importRuleInputSchema.safeParse({
        ...validInput,
        accountId: "account-from-client",
      }).success
    ).toBe(false);

    expect(
      importRuleInputSchema.safeParse({
        ...validInput,
        categoryId: "category-from-client",
      }).success
    ).toBe(false);
  });

  it("limits priority to the signed 32-bit Int supported by Prisma", () => {
    expect(
      importRuleInputSchema.parse({
        ...validInput,
        priority: -2_147_483_648,
      }).priority
    ).toBe(-2_147_483_648);
    expect(
      importRuleInputSchema.parse({
        ...validInput,
        priority: 2_147_483_647,
      }).priority
    ).toBe(2_147_483_647);
    expect(
      importRuleInputSchema.safeParse({
        ...validInput,
        priority: -2_147_483_649,
      }).success
    ).toBe(false);
    expect(
      importRuleInputSchema.safeParse({
        ...validInput,
        priority: 2_147_483_648,
      }).success
    ).toBe(false);
  });
});
