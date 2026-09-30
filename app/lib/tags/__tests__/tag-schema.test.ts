import { describe, expect, it } from "vitest";

import {
  MAX_TRANSACTION_TAGS,
  createTagSchema,
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
  it("trims tag names and enforces the documented name length", () => {
    expect(createTagSchema.parse({ name: "  ferias-2026  " })).toEqual({
      name: "ferias-2026",
    });
    expect(createTagSchema.safeParse({ name: "" }).success).toBe(false);
    expect(createTagSchema.safeParse({ name: "x".repeat(41) }).success).toBe(false);
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
