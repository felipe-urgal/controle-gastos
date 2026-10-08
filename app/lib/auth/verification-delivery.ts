import { sendEmailVerification } from "@/app/lib/auth/auth-email";
import { signEmailVerificationToken } from "@/app/lib/auth/email-verification-token";
import { logEvent } from "@/app/lib/observability";
import { consumeRateLimit } from "@/app/lib/security/rate-limit";

const ONE_HOUR_MS = 60 * 60 * 1000;

// Teto por destinatário, independente de IP: impede que IPs distribuídos usem
// signup/resend para inundar a caixa de uma conta pendente.
export const VERIFICATION_EMAIL_LIMIT = {
  action: "verification-email",
  maxAttempts: 3,
  windowMs: ONE_HOUR_MS,
  blockMs: ONE_HOUR_MS,
} as const;

/**
 * Envia o link de verificação de signup respeitando o limite por e-mail.
 * Nunca lança: a resposta pública precisa continuar genérica. Falhas e
 * limitações viram eventos de observabilidade sem e-mail em claro.
 */
export async function sendSignupVerificationBestEffort(
  user: { id: string; name: string; email: string; authVersion: number },
  context: { route: string; requestId?: string },
) {
  try {
    const limit = await consumeRateLimit({
      ...VERIFICATION_EMAIL_LIMIT,
      identifier: user.email,
    });

    if (limit.limited) {
      logEvent("warn", "auth_verification_email_rate_limited", {
        requestId: context.requestId,
        route: context.route,
        status: 202,
      });
      return;
    }

    const token = signEmailVerificationToken({
      userId: user.id,
      email: user.email,
      kind: "signup",
      authVersion: user.authVersion,
    });

    await sendEmailVerification({ to: user.email, name: user.name, token });
  } catch (error) {
    logEvent(
      "error",
      "auth_signup_verification_delivery_failed",
      { requestId: context.requestId, route: context.route, status: 202 },
      error,
    );
  }
}
