import { describe, expect, it } from "vitest";

import {
  normalizeTagDisplayName,
  normalizeTagNameKey,
} from "@/app/lib/tags/tag-name";
import {
  MAX_TRANSACTION_TAGS,
  createTagSchema,
  updateTagSchema,
} from "@/app/lib/tags/tag-schema";
import { createTransactionSchema } from "@/app/lib/transactions/transaction-schema";

const baseTransaction = {
  categoryId: "550e8400-e29b-41d4-a716-446655440000",
  accountId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  amount: 1000,
  description: "Compra",
  year: 2026,
  month: 9,
  day: 30,
  type: "EXPENSE" as const,
};

describe("transaction tags schema", () => {
  it("normalizes the visual prefix, whitespace and unicode without removing accents", () => {
    expect(createTagSchema.parse({ name: "  ##Férias   2026  " })).toEqual({
      name: "Férias 2026",
    });
    expect(
      normalizeTagDisplayName("Fe\u0301rias"),
    ).toBe("Férias");
    expect(normalizeTagNameKey("Ferias")).toBe("ferias");
    expect(normalizeTagNameKey("#FERIAS")).toBe("ferias");
    expect(normalizeTagNameKey("Férias")).toBe("férias");
    expect(normalizeTagNameKey("Ferias")).not.toBe(normalizeTagNameKey("Férias"));
  });

  it("enforces the documented canonical name length and rejects empty tag names", () => {
    expect(createTagSchema.safeParse({ name: "" }).success).toBe(false);
    expect(createTagSchema.safeParse({ name: "###   " }).success).toBe(false);
    expect(createTagSchema.safeParse({ name: "x".repeat(41) }).success).toBe(false);
    expect(
      createTagSchema.safeParse({ name: `#${"x".repeat(40)}` }).success,
    ).toBe(true);
  });

  it("rejects empty update payloads", () => {
    expect(updateTagSchema.safeParse({}).success).toBe(false);
  });

  it("accepts up to ten distinct tags and rejects duplicates or overflow", () => {
    const tagIds = Array.from(
      { length: MAX_TRANSACTION_TAGS },
      (_, index) => `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
    );

    expect(
      createTransactionSchema.safeParse({ ...baseTransaction, tagIds }).success,
    ).toBe(true);
    expect(
      createTransactionSchema.safeParse({
        ...baseTransaction,
        tagIds: [tagIds[0], tagIds[0]],
      }).success,
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse({
        ...baseTransaction,
        tagIds: [...tagIds, "550e8400-e29b-41d4-a716-999999999999"],
      }).success,
    ).toBe(false);
  });
});

describe("tag budget schema", () => {
  it("aceita valor e moeda juntos, ou os dois nulos para limpar", () => {
    expect(createTagSchema.parse({ name: "Viagem", budgetAmount: 500_000, budgetCurrency: "BRL" })).toMatchObject({
      budgetAmount: 500_000,
      budgetCurrency: "BRL",
    });
    expect(updateTagSchema.parse({ budgetAmount: null, budgetCurrency: null })).toEqual({ budgetAmount: null, budgetCurrency: null });
    expect(createTagSchema.parse({ name: "Sem orçamento" })).toEqual({ name: "Sem orçamento" });
  });

  it("recusa só um dos dois, valor não positivo ou fracionado e moeda inválida", () => {
    expect(createTagSchema.safeParse({ name: "X", budgetAmount: 1000 }).success).toBe(false);
    expect(updateTagSchema.safeParse({ budgetCurrency: "BRL" }).success).toBe(false);
    expect(updateTagSchema.safeParse({ budgetAmount: 1000, budgetCurrency: null }).success).toBe(false);
    expect(updateTagSchema.safeParse({ budgetAmount: 0, budgetCurrency: "BRL" }).success).toBe(false);
    expect(updateTagSchema.safeParse({ budgetAmount: 10.5, budgetCurrency: "BRL" }).success).toBe(false);
    expect(updateTagSchema.safeParse({ budgetAmount: 1000, budgetCurrency: "XXX" }).success).toBe(false);
  });
});
