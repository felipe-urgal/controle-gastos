import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { isHttpError } from "@/app/lib/http-error";
import { SENSITIVE_ACTIONS } from "@/app/lib/security/sensitive-actions";
import { consumeStepUpRateLimit } from "@/app/lib/security/step-up-auth";
import { disableTotp } from "@/app/lib/security/totp-disable";

export async function DELETE(request: Request) {
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
    const hasTotp = Boolean(token?.trim());
    const hasRecovery = Boolean(recoveryCode?.trim());

    if (!currentPassword) {
      return failure("Senha atual é obrigatória", 400, "CURRENT_PASSWORD_REQUIRED");
    }
    if (hasTotp === hasRecovery) {
      return failure(
        "Informe exatamente um segundo fator",
        400,
        "MFA_FACTOR_REQUIRED"
      );
    }

    await consumeStepUpRateLimit({
      request,
      userId,
      action: SENSITIVE_ACTIONS.MFA_DISABLE,
    });

    const result = await disableTotp({
      userId,
      currentPassword,
      token,
      recoveryCode,
    });
    return success(result, "2FA desativado com sucesso");
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Erro ao desativar 2FA", 500);
  }
}
