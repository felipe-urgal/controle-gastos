import {
  removeInvestmentOperation,
  updateInvestmentOperationFiscalEvent,
} from "@/app/lib/investments/investments";

export const PATCH = updateInvestmentOperationFiscalEvent;
export const DELETE = removeInvestmentOperation;
