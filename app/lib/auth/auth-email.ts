import { Resend } from "resend";

import { observeProviderCall, type LogContext } from "@/app/lib/observability";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const SAFE_SLUG = /^[a-z0-9_]{1,40}$/;

/** Falha de envio devolvida pelo Resend: guarda só nome e status do erro, nunca mensagem ou destinatário. */
export class AuthEmailDeliveryError extends Error {
  constructor(
    readonly providerError?: string,
    readonly providerStatus?: number,
  ) {
    super("AUTH_EMAIL_DELIVERY_FAILED");
    this.name = "AuthEmailDeliveryError";
  }
}

const KNOWN_REASONS = [
  "RESEND_FROM_EMAIL_NOT_CONFIGURED",
  "NEXT_PUBLIC_SITE_URL_NOT_CONFIGURED",
  "AUTH_EMAIL_DELIVERY_FAILED",
] as const;

/**
 * Contexto de log seguro para falhas de envio: códigos fixos, sem e-mail, mensagem livre ou segredo.
 * Permite distinguir configuração ausente de recusa do provedor (ex.: 403 por domínio não verificado).
 */
export function emailDeliveryFailureContext(error: unknown): LogContext {
  if (error instanceof AuthEmailDeliveryError) {
    return {
      reason: "AUTH_EMAIL_DELIVERY_FAILED",
      providerError: error.providerError,
      providerStatus: error.providerStatus,
    };
  }
  if (error instanceof Error) {
    const known = KNOWN_REASONS.find((reason) => reason === error.message);
    if (known) return { reason: known };
    if (error.message.startsWith("Missing API key")) {
      return { reason: "RESEND_API_KEY_NOT_CONFIGURED" };
    }
  }
  return { reason: "UNKNOWN" };
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
  // Telemetria sem destinatário, assunto ou corpo.
  await observeProviderCall({ provider: "resend", operation: "send_email" }, async () => {
    const { error } = await getResend().emails.send({
      from: requiredEnv("RESEND_FROM_EMAIL"),
      to: args.to,
      subject: args.subject,
      html: args.html,
    });

    if (error) {
      throw new AuthEmailDeliveryError(
        SAFE_SLUG.test(error.name) ? error.name : undefined,
        typeof error.statusCode === "number" ? error.statusCode : undefined,
      );
    }
  }, (error) =>
    error instanceof Error && error.message === "AUTH_EMAIL_DELIVERY_FAILED"
      ? "upstream_unavailable"
      : "upstream_error");
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
