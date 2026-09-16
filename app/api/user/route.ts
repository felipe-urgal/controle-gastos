import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { asInputRecord, stringInput } from "@/app/lib/auth/auth-input";
import { isHttpError } from "@/app/lib/http-error";
import { verifyStepUpAuth } from "@/app/lib/security/step-up-auth";
import { deleteUser } from "@/app/lib/users/delete-user";
import { userCrud } from "@/app/lib/users/user-crud";

export const GET = userCrud.getById;
export const PATCH = userCrud.update;

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await parseJsonBody(request);
    const payload = asInputRecord(body);
    const currentPassword = stringInput(payload, "currentPassword") ?? "";
    const token = stringInput(payload, "token")?.trim();
    const recoveryCode = stringInput(payload, "recoveryCode")?.trim();

    if (!currentPassword) {
      return failure(
        "Senha atual é obrigatória",
        400,
        "CURRENT_PASSWORD_REQUIRED",
      );
    }

    await verifyStepUpAuth({
      request,
      userId,
      currentPassword,
      token,
      recoveryCode,
    });
    await deleteUser(userId);

    const response = success(null, "Conta excluída com sucesso");
    response.cookies.delete("token");
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Erro ao excluir conta", 500);
  }
}
