import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import {
  deleteTransferForUser,
  updateTransferForUser,
} from "@/app/lib/transfers/lifecycle-transfer";
import { getTransferForUser } from "@/app/lib/transfers/read-transfer";
import { updateTransferSchema } from "@/app/schemas/transfer.schema";

type TransferRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context?: TransferRouteContext,
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) {
      return failure("Transferência não encontrada", 404);
    }

    const { id } = await context.params;
    const transfer = await getTransferForUser(userId, id);
    return success(transfer, "Transferência carregada com sucesso");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status);
    }

    return failure("Não foi possível carregar a transferência", 500);
  }
}

export async function PATCH(
  request: Request,
  context?: TransferRouteContext,
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) {
      return failure("Transferência não encontrada", 404);
    }

    const { id } = await context.params;
    const input = updateTransferSchema.parse(await request.json());
    const transfer = await updateTransferForUser(userId, id, input);

    return success(
      transfer,
      input.status === "CANCELLED"
        ? "Transferência cancelada com sucesso"
        : "Transferência atualizada com sucesso",
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

    console.error("Erro ao atualizar transferência", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("Não foi possível atualizar a transferência", 500);
  }
}

export async function DELETE(
  _request: Request,
  context?: TransferRouteContext,
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) {
      return failure("Transferência não encontrada", 404);
    }

    const { id } = await context.params;
    const transfer = await deleteTransferForUser(userId, id);

    return success(transfer, "Transferência removida com sucesso");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status);
    }

    console.error("Erro ao remover transferência", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("Não foi possível remover a transferência", 500);
  }
}
