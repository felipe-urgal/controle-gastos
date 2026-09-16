import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function requiredEnv(name: "RESEND_FROM_EMAIL" | "NEXT_PUBLIC_SITE_URL") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const { error } = await getResend().emails.send({
    from: requiredEnv("RESEND_FROM_EMAIL"),
    to: args.to,
    subject: args.subject,
    html: args.html,
  });

  if (error) throw new Error("AUTH_EMAIL_DELIVERY_FAILED");
}

function absoluteUrl(path: string) {
  return `${requiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "")}${path}`;
}

export async function sendEmailVerification(args: {
  to: string;
  name: string;
  token: string;
}) {
  const url = absoluteUrl(
    `/api/auth/verify-email?token=${encodeURIComponent(args.token)}`,
  );
  const safeName = escapeHtml(args.name || "usuário");

  await sendEmail({
    to: args.to,
    subject: "Confirme seu e-mail",
    html: `<!doctype html><html lang="pt-BR"><body><p>Olá, ${safeName}!</p><p>Confirme seu e-mail para concluir o cadastro ou a alteração de endereço.</p><p><a href="${url}">Confirmar e-mail</a></p><p>Este link expira em 24 horas.</p></body></html>`,
  });
}

export async function sendPasswordResetEmail(args: {
  to: string;
  name: string | null;
  token: string;
}) {
  const url = absoluteUrl(
    `/reset-password?token=${encodeURIComponent(args.token)}`,
  );
  const safeName = escapeHtml(args.name ?? "usuário");

  await sendEmail({
    to: args.to,
    subject: "Redefinição de Senha",
    html: `<!doctype html><html lang="pt-BR"><body><p>Olá, ${safeName}!</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${url}">Redefinir senha</a></p><p>Este link é válido por 1 hora.</p><p>Se você não solicitou esta alteração, ignore este e-mail.</p></body></html>`,
  });
}
