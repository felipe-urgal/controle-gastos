import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { parseJsonBody } from "@/app/lib/api/request-json";
import {
  AUTH_INPUT_LIMITS,
  asInputRecord,
  stringInput,
} from "@/app/lib/auth/auth-input";
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

    if (name && name.length < 2)
      errors.push("Nome deve ter pelo menos 2 caracteres");

    if (name && name.length > AUTH_INPUT_LIMITS.name)
      errors.push("Nome não pode exceder 100 caracteres");

    if (email && email.length > AUTH_INPUT_LIMITS.email) {
      errors.push("E-mail é muito longo");
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Formato de e-mail inválido");
    }

    if (password && password.length < 6)
      errors.push("Senha deve ter pelo menos 6 caracteres");

    if (password && password.length > AUTH_INPUT_LIMITS.password)
      errors.push("Senha não pode exceder 100 caracteres");

    if (password && !/[A-Z]/.test(password))
      errors.push("Senha deve conter ao menos uma letra maiúscula");

    if (password && !/[0-9]/.test(password))
      errors.push("Senha deve conter ao menos um número");

    if (errors.length > 0) {
      return withRequestId(
        NextResponse.json(
          { success: false, message: errors.join(". ") },
          { status: 400 }
        ),
        requestId
      );
    }

    const hashedPassword = await bcrypt.hash(password!, 12);

    const user = await prisma.user.create({
      data: {
        name: name!,
        email: email!,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        showValues: true,
      },
    });

    logEvent("info", "auth_signup_succeeded", {
      requestId,
      route: SIGNUP_ROUTE,
      status: 201,
    });

    return withRequestId(
      NextResponse.json(
        {
          success: true,
          message: "Usuário criado com sucesso!",
          data: user,
        },
        { status: 201 }
      ),
      requestId
    );
  } catch (error: unknown) {
    if (isHttpError(error)) {
      return withRequestId(
        NextResponse.json(
          { success: false, message: error.message, code: error.code },
          { status: error.status }
        ),
        requestId
      );
    }

    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      logEvent("warn", "auth_signup_rejected", {
        requestId,
        route: SIGNUP_ROUTE,
        status: 400,
        code: "SIGNUP_CONFLICT",
      });

      return withRequestId(
        NextResponse.json(
          {
            success: false,
            message: "Não foi possível concluir o cadastro com os dados informados",
          },
          { status: 400 }
        ),
        requestId
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
      error
    );

    return withRequestId(
      NextResponse.json(
        {
          success: false,
          message: "Erro interno ao realizar registro",
        },
        { status: 500 }
      ),
      requestId
    );
  }
}
