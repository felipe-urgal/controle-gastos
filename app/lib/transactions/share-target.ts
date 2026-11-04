import { isValidLogicalDate, type LogicalDate } from "@/app/lib/date/logical-date";
import type { ReceiptOcrApplication } from "@/app/lib/receipts/receipt-ocr-parser";
import type { QuickEntryParsed } from "@/app/lib/transactions/quick-entry";
import { TRANSACTION_DESCRIPTION_MAX_LENGTH } from "@/app/lib/transactions/transaction-field-contract";

/**
 * Compartilhar para o app (Web Share Target, Android com o PWA instalado): o texto ou a imagem
 * compartilhados caem em `/compartilhar`, que mostra a prévia do lançamento para confirmar.
 * Aqui ficam as regras puras; o service worker e a rota `/api/share` só repassam.
 */

export const SHARE_PAGE_PATH = "/compartilhar";
/** Texto maior que isto é cortado: uma notificação de banco cabe com folga. */
export const SHARE_MAX_TEXT_LENGTH = 2000;

/** Escolhe o que interpretar entre o que o sistema entrega: o texto, senão o título, senão o link. */
export function pickSharedText(input: {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}) {
  const chosen = [input.text, input.title, input.url].find((value) => typeof value === "string" && value.trim() !== "");
  return (chosen ?? "").trim().slice(0, SHARE_MAX_TEXT_LENGTH);
}

/** Destino depois do compartilhamento; o texto vai na URL (é o que o usuário escolheu enviar). */
export function shareTargetHref(args: { text: string; hasImage: boolean }) {
  const params = new URLSearchParams();
  const text = args.text.trim().slice(0, SHARE_MAX_TEXT_LENGTH);
  if (text) params.set("text", text);
  if (args.hasImage) params.set("imagem", "1");
  const query = params.toString();
  return query ? `${SHARE_PAGE_PATH}?${query}` : SHARE_PAGE_PATH;
}

export function readShareParams(params: { get(name: string): string | null }) {
  return {
    text: (params.get("text") ?? "").trim().slice(0, SHARE_MAX_TEXT_LENGTH),
    hasImage: params.get("imagem") === "1",
  };
}

/**
 * Rascunho do lançamento a partir da leitura de um recibo. Só existe com valor lido com segurança
 * (o mesmo critério do formulário); data ilegível vira hoje, descrição ilegível fica vazia para
 * a prévia pedir. Recibo é sempre despesa em reais.
 */
export function draftFromReceipt(application: ReceiptOcrApplication, today: LogicalDate): QuickEntryParsed | null {
  if (application.amountCents === undefined) return null;

  const date = application.date && isValidLogicalDate(application.date) ? application.date : null;
  return {
    ok: true,
    amountCents: application.amountCents,
    description: (application.description ?? "").trim().slice(0, TRANSACTION_DESCRIPTION_MAX_LENGTH),
    type: "EXPENSE",
    typeInferred: false,
    date: date ?? today,
    dateSource: date ? "full" : "default",
    accountHint: null,
    confident: true,
  };
}
