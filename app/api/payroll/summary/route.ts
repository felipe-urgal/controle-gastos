import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getPayrollCompetenceSummaryPage } from "@/app/lib/payroll/payroll-reconciliation";
import {
  payrollPageSchema,
  payrollSearchParams,
} from "@/app/lib/payroll/payroll-query";

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const query = payrollPageSchema.parse(payrollSearchParams(request));
    return success(await getPayrollCompetenceSummaryPage(userId, query));
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Filtros inválidos", 400);
    }
    return failure("Não foi possível consolidar os rendimentos da competência", 500);
  }
}
