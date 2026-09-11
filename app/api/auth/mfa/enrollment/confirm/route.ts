import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { confirmTotpEnrollment } from "@/app/lib/security/totp-enrollment";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body: unknown = await request.json();
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

    const activation = await confirmTotpEnrollment({
      userId,
      enrollmentToken,
      token,
    });
    return success(activation, "2FA ativado com sucesso");
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
    return failure("Erro ao confirmar enrollment TOTP", 500);
  }
}
