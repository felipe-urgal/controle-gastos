import { describe, expect, it } from "vitest";

import {
  calculateGoalPercentage,
  monthlyContributionSuggestion,
} from "@/app/lib/goals/financial-goal-domain";

describe("financial goal calculations", () => {
  it("keeps percentage deterministic for values above and below target", () => {
    expect(calculateGoalPercentage(1_500, 10_000)).toBe(15);
    expect(calculateGoalPercentage(12_000, 10_000)).toBe(120);
  });

  it("returns a deterministic monthly suggestion only for a future deadline", () => {
    expect(
      monthlyContributionSuggestion({
        currentAmount: 20_000,
        targetAmount: 100_000,
        targetYear: 2027,
        targetMonth: 4,
        targetDay: 30,
        now: new Date("2027-01-15T12:00:00.000Z"),
      }),
    ).toBe(20_000);

    expect(
      monthlyContributionSuggestion({
        currentAmount: 20_000,
        targetAmount: 100_000,
        targetYear: 2026,
        targetMonth: 12,
        targetDay: 31,
        now: new Date("2027-01-15T12:00:00.000Z"),
      }),
    ).toBeNull();
  });
});
