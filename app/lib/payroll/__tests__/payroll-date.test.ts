import { describe, expect, it } from "vitest";

import {
  lastClosedPayrollYear,
  logicalDateParts,
} from "@/app/lib/payroll/payroll-date";

describe("payroll logical date", () => {
  it("uses Sao Paulo local year across the UTC new-year boundary", () => {
    const beforeLocalMidnight = new Date("2027-01-01T01:30:00.000Z");
    expect(logicalDateParts(beforeLocalMidnight)).toMatchObject({
      year: 2026,
      month: 12,
      day: 31,
    });
    expect(lastClosedPayrollYear(beforeLocalMidnight)).toBe(2025);

    const afterLocalMidnight = new Date("2027-01-01T03:30:00.000Z");
    expect(logicalDateParts(afterLocalMidnight)).toMatchObject({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(lastClosedPayrollYear(afterLocalMidnight)).toBe(2026);
  });

  it("keeps payroll competence represented as year/month parts", () => {
    expect(logicalDateParts(new Date("2026-12-15T15:00:00.000Z"))).toEqual({
      year: 2026,
      month: 12,
      day: 15,
    });
  });
});
