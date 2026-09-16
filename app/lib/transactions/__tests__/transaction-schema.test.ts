import { describe, expect, it } from "vitest";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/app/lib/transactions/transaction-schema";

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

  it("rejects fractional cents and date components", () => {
    for (const input of [
      { ...validTransaction, amount: 100.5 },
      { ...validTransaction, year: 2026.5 },
      { ...validTransaction, month: 8.5 },
      { ...validTransaction, day: 29.5 },
    ]) {
      expect(createTransactionSchema.safeParse(input).success).toBe(false);
    }
  });

  it("rejects impossible logical dates", () => {
    expect(
      createTransactionSchema.safeParse({
        ...validTransaction,
        year: 2026,
        month: 2,
        day: 29,
      }).success,
    ).toBe(false);

    expect(
      createTransactionSchema.safeParse({
        ...validTransaction,
        year: 2026,
        month: 4,
        day: 31,
      }).success,
    ).toBe(false);
  });

  it("accepts valid leap-day dates", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      year: 2028,
      month: 2,
      day: 29,
    });

    expect(result.success).toBe(true);
  });

  it("rejects months outside the supported range", () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      month: 13,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an impossible complete date in partial updates", () => {
    const result = updateTransactionSchema.safeParse({
      year: 2026,
      month: 2,
      day: 30,
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial transaction updates", () => {
    const result = updateTransactionSchema.parse({ status: "CANCELLED" });

    expect(result).toEqual({ status: "CANCELLED" });
  });
});
