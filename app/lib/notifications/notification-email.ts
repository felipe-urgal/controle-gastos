import { absoluteUrl, escapeHtml, sendEmail } from "@/app/lib/auth/auth-email";
import type { NotificationSeverity } from "@prisma/client";

export type DigestItem = { title: string; body: string; severity: NotificationSeverity };

const SEVERITY_WORD: Record<NotificationSeverity, string> = {
  URGENT: "Urgente",
  WARNING: "Atenção",
  INFO: "Informativo",
};

/**
 * E-mail diário único com os avisos novos. Título e corpo vêm de dados do usuário (nome de
 * categoria, descrição), então tudo que entra no HTML passa por `escapeHtml`. Os corpos já
 * respeitam `showValues`: nada de valor monetário aqui se o usuário oculta valores.
 */
export function buildDigestEmail(args: {
  name: string | null;
  items: readonly DigestItem[];
  centerUrl: string;
  preferencesUrl: string;
}) {
  const { items } = args;
  const greeting = args.name?.trim() ? `Olá, ${args.name.trim()}!` : "Olá!";
  const subject =
    items.length === 1
      ? `Controle de Gastos: 1 aviso para hoje`
      : `Controle de Gastos: ${items.length} avisos para hoje`;

  const htmlItems = items
    .map(
      (item) =>
        `<li style="margin:0 0 12px"><strong>${escapeHtml(item.title)}</strong> <span style="color:#667085">(${SEVERITY_WORD[item.severity]})</span><br>${escapeHtml(item.body)}</li>`,
    )
    .join("");

  const html =
    `<!doctype html><html lang="pt-BR"><body>` +
    `<p>${escapeHtml(greeting)}</p>` +
    `<p>${items.length === 1 ? "Este aviso pede a sua atenção:" : "Estes avisos pedem a sua atenção:"}</p>` +
    `<ul style="padding-left:18px">${htmlItems}</ul>` +
    `<p><a href="${escapeHtml(args.centerUrl)}">Abrir a central de avisos</a></p>` +
    `<p style="color:#667085;font-size:12px">Para parar de receber este e-mail, desligue a opção de e-mail em ` +
    `<a href="${escapeHtml(args.preferencesUrl)}">Usuário, Preferências</a>.</p>` +
    `</body></html>`;

  const text = [
    greeting,
    "",
    items.length === 1 ? "Este aviso pede a sua atenção:" : "Estes avisos pedem a sua atenção:",
    "",
    ...items.map((item) => `- ${item.title} (${SEVERITY_WORD[item.severity]}): ${item.body}`),
    "",
    `Central de avisos: ${args.centerUrl}`,
    `Para parar de receber este e-mail, desligue a opção de e-mail em Usuário, Preferências: ${args.preferencesUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/** Envia o resumo diário. Lança se o provedor recusar; o chamador decide o que marcar como entregue. */
export async function sendNotificationDigest(args: {
  to: string;
  name: string | null;
  items: readonly DigestItem[];
}) {
  const email = buildDigestEmail({
    name: args.name,
    items: args.items,
    centerUrl: absoluteUrl("/avisos"),
    preferencesUrl: absoluteUrl("/usuario"),
  });
  await sendEmail({ to: args.to, ...email });
}

/** O e-mail diário só sai com o Resend e a URL do site configurados; sem isso, fica desligado em silêncio. */
export function isEmailDeliveryConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.RESEND_FROM_EMAIL?.trim() &&
      process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  );
}
