import { describe, expect, it } from "vitest";

import {
  calculateGoalPercentage,
  incomeShareSuggestion,
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

describe("incomeShareSuggestion", () => {
  it("rende o percentual da receita do mês, abate o que já foi aportado e nunca fica negativo", () => {
    expect(incomeShareSuggestion({ percent: 10, monthIncome: 500_000, contributedThisMonth: 0 })).toEqual({
      percent: 10,
      monthIncome: 500_000,
      suggested: 50_000,
      contributedThisMonth: 0,
      remaining: 50_000,
    });
    expect(incomeShareSuggestion({ percent: 10, monthIncome: 500_000, contributedThisMonth: 20_000 })?.remaining).toBe(30_000);
    expect(incomeShareSuggestion({ percent: 10, monthIncome: 500_000, contributedThisMonth: 80_000 })?.remaining).toBe(0);
    // centavos inteiros: arredonda para baixo.
    expect(incomeShareSuggestion({ percent: 33, monthIncome: 1_001, contributedThisMonth: 0 })?.suggested).toBe(330);
  });

  it("sem percentual ou sem receita no mês não há sugestão", () => {
    expect(incomeShareSuggestion({ percent: null, monthIncome: 500_000, contributedThisMonth: 0 })).toBeNull();
    expect(incomeShareSuggestion({ percent: 10, monthIncome: 0, contributedThisMonth: 0 })).toBeNull();
  });
});
