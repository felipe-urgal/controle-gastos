import { describe, expect, it } from "vitest";
import {
  buildMonthlyOccurrences,
  generateMonthlyDates,
  MAX_MONTHLY_OCCURRENCES,
} from "@/app/lib/transactions/monthly-recurrence";

describe("monthly recurrence", () => {
  it("preserves common days across months", () => {
    expect(
      generateMonthlyDates(
        { year: 2026, month: 8, day: 15 },
        { mode: "count", occurrences: 4 }
      )
    ).toEqual([
      { year: 2026, month: 8, day: 15 },
      { year: 2026, month: 9, day: 15 },
      { year: 2026, month: 10, day: 15 },
      { year: 2026, month: 11, day: 15 },
    ]);
  });

  it("uses the last valid day while preserving the original anchor", () => {
    expect(
      generateMonthlyDates(
        { year: 2027, month: 1, day: 31 },
        { mode: "count", occurrences: 4 }
      )
    ).toEqual([
      { year: 2027, month: 1, day: 31 },
      { year: 2027, month: 2, day: 28 },
      { year: 2027, month: 3, day: 31 },
      { year: 2027, month: 4, day: 30 },
    ]);
  });

  it("handles leap-year February for anchors 29, 30 and 31", () => {
    expect(
      generateMonthlyDates(
        { year: 2028, month: 1, day: 29 },
        { mode: "count", occurrences: 2 }
      )[1]
    ).toEqual({ year: 2028, month: 2, day: 29 });

    expect(
      generateMonthlyDates(
        { year: 2028, month: 1, day: 30 },
        { mode: "count", occurrences: 2 }
      )[1]
    ).toEqual({ year: 2028, month: 2, day: 29 });

    expect(
      generateMonthlyDates(
        { year: 2028, month: 1, day: 31 },
        { mode: "count", occurrences: 2 }
      )[1]
    ).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it("supports an inclusive end date", () => {
    expect(
      generateMonthlyDates(
        { year: 2026, month: 8, day: 30 },
        {
          mode: "endDate",
          endDate: { year: 2026, month: 11, day: 30 },
        }
      )
    ).toEqual([
      { year: 2026, month: 8, day: 30 },
      { year: 2026, month: 9, day: 30 },
      { year: 2026, month: 10, day: 30 },
      { year: 2026, month: 11, day: 30 },
    ]);
  });

  it("rejects invalid ranges and more than 60 occurrences", () => {
    expect(() =>
      generateMonthlyDates(
        { year: 2026, month: 8, day: 30 },
        { mode: "count", occurrences: 1 }
      )
    ).toThrow();

    expect(() =>
      generateMonthlyDates(
        { year: 2026, month: 8, day: 30 },
        { mode: "count", occurrences: MAX_MONTHLY_OCCURRENCES + 1 }
      )
    ).toThrow();

    expect(() =>
      generateMonthlyDates(
        { year: 2026, month: 8, day: 30 },
        {
          mode: "endDate",
          endDate: { year: 2026, month: 8, day: 30 },
        }
      )
    ).toThrow();
  });

  it("keeps the selected status only on the first occurrence", () => {
    expect(
      buildMonthlyOccurrences({
        start: { year: 2026, month: 8, day: 30 },
        rule: { mode: "count", occurrences: 3 },
        firstStatus: "COMPLETED",
      }).map((occurrence) => occurrence.status)
    ).toEqual(["COMPLETED", "PENDING", "PENDING"]);

    expect(
      buildMonthlyOccurrences({
        start: { year: 2026, month: 8, day: 30 },
        rule: { mode: "count", occurrences: 3 },
        firstStatus: "CANCELLED",
      }).map((occurrence) => occurrence.status)
    ).toEqual(["CANCELLED", "PENDING", "PENDING"]);
  });
});
