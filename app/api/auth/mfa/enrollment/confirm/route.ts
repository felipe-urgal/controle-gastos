import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { isHttpError } from "@/app/lib/http-error";
import { SENSITIVE_ACTIONS } from "@/app/lib/security/sensitive-actions";
import { consumeStepUpRateLimit } from "@/app/lib/security/step-up-auth";
import { confirmTotpEnrollment } from "@/app/lib/security/totp-enrollment";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body: unknown = await parseJsonBody(request);
    const payload =
      body !== null && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const enrollmentToken =
      typeof payload.enrollmentToken === "string"
        ? payload.enrollmentToken.trim()
        : "";
    const token = typeof payload.token === "string" ? payload.token : "";

    if (!enrollmentToken || !token.trim()) {
      return failure(
        "Token de enrollment e TOTP são obrigatórios",
        400,
        "TOTP_ENROLLMENT_INPUT_REQUIRED"
      );
    }

    await consumeStepUpRateLimit({
      request,
      userId,
      action: SENSITIVE_ACTIONS.MFA_ENROLL_CONFIRM,
    });

    const activation = await confirmTotpEnrollment({
      userId,
      enrollmentToken,
      token,
    });
    return success(activation, "2FA ativado com sucesso");
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Erro ao confirmar enrollment TOTP", 500);
  }
}
