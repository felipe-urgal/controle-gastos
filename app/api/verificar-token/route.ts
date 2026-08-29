import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/auth-rate-limit";
import { hashPasswordResetToken } from "@/app/lib/password-reset-token";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const ipLimit = await consumeRateLimit({
      action: "verify-reset-ip",
      identifier: getRequestIp(request),
      maxAttempts: 30,
      windowMs: FIFTEEN_MINUTES,
      blockMs: FIFTEEN_MINUTES,
    });

    if (ipLimit.limited) {
      logEvent("warn", "password_reset_token_verify_rate_limited", {
        requestId,
        route: "/api/verificar-token",
        status: 429,
      });

      const response = NextResponse.json(
        { valid: false, error: "Muitas tentativas" },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(ipLimit.retryAfterSeconds));
      return withRequestId(response, requestId);
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return withRequestId(
        NextResponse.json(
          { error: "Token não fornecido" },
          { status: 400 }
        ),
        requestId
      );
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashPasswordResetToken(token) },
      select: { expiresAt: true },
    });

    return withRequestId(
      NextResponse.json(
        { valid: Boolean(resetToken && resetToken.expiresAt > new Date()) },
        { status: 200 }
      ),
      requestId
    );
  } catch (error) {
    logEvent(
      "error",
      "password_reset_token_verify_failed",
      {
        requestId,
        route: "/api/verificar-token",
        status: 500,
      },
      error
    );

    return withRequestId(
      NextResponse.json(
        { error: "Erro interno do servidor", requestId },
        { status: 500 }
      ),
      requestId
    );
  }
}
