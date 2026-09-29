import { describe, expect, it } from "vitest";
import { validateTransactionAllocationSet } from "@/app/lib/transactions/transaction-allocations";

describe("transaction allocations", () => {
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  const c = "33333333-3333-4333-8333-333333333333";

  it("accepts an exact split", () => {
    expect(validateTransactionAllocationSet({ amount: 10_000, categoryId: a, allocations: [
      { categoryId: a, amount: 6_000 }, { categoryId: b, amount: 4_000 },
    ]})).toBeNull();
  });

  it("rejects totals that differ from the transaction", () => {
    expect(validateTransactionAllocationSet({ amount: 10_000, categoryId: a, allocations: [
      { categoryId: a, amount: 6_000 }, { categoryId: b, amount: 3_999 },
    ]})).toBe("A soma das divisões deve ser igual ao valor da transação");
  });

  it("rejects duplicate categories and requires the primary category", () => {
    expect(validateTransactionAllocationSet({ amount: 10_000, categoryId: a, allocations: [
      { categoryId: b, amount: 5_000 }, { categoryId: b, amount: 5_000 },
    ]})).toBe("Cada categoria pode aparecer apenas uma vez na divisão");
    expect(validateTransactionAllocationSet({ amount: 10_000, categoryId: a, allocations: [
      { categoryId: b, amount: 5_000 }, { categoryId: c, amount: 5_000 },
    ]})).toBe("A categoria principal deve participar da divisão");
  });

  it("keeps ordinary transactions compatible", () => {
    expect(validateTransactionAllocationSet({ amount: 10_000, categoryId: a, allocations: [] })).toBeNull();
  });
});
