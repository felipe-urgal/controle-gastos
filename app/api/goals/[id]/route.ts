import {
  getFinancialGoal,
  removeFinancialGoal,
  updateFinancialGoal,
} from "@/app/lib/goals/financial-goals";

export const GET = getFinancialGoal;
export const PUT = updateFinancialGoal;
export const DELETE = removeFinancialGoal;
