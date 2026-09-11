import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { startTotpEnrollment } from "@/app/lib/security/totp-enrollment";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await request.json()) as { currentPassword?: unknown };
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";

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
