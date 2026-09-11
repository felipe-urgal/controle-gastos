import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { undoAccountReconciliationForUser } from "@/app/lib/transactions/reconciliation-undo";
import { undoAccountReconciliationSchema } from "@/app/schemas/reconciliation.schema";

type ReconciliationUndoRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context?: ReconciliationUndoRouteContext,
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) {
      return failure("Conta não encontrada", 404);
    }

    const { id } = await context.params;
    const input = undoAccountReconciliationSchema.parse(await request.json());
    const result = await undoAccountReconciliationForUser(userId, id, input);

    return success(
      result,
      result.idempotent
        ? "Fechamento já estava desfeito"
        : "Fechamento desfeito com sucesso",
    );
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

    return failure("Erro ao desfazer reconciliação da conta", 500);
  }
}
