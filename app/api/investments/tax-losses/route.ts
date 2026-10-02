import {
  createInvestmentTaxLossAdjustment,
  getInvestmentTaxLossReport,
} from "@/app/lib/investments/investment-tax-loss-report";

export const GET = getInvestmentTaxLossReport;
export const POST = createInvestmentTaxLossAdjustment;
