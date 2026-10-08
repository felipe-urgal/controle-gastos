import { NextResponse } from "next/server";

import { parseJsonBody } from "@/app/lib/api/request-json";
import {
  AUTH_INPUT_LIMITS,
  asInputRecord,
  stringInput,
} from "@/app/lib/auth/auth-input";
import { sendSignupVerificationBestEffort } from "@/app/lib/auth/verification-delivery";
import { isHttpError } from "@/app/lib/http-error";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";
import { consumeRateLimit, getRequestIp } from "@/app/lib/security/rate-limit";

const ROUTE = "/api/auth/resend-verification";
const ONE_HOUR_MS = 60 * 60 * 1000;
const GENERIC_MESSAGE =
  "Se houver um cadastro pendente para este e-mail, enviaremos um novo link de verificação.";

function genericResponse(requestId: string) {
  return withRequestId(
    NextResponse.json({ success: true, message: GENERIC_MESSAGE }, { status: 202 }),
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
      action: "resend-verification-ip",
      identifier: ip,
      maxAttempts: 10,
      windowMs: ONE_HOUR_MS,
      blockMs: ONE_HOUR_MS,
    });
    if (ipLimit.limited) {
      logEvent("warn", "auth_resend_verification_rate_limited", {
        requestId,
        route: ROUTE,
        status: 429,
      });
      return rateLimitedResponse(ipLimit.retryAfterSeconds, requestId);
    }

    let body: unknown;
    try {
      body = await parseJsonBody(request);
    } catch (error) {
      if (isHttpError(error) && error.code === "INVALID_JSON") {
        return genericResponse(requestId);
      }
      throw error;
    }

    const email = stringInput(asInputRecord(body), "email")?.trim().toLowerCase();
    if (
      !email ||
      email.length > AUTH_INPUT_LIMITS.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return genericResponse(requestId);
    }

    // IP + e-mail depende só da entrada, então o 429 não revela estado da conta.
    const pairLimit = await consumeRateLimit({
      action: "resend-verification-pair",
      identifier: `${ip}|${email}`,
      maxAttempts: 3,
      windowMs: ONE_HOUR_MS,
      blockMs: ONE_HOUR_MS,
    });
    if (pairLimit.limited) {
      logEvent("warn", "auth_resend_verification_rate_limited", {
        requestId,
        route: ROUTE,
        status: 429,
      });
      return rateLimitedResponse(pairLimit.retryAfterSeconds, requestId);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        authVersion: true,
        emailVerifiedAt: true,
        isActive: true,
      },
    });

    if (user?.isActive && !user.emailVerifiedAt) {
      await sendSignupVerificationBestEffort(user, { route: ROUTE, requestId });
    }

    logEvent("info", "auth_resend_verification_requested", {
      requestId,
      route: ROUTE,
      status: 202,
    });
    return genericResponse(requestId);
  } catch (error) {
    if (isHttpError(error)) {
      return withRequestId(
        NextResponse.json(
          { success: false, message: error.message },
          { status: error.status },
        ),
        requestId,
      );
    }

    logEvent(
      "error",
      "auth_resend_verification_failed",
      { requestId, route: ROUTE, status: 500 },
      error,
    );
    return withRequestId(
      NextResponse.json(
        { success: false, message: "Erro inesperado. Tente novamente." },
        { status: 500 },
      ),
      requestId,
    );
  }
}
