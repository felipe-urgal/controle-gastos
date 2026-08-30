import { describe, expect, it } from "vitest";

import {
  buildInstallmentOccurrences,
  splitInstallmentAmounts,
} from "@/app/lib/transactions/installments";

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

describe("installment amount distribution", () => {
  it("splits an exact total without changing cents", () => {
    const amounts = splitInstallmentAmounts(12_000, 3);

    expect(amounts).toEqual([4_000, 4_000, 4_000]);
    expect(sum(amounts)).toBe(12_000);
  });

  it("distributes remainder cents deterministically to first installments", () => {
    const amounts = splitInstallmentAmounts(10_001, 3);

    expect(amounts).toEqual([3_334, 3_334, 3_333]);
    expect(sum(amounts)).toBe(10_001);
  });

  it("accepts the 2 and 60 installment limits", () => {
    expect(splitInstallmentAmounts(200, 2)).toHaveLength(2);
    expect(splitInstallmentAmounts(6_000, 60)).toHaveLength(60);
  });

  it("rejects counts outside the supported range", () => {
    expect(() => splitInstallmentAmounts(100, 1)).toThrow(/entre 2 e 60/);
    expect(() => splitInstallmentAmounts(6_100, 61)).toThrow(/entre 2 e 60/);
  });

  it("rejects totals that cannot preserve at least one cent per installment", () => {
    expect(() => splitInstallmentAmounts(2, 3)).toThrow(/1 centavo por parcela/);
  });
});

describe("installment occurrence generation", () => {
  it("preserves the anchor day with valid month-end fallback and year rollover", () => {
    const occurrences = buildInstallmentOccurrences({
      totalCents: 4_000,
      count: 4,
      start: { year: 2027, month: 12, day: 31 },
      firstStatus: "COMPLETED",
    });

    expect(
      occurrences.map(({ year, month, day, status, index }) => ({
        year,
        month,
        day,
        status,
        index,
      }))
    ).toEqual([
      { year: 2027, month: 12, day: 31, status: "COMPLETED", index: 1 },
      { year: 2028, month: 1, day: 31, status: "PENDING", index: 2 },
      { year: 2028, month: 2, day: 29, status: "PENDING", index: 3 },
      { year: 2028, month: 3, day: 31, status: "PENDING", index: 4 },
    ]);
  });

  it("keeps only the first installment with the selected status", () => {
    const occurrences = buildInstallmentOccurrences({
      totalCents: 300,
      count: 3,
      start: { year: 2028, month: 4, day: 30 },
      firstStatus: "CANCELLED",
    });

    expect(occurrences.map((item) => item.status)).toEqual([
      "CANCELLED",
      "PENDING",
      "PENDING",
    ]);
  });
});
