export type MonthlyPlanningAmounts = {
  budget: number | null;
  realized: number;
  committed: number;
  available: number | null;
  consumption: number;
  percentage: number | null;
  isOverBudget: boolean;
};

export function calculateMonthlyPlanningAmounts(args: {
  budget: number | null;
  realized: number;
  committed: number;
}): MonthlyPlanningAmounts {
  const budget = args.budget;
  const realized = Math.max(0, args.realized);
  const committed = Math.max(0, args.committed);
  const consumption = realized + committed;
  const available = budget === null ? null : budget - consumption;
  const percentage =
    budget === null || budget === 0
      ? budget === 0 && consumption > 0
        ? null
        : 0
      : Math.round((consumption / budget) * 1000) / 10;

  return {
    budget,
    realized,
    committed,
    available,
    consumption,
    percentage,
    isOverBudget: budget !== null && consumption > budget,
  };
}

export function summarizeMonthlyPlanning(
  items: readonly MonthlyPlanningAmounts[],
) {
  return items.reduce(
    (summary, item) => ({
      budget:
        summary.budget +
        (item.budget ?? 0),
      realized: summary.realized + item.realized,
      committed: summary.committed + item.committed,
      available:
        summary.available +
        (item.budget ?? 0) -
        item.realized -
        item.committed,
      overBudgetCategories:
        summary.overBudgetCategories + (item.isOverBudget ? 1 : 0),
    }),
    {
      budget: 0,
      realized: 0,
      committed: 0,
      available: 0,
      overBudgetCategories: 0,
    },
  );
}
