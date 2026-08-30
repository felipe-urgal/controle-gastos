import { describe, expect, it } from "vitest";
import {
  canCompleteTransaction,
  getDuplicateTransactionValues,
} from "@/app/lib/transactions/transaction-quick-actions";
import { TransactionDTO } from "@/app/types/transaction";

const transaction: TransactionDTO = {
  id: "transaction-1",
  amount: 2590,
  type: "EXPENSE",
  description: "Almoço",
  status: "PENDING",
  year: 2026,
  month: 8,
  day: 30,
  account: {
    id: "account-1",
    name: "Conta corrente",
    currency: "BRL",
    type: "CREDIT_DEBIT",
    color: "#000000",
    icon: "wallet",
  },
  category: {
    id: "category-1",
    name: "Alimentação",
    type: "EXPENSE",
    color: "#000000",
    icon: "food",
  },
  createdAt: "2026-08-30T10:00:00.000Z",
  updatedAt: "2026-08-30T10:00:00.000Z",
};

describe("transaction quick actions", () => {
  it("copies only user-editable fields when preparing a duplicate", () => {
    const duplicate = getDuplicateTransactionValues(transaction);

    expect(duplicate).toEqual({
      amount: 2590,
      month: 8,
      year: 2026,
      day: 30,
      description: "Almoço",
      status: "PENDING",
      accountId: "account-1",
      categoryId: "category-1",
    });
    expect(duplicate).not.toHaveProperty("id");
    expect(duplicate).not.toHaveProperty("type");
    expect(duplicate).not.toHaveProperty("createdAt");
    expect(duplicate).not.toHaveProperty("updatedAt");
  });

  it("offers completion only for pending transactions", () => {
    expect(canCompleteTransaction("PENDING")).toBe(true);
    expect(canCompleteTransaction("COMPLETED")).toBe(false);
    expect(canCompleteTransaction("CANCELLED")).toBe(false);
  });
});
