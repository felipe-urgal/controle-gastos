import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, token: string) {
  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/redefinir-senha?token=${token}`;
    
    console.log(resetUrl)
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
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
}