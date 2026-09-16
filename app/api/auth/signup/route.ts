import { NextResponse } from "next/server";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { sendEmailVerification } from "@/app/lib/auth/auth-email";
import {
  AUTH_INPUT_LIMITS,
  asInputRecord,
  stringInput,
} from "@/app/lib/auth/auth-input";
import { signEmailVerificationToken } from "@/app/lib/auth/email-verification-token";
import { hashPassword, validatePassword } from "@/app/lib/auth/password-policy";
import { isHttpError } from "@/app/lib/http-error";
import {
  getRequestId,
  logEvent,
  withRequestId,
} from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";
import {
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/security/rate-limit";

const SIGNUP_ROUTE = "/api/auth/signup";
const ONE_HOUR_MS = 60 * 60 * 1000;
const SIGNUP_MESSAGE =
  "Se os dados puderem ser cadastrados, enviaremos um link de verificação para o e-mail informado.";

function rateLimitedResponse(retryAfterSeconds: number, requestId: string) {
  const response = NextResponse.json(
    {
      success: false,
      message: "Muitas tentativas de cadastro. Tente novamente mais tarde.",
    },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return withRequestId(response, requestId);
}

function acceptedResponse(requestId: string) {
  return withRequestId(
    NextResponse.json(
      { success: true, message: SIGNUP_MESSAGE },
      { status: 202 },
    ),
    requestId,
  );
}

async function sendVerificationBestEffort(user: {
  id: string;
  name: string;
  email: string;
  authVersion: number;
}) {
  const token = signEmailVerificationToken({
    userId: user.id,
    email: user.email,
    kind: "signup",
    authVersion: user.authVersion,
  });

  try {
    await sendEmailVerification({
      to: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    logEvent("error", "auth_signup_verification_delivery_failed", {
      route: SIGNUP_ROUTE,
      status: 202,
    }, error);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const ipLimit = await consumeRateLimit({
      action: "signup-ip",
      identifier: getRequestIp(request),
      maxAttempts: 10,
      windowMs: ONE_HOUR_MS,
      blockMs: ONE_HOUR_MS,
    });

    if (ipLimit.limited) {
      logEvent("warn", "auth_signup_rate_limited", {
        requestId,
        route: SIGNUP_ROUTE,
        status: 429,
      });
      return rateLimitedResponse(ipLimit.retryAfterSeconds, requestId);
    }

    const body = await parseJsonBody(request);
    const payload = asInputRecord(body);
    const name = stringInput(payload, "name")?.trim();
    const email = stringInput(payload, "email")?.trim().toLowerCase();
    const password = stringInput(payload, "password");

    const errors: string[] = [];

    if (!name) errors.push("Nome é obrigatório");
    if (!email) errors.push("E-mail é obrigatório");
    if (!password) errors.push("Senha é obrigatória");

    if (name && name.length < 2) errors.push("Nome deve ter pelo menos 2 caracteres");
    if (name && name.length > AUTH_INPUT_LIMITS.name)
      errors.push("Nome não pode exceder 100 caracteres");

    if (email && email.length > AUTH_INPUT_LIMITS.email) {
      errors.push("E-mail é muito longo");
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Formato de e-mail inválido");
    }

    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) errors.push(passwordError);
    }

    if (errors.length > 0) {
      return withRequestId(
        NextResponse.json(
          { success: false, message: errors.join(". ") },
          { status: 400 },
        ),
        requestId,
      );
    }

    const hashedPassword = await hashPassword(password!);

    try {
      const user = await prisma.user.create({
        data: {
          name: name!,
          email: email!,
          password: hashedPassword,
          emailVerifiedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          authVersion: true,
        },
      });

      await sendVerificationBestEffort(user);
    } catch (error: unknown) {
      const isConflict =
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002";

      if (!isConflict) throw error;

      const existing = await prisma.user.findUnique({
        where: { email: email! },
        select: {
          id: true,
          name: true,
          email: true,
          authVersion: true,
          emailVerifiedAt: true,
          isActive: true,
        },
      });

      if (existing?.isActive && !existing.emailVerifiedAt) {
        await sendVerificationBestEffort(existing);
      }
    }

    logEvent("info", "auth_signup_accepted", {
      requestId,
      route: SIGNUP_ROUTE,
      status: 202,
    });

    return acceptedResponse(requestId);
  } catch (error: unknown) {
    if (isHttpError(error)) {
      return withRequestId(
        NextResponse.json(
          { success: false, message: error.message, code: error.code },
          { status: error.status },
        ),
        requestId,
      );
    }

    logEvent(
      "error",
      "auth_signup_failed",
      {
        requestId,
        route: SIGNUP_ROUTE,
        status: 500,
      },
      error,
    );

    return withRequestId(
      NextResponse.json(
        { success: false, message: "Erro interno ao realizar registro" },
        { status: 500 },
      ),
      requestId,
    );
  }
}
