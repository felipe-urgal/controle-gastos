import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { startTotpEnrollment } from "@/app/lib/security/totp-enrollment";
import { startTotpEnrollmentSchema } from "@/app/schemas/totp-enrollment.schema";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = startTotpEnrollmentSchema.parse(await request.json());
    const enrollment = await startTotpEnrollment({
      userId,
      currentPassword: input.currentPassword,
    });

    return success(
      enrollment,
      "Enrollment TOTP iniciado. Confirme o primeiro código antes de ativar o 2FA."
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401, "UNAUTHORIZED");
    }
    if (error instanceof ZodError) {
      return failure(
        error.issues[0]?.message ?? "Dados inválidos",
        400,
        "INVALID_INPUT"
      );
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }

    return failure(
      "Não foi possível iniciar o enrollment TOTP",
      500,
      "TOTP_ENROLLMENT_START_FAILED"
    );
  }
}
