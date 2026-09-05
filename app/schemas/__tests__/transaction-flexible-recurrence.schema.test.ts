import { describe, expect, it } from "vitest";

import { createFlexibleRecurringTransactionSchema } from "@/app/schemas/transaction-flexible-recurrence.schema";

const transaction = {
  categoryId: "22222222-2222-4222-8222-222222222222",
  amount: 12_345,
  description: "Recorrência",
  year: 2028,
  month: 2,
  day: 29,
  accountId: "11111111-1111-4111-8111-111111111111",
  status: "COMPLETED" as const,
  type: "EXPENSE" as const,
};

describe("flexible recurring transaction schema", () => {
  it.each([
    ["WEEKLY", 1],
    ["WEEKLY", 2],
    ["MONTHLY", 1],
    ["MONTHLY", 3],
    ["YEARLY", 1],
  ] as const)("accepts %s interval %s", (frequency, interval) => {
    const parsed = createFlexibleRecurringTransactionSchema.parse({
      transaction,
      recurrence: {
        frequency,
        interval,
        mode: "count",
        occurrences: 12,
      },
    });

    expect(parsed.recurrence).toMatchObject({ frequency, interval });
  });

  it.each([
    ["WEEKLY", 3],
    ["MONTHLY", 2],
    ["YEARLY", 2],
  ] as const)("rejects %s interval %s outside the MVP", (frequency, interval) => {
    const result = createFlexibleRecurringTransactionSchema.safeParse({
      transaction,
      recurrence: {
        frequency,
        interval,
        mode: "count",
        occurrences: 2,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["recurrence", "interval"]);
    }
  });

  it("preserves count bounds", () => {
    expect(
      createFlexibleRecurringTransactionSchema.safeParse({
        transaction,
        recurrence: {
          frequency: "MONTHLY",
          interval: 1,
          mode: "count",
          occurrences: 1,
        },
      }).success
    ).toBe(false);

    expect(
      createFlexibleRecurringTransactionSchema.safeParse({
        transaction,
        recurrence: {
          frequency: "MONTHLY",
          interval: 1,
          mode: "count",
          occurrences: 61,
        },
      }).success
    ).toBe(false);
  });

  it("accepts a valid logical end date and rejects impossible dates", () => {
    expect(
      createFlexibleRecurringTransactionSchema.parse({
        transaction,
        recurrence: {
          frequency: "YEARLY",
          interval: 1,
          mode: "endDate",
          endDate: "2032-02-29",
        },
      }).recurrence
    ).toMatchObject({ endDate: "2032-02-29" });

    expect(
      createFlexibleRecurringTransactionSchema.safeParse({
        transaction,
        recurrence: {
          frequency: "YEARLY",
          interval: 1,
          mode: "endDate",
          endDate: "2031-02-29",
        },
      }).success
    ).toBe(false);
  });
});
