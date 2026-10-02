import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getPayrollCompetenceSummaries } from "@/app/lib/payroll/payroll-reconciliation";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await getPayrollCompetenceSummaries(userId));
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    return failure("Não foi possível consolidar os rendimentos da competência", 500);
  }
}
