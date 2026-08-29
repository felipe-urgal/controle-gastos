import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/app/lib/prisma";
import {
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/auth-rate-limit";
import { generatePasswordResetToken } from "@/app/lib/password-reset-token";

const resend = new Resend(process.env.RESEND_API_KEY);
const ONE_HOUR = 60 * 60 * 1000;

function genericMessage() {
  return "Se o e-mail existir, enviaremos instruções para redefinição de senha.";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function rateLimitedResponse(retryAfterSeconds: number) {
  const response = NextResponse.json(
    { success: false, message: "Muitas solicitações. Tente novamente mais tarde." },
    { status: 429 }
  );

  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
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
      return rateLimitedResponse(ipLimit.retryAfterSeconds);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("SITE_URL_NOT_CONFIGURED");

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: true, message: genericMessage() },
        { status: 200 }
      );
    }

    const emailRaw = (body as { email?: string })?.email;
    const email = emailRaw?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: true, message: genericMessage() },
        { status: 200 }
      );
    }

    const emailLimit = await consumeRateLimit({
      action: "forgot-email",
      identifier: email,
      maxAttempts: 3,
      windowMs: ONE_HOUR,
      blockMs: ONE_HOUR,
    });

    if (emailLimit.limited) {
      return rateLimitedResponse(emailLimit.retryAfterSeconds);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user?.isActive) {
      const { token, tokenHash } = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + ONE_HOUR);

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        }),
        prisma.passwordResetToken.create({
          data: {
            token: tokenHash,
            userId: user.id,
            expiresAt,
          },
        }),
      ]);

      const resetUrl = `${siteUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

      try {
        const { error } = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: email,
          subject: "🔐 Redefinição de Senha",
          html: buildEmailTemplate(user.name, resetUrl),
        });

        if (error) throw new Error("PASSWORD_RESET_EMAIL_FAILED");
      } catch {
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, token: tokenHash },
        });
        throw new Error("PASSWORD_RESET_EMAIL_FAILED");
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: genericMessage(),
      },
      { status: 200 }
    );
  } catch {
    console.error("Password recovery failed");

    return NextResponse.json(
      {
        success: false,
        message:
          "Erro inesperado ao processar recuperação de senha. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

function buildEmailTemplate(name: string | null, resetUrl: string) {
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Redefinição de Senha</title>
  </head>
  <body style="font-family: Inter, sans-serif; background:#f8fafc; padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;padding:40px;">
      <h2 style="color:#111827;">🔐 Redefinição de Senha</h2>
      <p>Olá, ${name ?? "usuário"}!</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para continuar:</p>
      <div style="margin:30px 0;text-align:center;">
        <a href="${resetUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);padding:14px 28px;border-radius:10px;color:#ffffff;text-decoration:none;font-weight:600;">Redefinir Senha</a>
      </div>
      <p style="font-size:14px;color:#6b7280;">Este link é válido por 1 hora.</p>
      <hr style="margin:30px 0;"/>
      <p style="font-size:13px;color:#9ca3af;">Se você não solicitou esta alteração, ignore este e-mail.</p>
    </div>
  </body>
  </html>
  `;
}
