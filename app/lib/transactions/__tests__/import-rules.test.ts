import { describe, expect, it } from "vitest";
import {
  evaluateImportRules,
  ImportRule,
  matchesImportRule,
  normalizeImportRuleText,
} from "@/app/lib/transactions/import-rules";

const baseRule: ImportRule = {
  id: "rule-a",
  name: "Mercado",
  isActive: true,
  priority: 10,
  accountId: null,
  transactionType: "EXPENSE",
  descriptionOperator: "CONTAINS",
  descriptionPattern: "mercado",
  minAmountCents: null,
  maxAmountCents: null,
  categoryId: "category-food",
  normalizedDescription: null,
};

const candidate = {
  accountId: "account-1",
  transactionType: "EXPENSE" as const,
  description: "  Mercado   Central  ",
  amountCents: 12_345,
};

describe("import rules", () => {
  it("normalizes unicode, whitespace and case deterministically", () => {
    expect(normalizeImportRuleText("  MERCADO   Central  ")).toBe(
      "mercado central"
    );
    expect(normalizeImportRuleText("ＡＢＣ")).toBe("abc");
  });

  it.each([
    ["EQUALS", "mercado central", true],
    ["EQUALS", "mercado", false],
    ["STARTS_WITH", "mercado", true],
    ["STARTS_WITH", "central", false],
    ["CONTAINS", "cado cent", true],
    ["CONTAINS", "farmacia", false],
  ] as const)("supports %s", (descriptionOperator, descriptionPattern, expected) => {
    expect(
      matchesImportRule(
        { ...baseRule, descriptionOperator, descriptionPattern },
        candidate
      )
    ).toBe(expected);
  });

  it("matches account, type and inclusive amount bounds", () => {
    const constrainedRule: ImportRule = {
      ...baseRule,
      accountId: "account-1",
      minAmountCents: 12_345,
      maxAmountCents: 12_345,
    };

    expect(matchesImportRule(constrainedRule, candidate)).toBe(true);
    expect(
      matchesImportRule(constrainedRule, {
        ...candidate,
        accountId: "account-2",
      })
    ).toBe(false);
    expect(
      matchesImportRule(constrainedRule, {
        ...candidate,
        transactionType: "INCOME",
      })
    ).toBe(false);
    expect(
      matchesImportRule(constrainedRule, {
        ...candidate,
        amountCents: 12_344,
      })
    ).toBe(false);
  });

  it("ignores inactive and malformed rules instead of producing a suggestion", () => {
    expect(matchesImportRule({ ...baseRule, isActive: false }, candidate)).toBe(
      false
    );
    expect(
      matchesImportRule(
        { ...baseRule, minAmountCents: 20_000, maxAmountCents: 10_000 },
        candidate
      )
    ).toBe(false);
    expect(
      matchesImportRule({ ...baseRule, descriptionPattern: "   " }, candidate)
    ).toBe(false);
  });

  it("selects the first valid rule by priority and explicit specificity", () => {
    const result = evaluateImportRules(
      [
        { ...baseRule, id: "rule-z", priority: 20, categoryId: "late" },
        { ...baseRule, id: "rule-b", priority: 5, categoryId: "global" },
        {
          ...baseRule,
          id: "rule-a",
          priority: 5,
          accountId: "account-1",
          categoryId: "account-specific",
        },
      ],
      candidate
    );

    expect(result).toEqual({
      matchedRuleId: "rule-a",
      matchedRuleName: "Mercado",
      suggestedCategoryId: "account-specific",
      suggestedDescription: null,
      conflict: false,
      matchingRuleIds: ["rule-a", "rule-b", "rule-z"],
      matchingRuleNames: ["Mercado", "Mercado", "Mercado"],
      alsoMatchingRuleIds: ["rule-b", "rule-z"],
      alsoMatchingRuleNames: ["Mercado", "Mercado"],
    });
  });

  it("keeps a suggestion when matching rules agree on the outcome", () => {
    const result = evaluateImportRules(
      [
        { ...baseRule, id: "rule-a", priority: 1 },
        { ...baseRule, id: "rule-b", priority: 2 },
      ],
      candidate
    );

    expect(result).toMatchObject({
      suggestedCategoryId: "category-food",
      conflict: false,
      matchingRuleIds: ["rule-a", "rule-b"],
    });
  });

  it("returns an explicit normalized-description suggestion without mutating input", () => {
    const rules = [
      {
        ...baseRule,
        normalizedDescription: "  Supermercado  ",
      },
    ];

    const result = evaluateImportRules(rules, candidate);

    expect(result?.suggestedDescription).toBe("Supermercado");
    expect(candidate.description).toBe("  Mercado   Central  ");
  });

  it("returns null when no rule matches", () => {
    expect(
      evaluateImportRules(
        [{ ...baseRule, descriptionPattern: "farmacia" }],
        candidate
      )
    ).toBeNull();
  });
});
