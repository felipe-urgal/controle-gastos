import { describe, expect, it } from "vitest";

import { calculateMonthlyPlanningAmounts, carriedOverLimit } from "@/app/lib/category-limits/monthly-planning-domain";

describe("monthly planning zero budget", () => {
  it("treats any consumption on an explicit zero budget as over budget", () => {
    expect(
      calculateMonthlyPlanningAmounts({
        budget: 0,
        realized: 100,
        committed: 50,
      }),
    ).toEqual({
      budget: 0,
      realized: 100,
      committed: 50,
      available: -150,
      consumption: 150,
      percentage: null,
      isOverBudget: true,
    });
  });

  it("keeps an unused zero budget distinct from no budget", () => {
    expect(
      calculateMonthlyPlanningAmounts({
        budget: 0,
        realized: 0,
        committed: 0,
      }),
    ).toMatchObject({
      budget: 0,
      percentage: 0,
      isOverBudget: false,
    });

    expect(
      calculateMonthlyPlanningAmounts({
        budget: null,
        realized: 0,
        committed: 0,
      }),
    ).toMatchObject({
      budget: null,
      percentage: 0,
      isOverBudget: false,
    });
  });
});

describe("carriedOverLimit", () => {
  it("soma a sobra, reduz pelo estouro e nunca passa de zero", () => {
    expect(carriedOverLimit({ sourceBudget: 100_000, available: 25_000 })).toBe(125_000);
    expect(carriedOverLimit({ sourceBudget: 100_000, available: -30_000 })).toBe(70_000);
    expect(carriedOverLimit({ sourceBudget: 100_000, available: -250_000 })).toBe(0);
  });

  it("sem limite ou sem saldo no mês de origem não há o que levar", () => {
    expect(carriedOverLimit({ sourceBudget: null, available: 10 })).toBeNull();
    expect(carriedOverLimit({ sourceBudget: 100, available: null })).toBeNull();
  });
});
