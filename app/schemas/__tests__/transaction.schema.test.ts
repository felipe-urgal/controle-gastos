import { describe, expect, it } from "vitest";
import { createTransactionSchema, updateTransactionSchema } from "../transaction.schema";

const validTransaction = {
  categoryId: "550e8400-e29b-41d4-a716-446655440000",
  accountId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  amount: 12500,
  description: "Supermercado",
  year: 2026,
  month: 8,
  day: 29,
  type: "EXPENSE" as const,
};

describe("transaction schemas", () => {
  it("defaults new transactions to COMPLETED", () => {
    const result = createTransactionSchema.parse(validTransaction);

    expect(result.status).toBe("COMPLETED");
  });

  it("rejects zero or negative transaction amounts", () => {
    const zero = createTransactionSchema.safeParse({
      ...validTransaction,
      amount: 0,
    });
    const negative = createTransactionSchema.safeParse({
      ...validTransaction,
      amount: -100,
    });

    expect(zero.success).toBe(false);
    expect(negative.success).toBe(false);
  });

  it("rejects months outside the supported range", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      month: 13,
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial transaction updates", () => {
    const result = updateTransactionSchema.parse({ status: "CANCELLED" });

    expect(result).toEqual({ status: "CANCELLED" });
  });
});
