import { describe, expect, it } from "vitest";

import {
  analyzeTransactionTemplateSource,
  transactionToTemplateInput,
} from "@/app/lib/templates/transaction-template-mapping";
import type {
  TransactionDTO,
  TransactionStatus,
} from "@/app/types/transaction";

function sourceTransaction(
  status: TransactionStatus,
  overrides: Partial<TransactionDTO> = {},
): TransactionDTO {
  return {
    id: "transaction-1",
    amount: 12_345,
    type: "EXPENSE",
    kind: "NORMAL",
    description: "Almoço",
    status,
    reconciliationStatus: "UNCLEARED",
    reconciledAt: null,
    year: 2026,
    month: 10,
    day: 6,
    account: {
      id: "account-1",
      name: "Conta",
      currency: "BRL",
      type: "CREDIT_DEBIT",
      color: null,
      icon: null,
    },
    category: {
      id: "category-1",
      name: "Alimentação",
      type: "EXPENSE",
      color: "#000000",
      icon: "tag",
    },
    merchant: null,
    allocations: [],
    tags: [],
    series: null,
    seriesIndex: null,
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("transaction template source mapping", () => {
  it.each(["COMPLETED", "PENDING", "CANCELLED"] as const)(
    "never copies operational status %s",
    (status) => {
      const input = transactionToTemplateInput(sourceTransaction(status));

      expect(input).not.toHaveProperty("status");
      expect(input).toMatchObject({
        name: "Almoço",
        type: "EXPENSE",
        amount: 12_345,
        accountId: "account-1",
        categoryId: "category-1",
      });
    },
  );

  it("blocks a source transaction with allocations instead of flattening it", () => {
    const transaction = sourceTransaction("COMPLETED", {
      allocations: [
        {
          id: "allocation-1",
          amount: 6_000,
          category: {
            id: "category-1",
            name: "Alimentação",
            type: "EXPENSE",
            color: "#000000",
            icon: "tag",
          },
        },
        {
          id: "allocation-2",
          amount: 6_345,
          category: {
            id: "category-2",
            name: "Lazer",
            type: "EXPENSE",
            color: "#111111",
            icon: "tag",
          },
        },
      ],
    });

    expect(() => analyzeTransactionTemplateSource(transaction)).toThrow(
      /divisão entre categorias/,
    );
  });

  it("warns when merchant and tags will not be copied", () => {
    const analysis = analyzeTransactionTemplateSource(
      sourceTransaction("COMPLETED", {
        merchant: {
          id: "merchant-1",
          name: "Restaurante",
          isActive: true,
        },
        tags: [
          { id: "tag-1", name: "Trabalho", isActive: true },
        ],
      }),
    );

    expect(analysis.input).not.toHaveProperty("merchantId");
    expect(analysis.input).not.toHaveProperty("tagIds");
    expect(analysis.notices).toContain(
      "Estabelecimento e tags não serão salvos no Modelo. Eles deverão ser escolhidos novamente ao usar.",
    );
  });

  it.each(["RECURRING", "INSTALLMENT"] as const)(
    "explains that a %s occurrence becomes only a simple template",
    (seriesType) => {
      const analysis = analyzeTransactionTemplateSource(
        sourceTransaction("COMPLETED", {
          series: {
            id: "series-1",
            type: seriesType,
            frequency: "MONTHLY",
            interval: 1,
            description: null,
            anchorDay: 6,
            occurrenceCount: 12,
            start: { year: 2026, month: 1, day: 6 },
            end: { year: 2026, month: 12, day: 6 },
          },
          seriesIndex: 1,
        }),
      );

      expect(analysis.notices).toContain(
        "Será salvo apenas este lançamento como Modelo simples. Recorrência e parcelamento não serão copiados.",
      );
    },
  );
});

describe("templateToTransactionInitialValues", () => {
  const baseTemplate = {
    id: "template-1",
    name: "Almoço",
    type: "EXPENSE" as const,
    description: "Almoço",
    amount: 12_345,
    isFavorite: false,
    position: 0,
    account: {
      id: "account-1",
      name: "Conta",
      currency: "BRL",
      isActive: true,
    },
    category: {
      id: "category-1",
      name: "Alimentação",
      type: "EXPENSE" as const,
      isActive: true,
    },
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
  };

  it("keeps active references selected", async () => {
    const { templateToTransactionInitialValues } = await import(
      "@/app/lib/templates/transaction-template-mapping"
    );
    const result = templateToTransactionInitialValues(baseTemplate, {
      year: 2026,
      month: 10,
      day: 6,
    });

    expect(result.values.accountId).toBe("account-1");
    expect(result.values.categoryId).toBe("category-1");
    expect(result.warnings).toEqual([]);
  });

  it("clears inactive references and keeps their names as warnings", async () => {
    const { templateToTransactionInitialValues } = await import(
      "@/app/lib/templates/transaction-template-mapping"
    );
    const result = templateToTransactionInitialValues(
      {
        ...baseTemplate,
        account: { ...baseTemplate.account, isActive: false },
        category: { ...baseTemplate.category, isActive: false },
      },
      { year: 2026, month: 10, day: 6 },
    );

    expect(result.values.accountId).toBe("");
    expect(result.values.categoryId).toBe("");
    expect(result.warnings).toEqual([
      "Conta inativa: Conta. Escolha outra conta antes de confirmar.",
      "Categoria inativa: Alimentação. Escolha outra categoria antes de confirmar.",
    ]);
  });

  it("stays usable when an account reference was removed with SET NULL", async () => {
    const { templateToTransactionInitialValues } = await import(
      "@/app/lib/templates/transaction-template-mapping"
    );
    const result = templateToTransactionInitialValues(
      { ...baseTemplate, account: null },
      { year: 2026, month: 10, day: 6 },
    );

    expect(result.values.accountId).toBe("");
    expect(result.values.categoryId).toBe("category-1");
  });
});
