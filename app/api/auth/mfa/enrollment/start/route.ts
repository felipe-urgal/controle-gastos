import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { startTotpEnrollment } from "@/app/lib/security/totp-enrollment";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body: unknown = await request.json();
    const payload =
      body !== null && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const currentPassword =
      typeof payload.currentPassword === "string" ? payload.currentPassword : "";

    if (!currentPassword) {
      return failure("Senha atual é obrigatória", 400, "CURRENT_PASSWORD_REQUIRED");
    }

    const enrollment = await startTotpEnrollment({ userId, currentPassword });
    return success(enrollment, "Enrollment TOTP iniciado");
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
    return failure("Erro ao iniciar enrollment TOTP", 500);
  }
}
