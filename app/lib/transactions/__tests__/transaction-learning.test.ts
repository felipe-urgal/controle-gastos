import { describe, expect, it } from "vitest";

import { buildCorrectionAutomationSuggestions } from "@/app/lib/transactions/transaction-learning";

const imported = {
  description: "  PG *IFOOD 28371  ",
  accountId: "account-1",
  categoryId: "category-old",
  merchantId: null,
  type: "EXPENSE" as const,
  importSource: "OFX",
};

describe("transaction correction learning", () => {
  it("suggests an exact merchant alias after a merchant correction", () => {
    const result = buildCorrectionAutomationSuggestions(imported, {
      ...imported,
      merchantId: "merchant-ifood",
    });

    expect(result.merchant).toEqual({
      merchantId: "merchant-ifood",
      pattern: "PG *IFOOD 28371",
      operator: "EQUALS",
    });
    expect(result.category).toBeNull();
  });

  it("suggests an account-scoped import rule after a category correction", () => {
    const result = buildCorrectionAutomationSuggestions(imported, {
      ...imported,
      categoryId: "category-food",
    });

    expect(result.category?.rule).toMatchObject({
      accountId: "account-1",
      transactionType: "EXPENSE",
      descriptionOperator: "EQUALS",
      descriptionPattern: "PG *IFOOD 28371",
      categoryId: "category-food",
      minAmountCents: null,
      maxAmountCents: null,
    });
    expect(result.merchant).toBeNull();
  });

  it("can suggest merchant and category independently for the same correction", () => {
    const result = buildCorrectionAutomationSuggestions(imported, {
      ...imported,
      categoryId: "category-food",
      merchantId: "merchant-ifood",
    });

    expect(result.merchant).not.toBeNull();
    expect(result.category).not.toBeNull();
  });

  it("does not learn from manual transactions", () => {
    const result = buildCorrectionAutomationSuggestions(
      { ...imported, importSource: null },
      { ...imported, importSource: null, categoryId: "category-food", merchantId: "merchant-ifood" },
    );

    expect(result).toEqual({ merchant: null, category: null });
  });

  it("does not suggest automation when merchant/category did not change", () => {
    expect(buildCorrectionAutomationSuggestions(imported, imported)).toEqual({
      merchant: null,
      category: null,
    });
  });
});
