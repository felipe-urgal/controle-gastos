import { describe, expect, it } from "vitest";

import { transactionToTemplateInput } from "@/app/lib/templates/transaction-template-mapping";
import type {
  TransactionDTO,
  TransactionStatus,
} from "@/app/types/transaction";

function sourceTransaction(status: TransactionStatus): TransactionDTO {
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
  };
}

describe("transactionToTemplateInput", () => {
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
});
