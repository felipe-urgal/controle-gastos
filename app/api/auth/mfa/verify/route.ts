import { NextResponse } from "next/server";

import { shouldUseSecureAuthCookie } from "@/app/lib/auth/auth-cookie";
import { getRequestIp } from "@/app/lib/auth-rate-limit";
import { signAuthToken } from "@/app/lib/auth/auth-token";
import { isHttpError } from "@/app/lib/http-error";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";
import {
  completeMfaLogin,
  parseMfaLoginChallenge,
} from "@/app/lib/security/mfa-login";
import {
  clearMfaLoginPrincipalRateLimit,
  consumeMfaLoginRateLimit,
} from "@/app/lib/security/mfa-rate-limit";

function rateLimitedResponse(retryAfterSeconds: number, requestId: string) {
  const response = NextResponse.json(
    {
      success: false,
      message: "Muitas tentativas. Tente novamente em alguns minutos.",
    },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return withRequestId(response, requestId);
}

function rejectedResponse(requestId: string) {
  return withRequestId(
    NextResponse.json(
      { success: false, message: "Código ou challenge MFA inválido." },
      { status: 401 }
    ),
    requestId
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return withRequestId(
        NextResponse.json(
          { success: false, message: "JSON inválido" },
          { status: 400 }
        ),
        requestId
      );
    }

    const payload =
      body !== null && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const challenge =
      typeof payload.challenge === "string" ? payload.challenge.trim() : "";
    const token = typeof payload.token === "string" ? payload.token : undefined;
    const recoveryCode =
      typeof payload.recoveryCode === "string" ? payload.recoveryCode : undefined;
    const hasTotp = Boolean(token?.trim());
    const hasRecovery = Boolean(recoveryCode?.trim());

    if (!challenge || hasTotp === hasRecovery) {
      return withRequestId(
        NextResponse.json(
          {
            success: false,
            message: "Informe challenge e exatamente um segundo fator.",
          },
          { status: 400 }
        ),
        requestId
      );
    }

    let identity: { userId: string; challengeId: string };
    try {
      identity = parseMfaLoginChallenge(challenge);
    } catch {
      logEvent("warn", "auth_mfa_login_rejected", {
        requestId,
        route: "/api/auth/mfa/verify",
        status: 401,
      });
      return rejectedResponse(requestId);
    }

    const limit = await consumeMfaLoginRateLimit({
      userId: identity.userId,
      ip: getRequestIp(request),
    });

    if (limit.limited) {
      logEvent("warn", "auth_mfa_login_rate_limited", {
        requestId,
        route: "/api/auth/mfa/verify",
        status: 429,
      });
      return rateLimitedResponse(limit.retryAfterSeconds, requestId);
    }

    let user: Awaited<ReturnType<typeof completeMfaLogin>>;
    try {
      user = await completeMfaLogin({
        userId: identity.userId,
        challengeId: identity.challengeId,
        token,
        recoveryCode,
      });
    } catch (error) {
      if (isHttpError(error)) {
        logEvent("warn", "auth_mfa_login_rejected", {
          requestId,
          route: "/api/auth/mfa/verify",
          status: error.status,
        });
        return error.status === 400
          ? withRequestId(
              NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
              ),
              requestId
            )
          : rejectedResponse(requestId);
      }
      throw error;
    }

    const authToken = signAuthToken(user.id);

    await Promise.allSettled([
      clearMfaLoginPrincipalRateLimit(user.id),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      }),
    ]);

    const response = NextResponse.json(
      {
        success: true,
        message: "Login realizado com sucesso!",
        user,
      },
      { status: 200 }
    );

    response.cookies.set("token", authToken, {
      httpOnly: true,
      secure: shouldUseSecureAuthCookie(request),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "high",
    });

    logEvent("info", "auth_mfa_login_succeeded", {
      requestId,
      route: "/api/auth/mfa/verify",
      status: 200,
    });

    return withRequestId(response, requestId);
  } catch (error) {
    logEvent(
      "error",
      "auth_mfa_login_failed",
      {
        requestId,
        route: "/api/auth/mfa/verify",
        status: 500,
      },
      error
    );

    return withRequestId(
      NextResponse.json(
        {
          success: false,
          message: "Erro inesperado ao validar segundo fator.",
          requestId,
        },
        { status: 500 }
      ),
      requestId
    );
  }
}
