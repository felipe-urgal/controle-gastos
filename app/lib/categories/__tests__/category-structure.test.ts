import { describe, expect, it } from "vitest";

import {
  assertCategoryDeletable,
  assertCategoryTypeChangeAllowed,
} from "@/app/lib/categories/category-structure";

const emptyUsage = {
  transactions: 0,
  allocations: 0,
  monthlyLimits: 0,
  importRules: 0,
  transactionTemplates: 0,
};

function expectDomainError(fn: () => void, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toMatchObject({ status: 409, code });
    return;
  }
  throw new Error(`Esperava erro de domínio ${code}`);
}

describe("category structural invariants", () => {
  it("keeps the category type immutable", () => {
    expectDomainError(
      () =>
        assertCategoryTypeChangeAllowed(
          { type: "INCOME" },
          { type: "EXPENSE" } as any,
        ),
      "CATEGORY_TYPE_IMMUTABLE",
    );
  });

  it("allows non-structural edits", () => {
    expect(() =>
      assertCategoryTypeChangeAllowed(
        { name: "Mercado atualizado", isActive: false },
        { type: "EXPENSE" } as any,
      ),
    ).not.toThrow();
  });

  it.each([
    ["transactions", { transactions: 1 }, "CATEGORY_HAS_TRANSACTIONS"],
    ["allocations", { allocations: 1 }, "CATEGORY_HAS_ALLOCATIONS"],
    ["monthly limits", { monthlyLimits: 1 }, "CATEGORY_HAS_MONTHLY_LIMITS"],
    ["import rules", { importRules: 1 }, "CATEGORY_HAS_IMPORT_RULES"],
    ["templates", { transactionTemplates: 1 }, "CATEGORY_HAS_TEMPLATES"],
  ])("blocks deletion with %s", (_label, change, code) => {
    expectDomainError(
      () => assertCategoryDeletable({ ...emptyUsage, ...change }),
      code,
    );
  });

  it("allows deleting an unused category", () => {
    expect(() => assertCategoryDeletable(emptyUsage)).not.toThrow();
  });
});
