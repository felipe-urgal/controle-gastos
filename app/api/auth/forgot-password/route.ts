import { NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: true, message: genericMessage() },
        { status: 200 }
      );
    }

    const emailRaw = body?.email;
    const email = emailRaw?.trim().toLowerCase();

    // 🔎 Validação mínima (sem expor erro)
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: true, message: genericMessage() },
        { status: 200 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 🛡️ Se usuário existir, processa.
    // Se não existir, retorna sucesso mesmo assim.
    if (user) {
      // Remove tokens antigos
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // 🔐 Token seguro
      const token = crypto.randomBytes(32).toString("hex");

      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;

      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "🔐 Redefinição de Senha",
        html: buildEmailTemplate(user.name, resetUrl),
      });
    }

    // ✅ Sempre retorna sucesso (anti-enumeração)
    return NextResponse.json(
      {
        success: true,
        message: genericMessage(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Recover password error:", error);

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

/* ========================= */
/* Helpers */
/* ========================= */

function genericMessage() {
  return "Se o e-mail existir, enviaremos instruções para redefinição de senha.";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

      <p>
        Recebemos uma solicitação para redefinir sua senha.
        Clique no botão abaixo para continuar:
      </p>

      <div style="margin:30px 0;text-align:center;">
        <a 
          href="${resetUrl}" 
          style="
            background:linear-gradient(135deg,#667eea,#764ba2);
            padding:14px 28px;
            border-radius:10px;
            color:#ffffff;
            text-decoration:none;
            font-weight:600;
          "
        >
          Redefinir Senha
        </a>
      </div>

      <p style="font-size:14px;color:#6b7280;">
        Este link é válido por 1 hora.
      </p>

      <hr style="margin:30px 0;"/>

      <p style="font-size:13px;color:#9ca3af;">
        Se você não solicitou esta alteração, ignore este e-mail.
      </p>

    </div>
  </body>
  </html>
  `;
}
