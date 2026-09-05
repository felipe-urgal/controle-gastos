import { describe, expect, it } from "vitest";
import { importRuleInputSchema } from "@/app/schemas/import-rule.schema";

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
  normalizedDescription: null,
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
      normalizedDescription: "Supermercado",
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

  it("rejects blank names, patterns and normalized descriptions", () => {
    for (const input of [
      { ...validInput, name: "   " },
      { ...validInput, descriptionPattern: "   " },
      { ...validInput, normalizedDescription: "   " },
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

  it("does not impose an arbitrary priority range beyond integer semantics", () => {
    expect(
      importRuleInputSchema.parse({ ...validInput, priority: -100 }).priority
    ).toBe(-100);
    expect(
      importRuleInputSchema.parse({ ...validInput, priority: 100_000 }).priority
    ).toBe(100_000);
  });
});
