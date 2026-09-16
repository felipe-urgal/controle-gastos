import { NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/app/lib/auth/auth-email";
import {
  AUTH_INPUT_LIMITS,
  asInputRecord,
  stringInput,
} from "@/app/lib/auth/auth-input";
import { generatePasswordResetToken } from "@/app/lib/auth/password-reset-token";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";
import {
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/security/rate-limit";

const ONE_HOUR = 60 * 60 * 1000;
const ROUTE = "/api/auth/forgot-password";

function genericMessage() {
  return "Se o e-mail existir, enviaremos instruções para redefinição de senha.";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function genericResponse(requestId: string) {
  return withRequestId(
    NextResponse.json(
      { success: true, message: genericMessage() },
      { status: 200 },
    ),
    requestId,
  );
}

function rateLimitedResponse(retryAfterSeconds: number, requestId: string) {
  const response = NextResponse.json(
    { success: false, message: "Muitas solicitações. Tente novamente mais tarde." },
    { status: 429 },
  );

  response.headers.set("Retry-After", String(retryAfterSeconds));
  return withRequestId(response, requestId);
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);

  try {
    const ip = getRequestIp(request);
    const ipLimit = await consumeRateLimit({
      action: "forgot-ip",
      identifier: ip,
      maxAttempts: 10,
      windowMs: ONE_HOUR,
      blockMs: ONE_HOUR,
    });

    if (ipLimit.limited) {
      logEvent("warn", "password_reset_request_rate_limited", {
        requestId,
        route: ROUTE,
        status: 429,
      });
      return rateLimitedResponse(ipLimit.retryAfterSeconds, requestId);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return genericResponse(requestId);
    }

    const payload = asInputRecord(body);
    const emailRaw = stringInput(payload, "email");
    const email = emailRaw?.trim().toLowerCase();

    if (
      !email ||
      email.length > AUTH_INPUT_LIMITS.email ||
      !isValidEmail(email)
    ) {
      return genericResponse(requestId);
    }

    const emailLimit = await consumeRateLimit({
      action: "forgot-email",
      identifier: email,
      maxAttempts: 3,
      windowMs: ONE_HOUR,
      blockMs: ONE_HOUR,
    });

    if (emailLimit.limited) {
      logEvent("warn", "password_reset_request_rate_limited", {
        requestId,
        route: ROUTE,
        status: 429,
      });
      return rateLimitedResponse(emailLimit.retryAfterSeconds, requestId);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.isActive && user.emailVerifiedAt) {
      const { token, tokenHash } = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + ONE_HOUR);

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: {
            token: tokenHash,
            userId: user.id,
            expiresAt,
          },
        }),
      ]);

      try {
        await sendPasswordResetEmail({
          to: email,
          name: user.name,
          token,
        });
      } catch (error) {
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, token: tokenHash },
        });
        logEvent(
          "error",
          "password_reset_delivery_failed",
          { requestId, route: ROUTE, status: 200 },
          error,
        );
      }
    }

    logEvent("info", "password_reset_requested", {
      requestId,
      route: ROUTE,
      status: 200,
    });

    return genericResponse(requestId);
  } catch (error) {
    logEvent(
      "error",
      "password_reset_request_failed",
      { requestId, route: ROUTE, status: 500 },
      error,
    );

    return withRequestId(
      NextResponse.json(
        {
          success: false,
          message:
            "Erro inesperado ao processar recuperação de senha. Tente novamente.",
          requestId,
        },
        { status: 500 },
      ),
      requestId,
    );
  }
}
