import { describe, expect, it } from "vitest";

import { transactionTemplateCreateSchema } from "@/app/lib/templates/transaction-template-schema";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from "@/app/lib/transactions/transaction-field-contract";

describe("transaction template schema", () => {
  it("accepts optional template fields", () => {
    expect(
      transactionTemplateCreateSchema.parse({
        name: "Almoço",
        type: "EXPENSE",
      }),
    ).toMatchObject({
      name: "Almoço",
      type: "EXPENSE",
      description: "",
      status: "COMPLETED",
      isFavorite: false,
      position: 0,
    });
  });

  it("accepts description at the transaction limit", () => {
    const description = "a".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH);

    expect(
      transactionTemplateCreateSchema.parse({
        name: "Limite",
        type: "EXPENSE",
        description,
      }).description,
    ).toBe(description);
  });

  it("rejects description above the transaction limit", () => {
    expect(() =>
      transactionTemplateCreateSchema.parse({
        name: "Limite",
        type: "EXPENSE",
        description: "a".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH + 1),
      }),
    ).toThrow();
  });

  it("accepts the maximum fixed transaction amount", () => {
    expect(
      transactionTemplateCreateSchema.parse({
        name: "Limite",
        type: "EXPENSE",
        amount: TRANSACTION_MAX_AMOUNT_CENTS,
      }).amount,
    ).toBe(TRANSACTION_MAX_AMOUNT_CENTS);
  });

  it("rejects a fixed amount above the transaction limit", () => {
    expect(() =>
      transactionTemplateCreateSchema.parse({
        name: "Limite",
        type: "EXPENSE",
        amount: TRANSACTION_MAX_AMOUNT_CENTS + 1,
      }),
    ).toThrow();
  });

  it("accepts null to choose the amount when using the template", () => {
    expect(
      transactionTemplateCreateSchema.parse({
        name: "Sem valor",
        type: "EXPENSE",
        amount: null,
      }).amount,
    ).toBeNull();
  });

  it.each([0, -1])("rejects non-positive fixed amount %s", (amount) => {
    expect(() =>
      transactionTemplateCreateSchema.parse({
        name: "Inválido",
        type: "EXPENSE",
        amount,
      }),
    ).toThrow();
  });

  it("rejects fractional cents", () => {
    expect(() =>
      transactionTemplateCreateSchema.parse({
        name: "Inválido",
        type: "EXPENSE",
        amount: 100.5,
      }),
    ).toThrow();
  });
});
