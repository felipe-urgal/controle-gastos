import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { isHttpError } from "@/app/lib/http-error";
import { SENSITIVE_ACTIONS } from "@/app/lib/security/sensitive-actions";
import { consumeStepUpRateLimit } from "@/app/lib/security/step-up-auth";
import { startTotpEnrollment } from "@/app/lib/security/totp-enrollment";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body: unknown = await parseJsonBody(request);
    const payload =
      body !== null && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const currentPassword =
      typeof payload.currentPassword === "string" ? payload.currentPassword : "";

    if (!currentPassword) {
      return failure("Senha atual é obrigatória", 400, "CURRENT_PASSWORD_REQUIRED");
    }

    await consumeStepUpRateLimit({
      request,
      userId,
      action: SENSITIVE_ACTIONS.MFA_ENROLL_START,
    });
    const enrollment = await startTotpEnrollment({ userId, currentPassword });
    return success(enrollment, "Enrollment TOTP iniciado");
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Erro ao iniciar enrollment TOTP", 500);
  }
}
