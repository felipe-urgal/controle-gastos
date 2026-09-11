import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { confirmTotpEnrollment } from "@/app/lib/security/totp-enrollment";
import { confirmTotpEnrollmentSchema } from "@/app/schemas/totp-enrollment.schema";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = confirmTotpEnrollmentSchema.parse(await request.json());
    const activation = await confirmTotpEnrollment({
      userId,
      enrollmentToken: input.enrollmentToken,
      token: input.token,
    });

    return success(
      activation,
      "2FA ativado com sucesso. Salve os recovery codes agora; eles não serão exibidos novamente."
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
      "Não foi possível confirmar o enrollment TOTP",
      500,
      "TOTP_ENROLLMENT_CONFIRM_FAILED"
    );
  }
}
