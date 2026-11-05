import type { FinancialGoalEntryType, FinancialGoalStatus } from "@prisma/client";

import { getLastDayOfMonth, logicalDateFromInstant, parseIsoLogicalDate } from "@/app/lib/date/logical-date";

export type GoalProgressTotals = {
  contributions: number;
  withdrawals: number;
  currentAmount: number;
};

export function calculateGoalProgress(
  rows: readonly {
    type: FinancialGoalEntryType;
    _sum: { amount: number | null };
  }[],
): GoalProgressTotals {
  let contributions = 0;
  let withdrawals = 0;

  for (const row of rows) {
    const amount = row._sum.amount ?? 0;
    if (row.type === "CONTRIBUTION") contributions += amount;
    if (row.type === "WITHDRAWAL") withdrawals += amount;
  }

  return {
    contributions,
    withdrawals,
    currentAmount: contributions - withdrawals,
  };
}

export function calculateGoalPercentage(
  currentAmount: number,
  targetAmount: number,
) {
  if (targetAmount <= 0) return 0;
  const scaled = Math.floor((currentAmount * 1000) / targetAmount);
  return scaled / 10;
}

export function calculateGoalRemaining(
  currentAmount: number,
  targetAmount: number,
) {
  return Math.max(0, targetAmount - currentAmount);
}

export function resolveGoalStatus(args: {
  currentAmount: number;
  targetAmount: number;
  requestedStatus?: "ACTIVE" | "ARCHIVED";
  existingStatus?: FinancialGoalStatus;
}): FinancialGoalStatus {
  if (args.requestedStatus === "ARCHIVED") return "ARCHIVED";
  if (args.requestedStatus === "ACTIVE") {
    return args.currentAmount >= args.targetAmount ? "COMPLETED" : "ACTIVE";
  }
  if (args.existingStatus === "ARCHIVED") return "ARCHIVED";
  return args.currentAmount >= args.targetAmount ? "COMPLETED" : "ACTIVE";
}

export function targetDateParts(value?: string | null) {
  if (!value) {
    return { targetYear: null, targetMonth: null, targetDay: null };
  }
  const parsed = parseIsoLogicalDate(value);
  if (!parsed) throw new Error("Data alvo inválida");
  return {
    targetYear: parsed.year,
    targetMonth: parsed.month,
    targetDay: parsed.day,
  };
}

export function targetDateFromParts(goal: {
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
}) {
  if (
    goal.targetYear === null ||
    goal.targetMonth === null ||
    goal.targetDay === null
  ) {
    return null;
  }
  return `${goal.targetYear}-${String(goal.targetMonth).padStart(2, "0")}-${String(goal.targetDay).padStart(2, "0")}`;
}

export function monthlyContributionSuggestion(args: {
  currentAmount: number;
  targetAmount: number;
  targetYear: number | null;
  targetMonth: number | null;
  targetDay: number | null;
  now?: Date;
}) {
  const remaining = calculateGoalRemaining(args.currentAmount, args.targetAmount);
  if (
    remaining === 0 ||
    args.targetYear === null ||
    args.targetMonth === null ||
    args.targetDay === null
  ) {
    return null;
  }

  const now = args.now ?? new Date();
  const today = logicalDateFromInstant(now);
  const targetDay = Math.min(
    args.targetDay,
    getLastDayOfMonth(args.targetYear, args.targetMonth),
  );
  const targetNumber =
    args.targetYear * 10000 + args.targetMonth * 100 + targetDay;
  const todayNumber = today.year * 10000 + today.month * 100 + today.day;
  if (targetNumber <= todayNumber) return null;

  const months =
    (args.targetYear - today.year) * 12 +
    (args.targetMonth - today.month) +
    1;
  if (months <= 0) return null;

  return Math.ceil(remaining / months);
}

export type GoalIncomeShare = {
  percent: number;
  /** Receita realizada do mês na moeda da meta (centavos). */
  monthIncome: number;
  /** Quanto o percentual rende sobre a receita do mês. */
  suggested: number;
  /** Aportes já feitos nesta meta no mês. */
  contributedThisMonth: number;
  /** O que ainda falta aportar para chegar na sugestão (nunca negativo). */
  remaining: number;
};

/**
 * Sugestão de aporte: `percent`% da receita realizada do mês, menos o que já foi aportado no mês.
 * Sem percentual ou sem receita no mês não há sugestão (`null`); só sugere, nada é gravado.
 */
export function incomeShareSuggestion(args: {
  percent: number | null;
  monthIncome: number;
  contributedThisMonth: number;
}): GoalIncomeShare | null {
  if (args.percent === null || args.percent <= 0 || args.monthIncome <= 0) return null;
  const suggested = Math.floor((args.monthIncome * args.percent) / 100);
  return {
    percent: args.percent,
    monthIncome: args.monthIncome,
    suggested,
    contributedThisMonth: args.contributedThisMonth,
    remaining: Math.max(0, suggested - args.contributedThisMonth),
  };
}
