import { describe, expect, it } from "vitest";
import {
  buildLogicalRecurrenceOccurrences,
  generateLogicalRecurrenceDates,
  MAX_RECURRENCE_OCCURRENCES,
} from "@/app/lib/transactions/logical-recurrence";
import { generateMonthlyDates } from "@/app/lib/transactions/monthly-recurrence";

describe("logical recurrence", () => {
  it("preserves the existing monthly semantics exactly for count rules", () => {
    const start = { year: 2027, month: 1, day: 31 };
    const expected = generateMonthlyDates(start, {
      mode: "count",
      occurrences: 8,
    });

    expect(
      generateLogicalRecurrenceDates(start, {
        frequency: "MONTHLY",
        interval: 1,
        mode: "count",
        occurrences: 8,
      })
    ).toEqual(expected);
  });

  it("preserves the existing monthly semantics exactly for end-date rules", () => {
    const start = { year: 2028, month: 1, day: 30 };
    const endDate = { year: 2028, month: 6, day: 30 };

    expect(
      generateLogicalRecurrenceDates(start, {
        frequency: "MONTHLY",
        interval: 1,
        mode: "endDate",
        endDate,
      })
    ).toEqual(generateMonthlyDates(start, { mode: "endDate", endDate }));
  });

  it("supports weekly recurrence across month and year boundaries", () => {
    expect(
      generateLogicalRecurrenceDates(
        { year: 2026, month: 12, day: 27 },
        {
          frequency: "WEEKLY",
          interval: 1,
          mode: "count",
          occurrences: 3,
        }
      )
    ).toEqual([
      { year: 2026, month: 12, day: 27 },
      { year: 2027, month: 1, day: 3 },
      { year: 2027, month: 1, day: 10 },
    ]);
  });

  it("represents biweekly as weekly interval two", () => {
    expect(
      generateLogicalRecurrenceDates(
        { year: 2026, month: 9, day: 1 },
        {
          frequency: "WEEKLY",
          interval: 2,
          mode: "count",
          occurrences: 3,
        }
      )
    ).toEqual([
      { year: 2026, month: 9, day: 1 },
      { year: 2026, month: 9, day: 15 },
      { year: 2026, month: 9, day: 29 },
    ]);
  });

  it("represents quarterly as monthly interval three while preserving the original anchor", () => {
    expect(
      generateLogicalRecurrenceDates(
        { year: 2027, month: 1, day: 31 },
        {
          frequency: "MONTHLY",
          interval: 3,
          mode: "count",
          occurrences: 4,
        }
      )
    ).toEqual([
      { year: 2027, month: 1, day: 31 },
      { year: 2027, month: 4, day: 30 },
      { year: 2027, month: 7, day: 31 },
      { year: 2027, month: 10, day: 31 },
    ]);
  });

  it("clamps annual February 29 to February end without cumulative drift", () => {
    expect(
      generateLogicalRecurrenceDates(
        { year: 2028, month: 2, day: 29 },
        {
          frequency: "YEARLY",
          interval: 1,
          mode: "count",
          occurrences: 5,
        }
      )
    ).toEqual([
      { year: 2028, month: 2, day: 29 },
      { year: 2029, month: 2, day: 28 },
      { year: 2030, month: 2, day: 28 },
      { year: 2031, month: 2, day: 28 },
      { year: 2032, month: 2, day: 29 },
    ]);
  });

  it("uses an inclusive end date and stops before a later non-occurrence date", () => {
    expect(
      generateLogicalRecurrenceDates(
        { year: 2026, month: 9, day: 1 },
        {
          frequency: "WEEKLY",
          interval: 2,
          mode: "endDate",
          endDate: { year: 2026, month: 10, day: 1 },
        }
      )
    ).toEqual([
      { year: 2026, month: 9, day: 1 },
      { year: 2026, month: 9, day: 15 },
      { year: 2026, month: 9, day: 29 },
    ]);
  });

  it("keeps the selected status only on the first concrete occurrence", () => {
    expect(
      buildLogicalRecurrenceOccurrences({
        start: { year: 2026, month: 9, day: 1 },
        rule: {
          frequency: "WEEKLY",
          interval: 1,
          mode: "count",
          occurrences: 3,
        },
        firstStatus: "COMPLETED",
      }).map((occurrence) => occurrence.status)
    ).toEqual(["COMPLETED", "PENDING", "PENDING"]);
  });

  it("enforces the bounded MVP intervals and occurrence limit", () => {
    expect(() =>
      generateLogicalRecurrenceDates(
        { year: 2026, month: 9, day: 1 },
        {
          frequency: "WEEKLY",
          interval: 3,
          mode: "count",
          occurrences: 2,
        }
      )
    ).toThrow("fora do MVP");

    expect(() =>
      generateLogicalRecurrenceDates(
        { year: 2026, month: 9, day: 1 },
        {
          frequency: "MONTHLY",
          interval: 1,
          mode: "count",
          occurrences: MAX_RECURRENCE_OCCURRENCES + 1,
        }
      )
    ).toThrow();
  });
});
