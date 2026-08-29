import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import {
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/auth-rate-limit";
import { hashPasswordResetToken } from "@/app/lib/password-reset-token";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";

const ONE_HOUR = 60 * 60 * 1000;

function rateLimitedResponse(retryAfterSeconds: number, requestId: string) {
  const response = NextResponse.json(
    { success: false, message: "Muitas tentativas. Tente novamente mais tarde." },
    { status: 429 }
  );

  response.headers.set("Retry-After", String(retryAfterSeconds));
  return withRequestId(response, requestId);
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);

  try {
    const ip = getRequestIp(request);
    const ipLimit = await consumeRateLimit({
      action: "reset-ip",
      identifier: ip,
      maxAttempts: 20,
      windowMs: ONE_HOUR,
      blockMs: ONE_HOUR,
    });

    if (ipLimit.limited) {
      logEvent("warn", "password_reset_rate_limited", {
        requestId,
        route: "/api/auth/reset-password",
        status: 429,
      });
      return rateLimitedResponse(ipLimit.retryAfterSeconds, requestId);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new HttpError("JSON inválido", 400, "INVALID_JSON");
    }

    const { token, novaSenha } = body as {
      token?: string;
      novaSenha?: string;
    };

    if (!token?.trim()) {
      throw new HttpError("Token é obrigatório!", 400, "TOKEN_REQUIRED");
    }

    if (!novaSenha) {
      throw new HttpError("Nova senha é obrigatória!", 400, "PASSWORD_REQUIRED");
    }

    if (novaSenha.length < 6) {
      throw new HttpError(
        "Senha deve ter pelo menos 6 caracteres!",
        400,
        "PASSWORD_TOO_SHORT"
      );
    }

    if (novaSenha.length > 100) {
      throw new HttpError(
        "Senha não pode exceder 100 caracteres!",
        400,
        "PASSWORD_TOO_LONG"
      );
    }

    const tokenHash = hashPasswordResetToken(token.trim());
    const tokenLimit = await consumeRateLimit({
      action: "reset-token",
      identifier: tokenHash,
      maxAttempts: 5,
      windowMs: ONE_HOUR,
      blockMs: ONE_HOUR,
    });

    if (tokenLimit.limited) {
      logEvent("warn", "password_reset_rate_limited", {
        requestId,
        route: "/api/auth/reset-password",
        status: 429,
      });
      return rateLimitedResponse(tokenLimit.retryAfterSeconds, requestId);
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    const now = new Date();
    if (!resetToken || resetToken.expiresAt <= now) {
      throw new HttpError(
        "Token inválido ou expirado",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.deleteMany({
        where: {
          id: resetToken.id,
          token: tokenHash,
          expiresAt: { gt: new Date() },
        },
      });

      if (consumed.count !== 1) {
        throw new HttpError(
          "Token inválido ou expirado",
          400,
          "INVALID_RESET_TOKEN"
        );
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });
    });

    logEvent("info", "password_reset_succeeded", {
      requestId,
      route: "/api/auth/reset-password",
      status: 200,
    });

    return withRequestId(
      NextResponse.json(
        {
          success: true,
          message: "Senha redefinida com sucesso!",
        },
        { status: 200 }
      ),
      requestId
    );
  } catch (error) {
    if (isHttpError(error)) {
      logEvent("warn", "password_reset_rejected", {
        requestId,
        route: "/api/auth/reset-password",
        status: error.status,
        code: error.code,
      });

      return withRequestId(
        NextResponse.json(
          {
            success: false,
            message: error.message,
            code: error.code,
          },
          { status: error.status }
        ),
        requestId
      );
    }

    logEvent(
      "error",
      "password_reset_failed",
      {
        requestId,
        route: "/api/auth/reset-password",
        status: 500,
      },
      error
    );

    return withRequestId(
      NextResponse.json(
        {
          success: false,
          message: "Erro inesperado ao redefinir senha. Tente novamente",
          requestId,
        },
        { status: 500 }
      ),
      requestId
    );
  }
}
