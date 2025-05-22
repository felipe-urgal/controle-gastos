import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: 'Email não encontrado' },
        { status: 404 }
      );
    }

    const token = Math.random().toString(36).slice(2, 15);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/redefinir-senha?token=${token}`;
    
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Redefinição de Senha",
      html: `
        <p>Você solicitou a redefinição de sua senha. Clique no link abaixo para continuar:</p>
        <a href="${resetUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px;">
          Redefinir Senha
        </a>
        <p style="margin-top: 16px;">Se você não solicitou esta redefinição, por favor ignore este email.</p>
      `,
    });

    return NextResponse.json(
      { message: 'Email de recuperação enviado com sucesso' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro completo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}