import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/auth-rate-limit";
import { hashPasswordResetToken } from "@/app/lib/password-reset-token";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const ipLimit = await consumeRateLimit({
      action: "verify-reset-ip",
      identifier: getRequestIp(request),
      maxAttempts: 30,
      windowMs: FIFTEEN_MINUTES,
      blockMs: FIFTEEN_MINUTES,
    });

    if (ipLimit.limited) {
      const response = NextResponse.json(
        { valid: false, error: "Muitas tentativas" },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(ipLimit.retryAfterSeconds));
      return response;
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json(
        { error: "Token não fornecido" },
        { status: 400 }
      );
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashPasswordResetToken(token) },
      select: { expiresAt: true },
    });

    return NextResponse.json(
      { valid: Boolean(resetToken && resetToken.expiresAt > new Date()) },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Verify reset token error:",
      error instanceof Error ? error.message : "unknown"
    );

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
