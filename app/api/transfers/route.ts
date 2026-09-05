import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";
import { createTransferSchema } from "@/app/schemas/transfer.schema";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createTransferSchema.parse(await request.json());
    const transfer = await createTransferForUser(userId, input);

    return success(transfer, "Transferência criada com sucesso", 201);
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

    console.error("Erro ao criar transferência", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("Não foi possível criar a transferência", 500);
  }
}
