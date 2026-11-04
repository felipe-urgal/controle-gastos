import type { LogicalDate } from "@/app/lib/date/logical-date";

function compactDate(date: LogicalDate) {
  return `${date.year}${String(date.month).padStart(2, "0")}${String(date.day).padStart(2, "0")}`;
}

/**
 * Chave de deduplicação de um fato com data (`PREFIXO:id:AAAAMMDD:estágio`). A data entra porque
 * o mesmo id pode ter vários vencimentos (parcelas de uma dívida); o estágio separa "vence em
 * breve" de "venceu".
 */
export function dedupeKey(prefix: string, id: string, date: LogicalDate, stage: string) {
  return `${prefix}:${id}:${compactDate(date)}:${stage}`;
}

/** Chave do aviso-resumo do dia. */
export function summaryDedupeKey(date: LogicalDate) {
  return `SUMMARY:${compactDate(date)}`;
}
