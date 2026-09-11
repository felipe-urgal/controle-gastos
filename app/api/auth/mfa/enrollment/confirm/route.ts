import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { confirmTotpEnrollment } from "@/app/lib/security/totp-enrollment";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await request.json()) as {
      enrollmentToken?: unknown;
      token?: unknown;
    };
    const enrollmentToken =
      typeof body.enrollmentToken === "string" ? body.enrollmentToken.trim() : "";
    const token = typeof body.token === "string" ? body.token : "";

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
