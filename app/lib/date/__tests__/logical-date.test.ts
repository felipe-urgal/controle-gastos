import { describe, expect, it } from "vitest";

import {
  compareLogicalDates,
  formatIsoLogicalDate,
  logicalDateFromUtcInstant,
  formatPtBrLogicalDate,
  getLastDayOfMonth,
  isValidLogicalDate,
  parseIsoLogicalDate,
} from "@/app/lib/date/logical-date";

describe("logical date primitives", () => {
  it("validates calendar dates without depending on process timezone", () => {
    expect(isValidLogicalDate({ year: 2028, month: 2, day: 29 })).toBe(true);
    expect(isValidLogicalDate({ year: 2027, month: 2, day: 29 })).toBe(false);
    expect(getLastDayOfMonth(2028, 2)).toBe(29);
  });

  it("parses and formats the strict ISO contract", () => {
    expect(parseIsoLogicalDate("2028-02-29")).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
    expect(parseIsoLogicalDate("2028-2-29")).toBeNull();
    expect(parseIsoLogicalDate("2027-02-29")).toBeNull();

    const date = { year: 2028, month: 2, day: 9 };
    expect(formatIsoLogicalDate(date)).toBe("2028-02-09");
    expect(formatPtBrLogicalDate(date)).toBe("09/02/2028");
  });

  it("uses UTC as the canonical date across the local midnight boundary", () => {
    expect(
      logicalDateFromUtcInstant(
        new Date("2026-12-31T23:30:00-03:00"),
      ),
    ).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
  });

  it("crosses December to January deterministically", () => {
    expect(
      logicalDateFromUtcInstant(
        new Date("2027-01-01T00:00:00.000Z"),
      ),
    ).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
  });

  it("compares logical dates deterministically", () => {
    expect(
      compareLogicalDates(
        { year: 2028, month: 2, day: 9 },
        { year: 2028, month: 2, day: 10 },
      ),
    ).toBe(-1);
    expect(
      compareLogicalDates(
        { year: 2028, month: 2, day: 10 },
        { year: 2028, month: 2, day: 10 },
      ),
    ).toBe(0);
  });
});
