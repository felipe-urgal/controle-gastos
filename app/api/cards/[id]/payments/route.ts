import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId, isUnauthorizedError } from "@/app/lib/auth";
import { payCreditCardStatementSchema } from "@/app/lib/cards/credit-card-payment-schema";
import { payCreditCardStatementForUser } from "@/app/lib/cards/pay-credit-card-statement";
import { isHttpError } from "@/app/lib/http-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return failure("Idempotency-Key obrigatório", 400);
    }

    const { id } = await context.params;
    const input = payCreditCardStatementSchema.parse(await parseJsonBody(request));
    const result = await payCreditCardStatementForUser(
      userId,
      id,
      input,
      idempotencyKey,
    );
    const { replayed, ...payment } = result;

    return success(
      payment,
      replayed
        ? "Pagamento já realizado anteriormente"
        : "Fatura paga com sucesso",
      replayed ? 200 : 201,
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Não foi possível pagar a fatura", 500);
  }
}
