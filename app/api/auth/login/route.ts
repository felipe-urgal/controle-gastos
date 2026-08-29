import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { signAuthToken } from "@/app/lib/auth-token";
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/auth-rate-limit";

const FAKE_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOeQO8J1p0Cz6l5Qn8jY5h5E6E6E6E6E6";
const FIFTEEN_MINUTES = 15 * 60 * 1000;

function rateLimitedResponse(retryAfterSeconds: number) {
  const response = NextResponse.json(
    {
      success: false,
      message: "Muitas tentativas. Tente novamente em alguns minutos.",
    },
    { status: 429 }
  );

  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "JSON inválido" },
        { status: 400 }
      );
    }

    const payload = body as { email?: string; password?: string };
    const emailNormalized = payload.email?.trim().toLowerCase();
    const password = payload.password;
    const errors: string[] = [];

    if (!emailNormalized) errors.push("E-mail é obrigatório!");
    if (!password) errors.push("Senha é obrigatória!");

    if (emailNormalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      errors.push("E-mail inválido!");
    }

    if (password && password.length < 6) {
      errors.push("Senha deve ter pelo menos 6 caracteres!");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors },
        { status: 400 }
      );
    }

    const ip = getRequestIp(request);
    const principalIdentifier = `${ip}:${emailNormalized}`;
    const [ipLimit, principalLimit] = await Promise.all([
      consumeRateLimit({
        action: "login-ip",
        identifier: ip,
        maxAttempts: 30,
        windowMs: FIFTEEN_MINUTES,
        blockMs: FIFTEEN_MINUTES,
      }),
      consumeRateLimit({
        action: "login-principal",
        identifier: principalIdentifier,
        maxAttempts: 5,
        windowMs: FIFTEEN_MINUTES,
        blockMs: FIFTEEN_MINUTES,
      }),
    ]);

    const activeLimit = ipLimit.limited ? ipLimit : principalLimit;
    if (activeLimit.limited) {
      return rateLimitedResponse(activeLimit.retryAfterSeconds);
    }

    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    const passwordMatch = await bcrypt.compare(
      password!,
      user?.password ?? FAKE_HASH
    );

    if (!user || !passwordMatch || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "E-mail ou senha inválidos!" },
        { status: 401 }
      );
    }

    const token = signAuthToken(user.id);

    // Authentication success must not be turned into a 500 by best-effort
    // bookkeeping performed after credentials have already been verified.
    await Promise.allSettled([
      clearRateLimit("login-principal", principalIdentifier),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      }),
    ]);

    const response = NextResponse.json(
      {
        success: true,
        message: "Login realizado com sucesso!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          showValues: user.showValues,
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "high",
    });

    return response;
  } catch {
    console.error("Login failed");

    return NextResponse.json(
      {
        success: false,
        message: "Erro inesperado ao realizar login. Tente novamente",
      },
      { status: 500 }
    );
  }
}
