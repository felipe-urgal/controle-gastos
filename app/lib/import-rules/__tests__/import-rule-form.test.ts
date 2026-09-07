import { describe, expect, it } from "vitest";

import {
  emptyImportRuleForm,
  importRuleFormToInput,
  importRuleModelToInput,
  importRuleToFormState,
} from "@/app/lib/import-rules/import-rule-form";
import type { ImportRuleModel } from "@/app/types/import-rule";

const rule: ImportRuleModel = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Mercado",
  isActive: true,
  priority: 20,
  accountId: null,
  transactionType: "EXPENSE",
  descriptionOperator: "CONTAINS",
  descriptionPattern: "mercado",
  minAmountCents: 1000,
  maxAmountCents: 50_000,
  categoryId: "22222222-2222-4222-8222-222222222222",
  normalizedDescription: "Supermercado",
  createdAt: "2026-09-07T12:00:00.000Z",
  updatedAt: "2026-09-07T12:00:00.000Z",
};

describe("import-rule-form", () => {
  it("converts a form to the canonical complete API payload", () => {
    const form = {
      ...emptyImportRuleForm(30),
      name: "  Salário  ",
      accountId: "33333333-3333-4333-8333-333333333333",
      transactionType: "INCOME" as const,
      descriptionOperator: "STARTS_WITH" as const,
      descriptionPattern: "  pagamento  ",
      minAmountCents: "10000",
      maxAmountCents: "",
      categoryId: "44444444-4444-4444-8444-444444444444",
      normalizedDescription: "  Salário mensal  ",
    };

    expect(importRuleFormToInput(form)).toEqual({
      name: "Salário",
      isActive: true,
      priority: 30,
      accountId: "33333333-3333-4333-8333-333333333333",
      transactionType: "INCOME",
      descriptionOperator: "STARTS_WITH",
      descriptionPattern: "pagamento",
      minAmountCents: 10_000,
      maxAmountCents: null,
      categoryId: "44444444-4444-4444-8444-444444444444",
      normalizedDescription: "Salário mensal",
    });
  });

  it("rejects fractional, negative and inverted amount bounds before submit", () => {
    const base = {
      ...emptyImportRuleForm(),
      name: "Regra",
      descriptionPattern: "teste",
      categoryId: "44444444-4444-4444-8444-444444444444",
    };

    expect(() =>
      importRuleFormToInput({ ...base, minAmountCents: "1.5" }),
    ).toThrow("Valor mínimo deve ser um número inteiro");
    expect(() =>
      importRuleFormToInput({ ...base, minAmountCents: "-1" }),
    ).toThrow("Valor mínimo não pode ser negativo");
    expect(() =>
      importRuleFormToInput({
        ...base,
        minAmountCents: "200",
        maxAmountCents: "100",
      }),
    ).toThrow("Valor máximo deve ser maior ou igual ao mínimo");
  });

  it("round-trips persisted values and builds a complete toggle payload", () => {
    expect(importRuleToFormState(rule)).toMatchObject({
      name: "Mercado",
      priority: "20",
      minAmountCents: "1000",
      maxAmountCents: "50000",
      normalizedDescription: "Supermercado",
    });

    expect(importRuleModelToInput(rule, { isActive: false })).toEqual({
      name: "Mercado",
      isActive: false,
      priority: 20,
      accountId: null,
      transactionType: "EXPENSE",
      descriptionOperator: "CONTAINS",
      descriptionPattern: "mercado",
      minAmountCents: 1000,
      maxAmountCents: 50_000,
      categoryId: "22222222-2222-4222-8222-222222222222",
      normalizedDescription: "Supermercado",
    });
  });
});
