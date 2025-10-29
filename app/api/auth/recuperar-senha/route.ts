import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/app/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const { email } = await request.json();
    
    let errors = "";

    // Validações
    if (!email?.trim()) {
      errors += "E-mail é obrigatório!;";
    }

    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors += "Formato de e-mail inválido!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
      });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: email.trim().toLowerCase() } 
    });
    
    if (!user) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "E-mail não encontrado em nossa base de dados"
      });
    }

    // Gerar token de redefinição
    const token = Math.random().toString(36).slice(2, 15);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/redefinir-senha?token=${token}`;
    
    // Enviar e-mail
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "🔐 Redefinição de Senha - Sua Conta",
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redefinição de Senha</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #374151;
              background-color: #f8fafc;
              -webkit-font-smoothing: antialiased;
            }
            
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            
            .email-header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 32px;
              text-align: center;
              color: white;
            }
            
            .logo {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
            }
            
            .header-icon {
              font-size: 48px;
              margin-bottom: 16px;
              display: block;
            }
            
            .email-title {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            
            .email-subtitle {
              font-size: 16px;
              opacity: 0.9;
              font-weight: 400;
            }
            
            .email-content {
              padding: 40px 32px;
            }
            
            .greeting {
              font-size: 18px;
              font-weight: 500;
              margin-bottom: 20px;
              color: #1f2937;
            }
            
            .message {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 24px;
              line-height: 1.7;
            }
            
            .button-container {
              text-align: center;
              margin: 32px 0;
            }
            
            .reset-button {
              display: inline-block;
              padding: 16px 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              font-size: 16px;
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }
            
            .reset-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            }
            
            .expiry-notice {
              background: #f0f9ff;
              border: 1px solid #e0f2fe;
              border-radius: 12px;
              padding: 16px;
              margin: 24px 0;
              text-align: center;
            }
            
            .expiry-icon {
              font-size: 20px;
              margin-bottom: 8px;
              display: block;
            }
            
            .warning-section {
              background: #fff7ed;
              border: 1px solid #fed7aa;
              border-radius: 12px;
              padding: 20px;
              margin: 24px 0;
            }
            
            .warning-title {
              font-weight: 600;
              color: #c2410c;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
              margin: 32px 0;
            }
            
            .help-text {
              text-align: center;
              font-size: 14px;
              color: #9ca3af;
              margin-top: 24px;
            }
            
            .email-footer {
              background: #f9fafb;
              padding: 24px 32px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            
            .footer-logo {
              font-size: 18px;
              font-weight: 700;
              color: #374151;
              margin-bottom: 12px;
            }
            
            .footer-links {
              margin: 16px 0;
            }
            
            .footer-link {
              color: #6b7280;
              text-decoration: none;
              font-size: 14px;
              margin: 0 12px;
              transition: color 0.2s ease;
            }
            
            .footer-link:hover {
              color: #374151;
            }
            
            .copyright {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 16px;
            }
            
            @media (max-width: 600px) {
              .email-content {
                padding: 32px 24px;
              }
              
              .email-header {
                padding: 32px 24px;
              }
              
              .reset-button {
                padding: 14px 32px;
                font-size: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <!-- Header -->
            <div class="email-header">
              <div class="header-icon">🔐</div>
              <div class="logo">Sua Marca</div>
              <h1 class="email-title">Redefinição de Senha</h1>
              <p class="email-subtitle">Segurança em primeiro lugar</p>
            </div>
            
            <!-- Content -->
            <div class="email-content">
              <p class="greeting">Olá, ${user.name || 'Prezado usuário'}!</p>
              
              <p class="message">
                Recebemos uma solicitação para redefinir a senha da sua conta. 
                Para continuar com o processo, clique no botão abaixo:
              </p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">
                  🔑 Redefinir Minha Senha
                </a>
              </div>
              
              <div class="expiry-notice">
                <span class="expiry-icon">⏰</span>
                <p><strong>Link válido por 1 hora</strong><br>
                Por motivos de segurança, este link expirará automaticamente.</p>
              </div>
              
              <div class="divider"></div>
              
              <div class="warning-section">
                <p class="warning-title">
                  <span>⚠️</span>
                  Não solicitou esta alteração?
                </p>
                <p class="message">
                  Se você não fez esta solicitação, por favor ignore este e-mail. 
                  Sua senha atual continuará segura. Caso tenha dúvidas, entre em contato 
                  com nossa equipe de suporte.
                </p>
              </div>
              
              <p class="help-text">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <span style="color: #667eea; word-break: break-all;">${resetUrl}</span>
              </p>
            </div>
            
            <!-- Footer -->
            <div class="email-footer">
              <div class="footer-logo">Sua Marca</div>
              
              <div class="footer-links">
                <a href="#" class="footer-link">Central de Ajuda</a>
                <a href="#" class="footer-link">Política de Privacidade</a>
                <a href="#" class="footer-link">Termos de Uso</a>
              </div>
              
              <p class="copyright">
                © ${new Date().getFullYear()} Sua Marca. Todos os direitos reservados.<br>
                Endereço da Empresa, Cidade - Estado
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json({
      status: 200,
      success: true,
      message: "E-mail de recuperação enviado com sucesso!"
    });

  } catch (error) {
    const errorMessage = translateRecoverPasswordError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function translateRecoverPasswordError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar a recuperação de senha";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao processar recuperação de senha";
  }

  // Erros do Resend (e-mail)
  if (errorMessage.includes('resend') || errorMessage.includes('email') || errorMessage.includes('smtp')) {
    return "Erro ao enviar e-mail de recuperação. Tente novamente em alguns minutos";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao processar recuperação de senha. Tente novamente";
}
