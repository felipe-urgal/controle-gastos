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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redefinição de Senha</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
            }
            .logo {
              max-width: 150px;
              margin-bottom: 16px;
            }
            .content {
              background-color: #f9fafb;
              padding: 24px;
              border-radius: 8px;
            }
            .button {
              display: inline-block;
              margin: 20px 0;
              padding: 12px 24px;
              background-color: #2563eb;
              color: black;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              text-align: center;

              :hover {
                color: white;
              }
            }
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
            .divider {
              height: 1px;
              background-color: #e5e7eb;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="logo.png" alt="Logo" class="logo">
            <h2>Redefinição de Senha</h2>
          </div>
          
          <div class="content">
            <p>Olá,</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta. Para continuar, clique no botão abaixo:</p>
            
            <div>
              <a href="${resetUrl}" class="button">Redefinir Senha</a>
            </div>
            
            <p>Este link expirará em 24 horas por motivos de segurança.</p>
            
            <div class="divider"></div>
            
            <p><strong>Não solicitou esta alteração?</strong><br>
            Se você não fez esta solicitação, por favor ignore este e-mail ou entre em contato conosco se tiver dúvidas.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nome da Sua Empresa. Todos os direitos reservados.</p>
            <p>Endereço da Empresa, Cidade - Estado</p>
          </div>
        </body>
        </html>
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