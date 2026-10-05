import { describe, expect, it } from "vitest";

import { calculateMonthlyPlanningAmounts } from "@/app/lib/category-limits/monthly-planning-domain";

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
