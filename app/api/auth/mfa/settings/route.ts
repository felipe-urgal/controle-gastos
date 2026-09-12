import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { getRequestIp } from "@/app/lib/auth/auth-rate-limit";
import { isHttpError } from "@/app/lib/http-error";
import {
  clearMfaLoginPrincipalRateLimit,
  consumeMfaLoginRateLimit,
} from "@/app/lib/security/mfa-rate-limit";
import { disableTotp } from "@/app/lib/security/totp-disable";

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await request.json()) as {
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

    const limit = await consumeMfaLoginRateLimit({
      userId,
      ip: getRequestIp(request),
    });
    if (limit.limited) {
      const response = failure(
        "Muitas tentativas. Tente novamente em alguns minutos.",
        429,
        "MFA_RATE_LIMITED"
      );
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const result = await disableTotp({
      userId,
      currentPassword,
      token,
      recoveryCode,
    });
    await Promise.allSettled([clearMfaLoginPrincipalRateLimit(userId)]);
    return success(result, "2FA desativado com sucesso");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    if (error instanceof SyntaxError) {
      return failure("JSON inválido", 400, "INVALID_JSON");
    }
    return failure("Erro ao desativar 2FA", 500);
  }
}
