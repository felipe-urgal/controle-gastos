import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { isHttpError } from "@/app/lib/http-error";
import {
  getRecoveryCodeStatus,
  regenerateRecoveryCodes,
} from "@/app/lib/security/totp-recovery";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(
      await getRecoveryCodeStatus(userId),
      "Estado dos códigos de recuperação carregado",
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Erro ao carregar códigos de recuperação", 500);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await parseJsonBody(request)) as {
      currentPassword?: unknown;
      token?: unknown;
      recoveryCode?: unknown;
    };
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const token = typeof body.token === "string" ? body.token : undefined;
    const recoveryCode =
      typeof body.recoveryCode === "string" ? body.recoveryCode : undefined;

    if (!currentPassword) {
      return failure(
        "Senha atual é obrigatória",
        400,
        "CURRENT_PASSWORD_REQUIRED",
      );
    }

    const result = await regenerateRecoveryCodes({
      request,
      userId,
      currentPassword,
      token,
      recoveryCode,
    });

    return success(
      result,
      "Códigos de recuperação regenerados com sucesso",
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Erro ao regenerar códigos de recuperação", 500);
  }
}
