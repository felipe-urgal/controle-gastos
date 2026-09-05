import { describe, expect, it } from "vitest";

import { applyImportRulesToPreview } from "@/app/lib/transactions/import/rule-preview";
import type { ImportRule } from "@/app/lib/transactions/import-rules";

const baseItem = {
  index: 0,
  source: "CSV" as const,
  date: "2026-09-05",
  amountCents: 4_990,
  type: "EXPENSE" as const,
  description: "UBER TRIP 123",
  externalId: undefined,
  currency: "BRL",
  errors: [],
  fingerprint: "a".repeat(64),
  duplicate: false,
};

const rules: ImportRule[] = [
  {
    id: "rule-global",
    name: "Transporte global",
    isActive: true,
    priority: 20,
    accountId: null,
    transactionType: "EXPENSE",
    descriptionOperator: "CONTAINS",
    descriptionPattern: "uber",
    minAmountCents: null,
    maxAmountCents: null,
    categoryId: "category-global",
    normalizedDescription: "Uber",
  },
  {
    id: "rule-account",
    name: "Transporte da conta",
    isActive: true,
    priority: 10,
    accountId: "account-1",
    transactionType: "EXPENSE",
    descriptionOperator: "STARTS_WITH",
    descriptionPattern: "uber trip",
    minAmountCents: 1_000,
    maxAmountCents: 10_000,
    categoryId: "category-account",
    normalizedDescription: "Uber transporte",
  },
];

describe("applyImportRulesToPreview", () => {
  it("decorates a valid item with deterministic provenance and suggestions", () => {
    const [item] = applyImportRulesToPreview({
      accountId: "account-1",
      items: [baseItem],
      rules,
    });

    expect(item).toMatchObject({
      description: "UBER TRIP 123",
      matchedRuleId: "rule-account",
      matchedRuleName: "Transporte da conta",
      suggestedCategoryId: "category-account",
      suggestedDescription: "Uber transporte",
    });
  });

  it("does not suggest automation for duplicate or invalid rows", () => {
    const items = applyImportRulesToPreview({
      accountId: "account-1",
      items: [
        { ...baseItem, duplicate: true },
        { ...baseItem, index: 1, fingerprint: "b".repeat(64), errors: ["Data inválida"] },
      ],
      rules,
    });

    for (const item of items) {
      expect(item.matchedRuleId).toBeNull();
      expect(item.suggestedCategoryId).toBeNull();
      expect(item.suggestedDescription).toBeNull();
    }
  });

  it("keeps original import data unchanged so confirmation can honor manual override", () => {
    const [item] = applyImportRulesToPreview({
      accountId: "account-1",
      items: [baseItem],
      rules,
    });

    expect(item.description).toBe(baseItem.description);
    expect(item.fingerprint).toBe(baseItem.fingerprint);
    expect(item.amountCents).toBe(baseItem.amountCents);
  });
});
