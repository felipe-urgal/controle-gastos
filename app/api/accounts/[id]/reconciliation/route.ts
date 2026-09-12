import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { confirmAccountReconciliationForUser } from "@/app/lib/transactions/reconciliation-confirm";
import { getAccountReconciliationPreview } from "@/app/lib/transactions/reconciliation-preview";
import { accountReconciliationPreviewSchema } from "@/app/lib/transactions/reconciliation-schema";

export const GET = getAccountReconciliationPreview;

type ReconciliationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context?: ReconciliationRouteContext,
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) {
      return failure("Conta não encontrada", 404);
    }

    const { id } = await context.params;
    const input = accountReconciliationPreviewSchema.parse(await request.json());
    const result = await confirmAccountReconciliationForUser(userId, id, input);

    return success(result, "Reconciliação confirmada com sucesso");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status);
    }

    return failure("Erro ao confirmar reconciliação da conta", 500);
  }
}
