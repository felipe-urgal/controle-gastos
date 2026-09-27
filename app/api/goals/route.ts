import {
  createFinancialGoal,
  getFinancialGoals,
} from "@/app/lib/goals/financial-goals";

export const GET = getFinancialGoals;
export const POST = createFinancialGoal;
