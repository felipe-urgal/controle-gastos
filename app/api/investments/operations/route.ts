import { getInvestmentOperationsHistory } from "@/app/lib/investments/investment-history";
import { createInvestmentOperation } from "@/app/lib/investments/investments";

export const GET = getInvestmentOperationsHistory;
export const POST = createInvestmentOperation;
