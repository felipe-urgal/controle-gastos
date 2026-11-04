import { formatCurrency } from "@/app/lib/currency/format-currency";
import {
  daysBetweenLogicalDates,
  formatPtBrLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { dedupeKey } from "@/app/lib/notifications/notification-dedupe";
import {
  MAX_OVERDUE_DAYS_NOTIFIED,
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_TITLE_MAX,
  type NotificationCandidate,
} from "@/app/lib/notifications/notification-model";
import type { FinancialCommitment } from "@/app/types/financial-commitment";

/** Atraso mínimo, em dias, para avisar de uma receita esperada que não chegou. */
export const INCOME_OVERDUE_AFTER_DAYS = 3;

function clip(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function dayWord(days: number) {
  return days === 1 ? "1 dia" : `${days} dias`;
}

function whenLabel(daysUntil: number) {
  if (daysUntil === 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `vence em ${dayWord(daysUntil)}`;
}

function amountPart(commitment: FinancialCommitment, showValues: boolean) {
  if (!showValues || commitment.amount === null) return "";
  return `${formatCurrency(commitment.amount, commitment.currency)} · `;
}

/**
 * Avisos de compromissos que já têm fonte única em `financial-commitments`: faturas de cartão,
 * contas a pagar (transações pendentes, parcelas de dívida) e receitas esperadas em atraso.
 * Função pura: o chamador decide gravar, deduplicar e entregar.
 *
 * Estágios por janela, não por dia exato, para um dia sem cron não perder o aviso:
 * `D3` (faltam 2 ou 3 dias, só faturas), `DUE` (vence hoje ou amanhã) e `OVERDUE`.
 */
export function commitmentNotifications(args: {
  commitments: readonly FinancialCommitment[];
  asOf: LogicalDate;
  showValues: boolean;
}): NotificationCandidate[] {
  const { commitments, asOf, showValues } = args;
  const candidates: NotificationCandidate[] = [];

  for (const commitment of commitments) {
    if (commitment.direction === "MILESTONE") continue;

    const daysUntil = daysBetweenLogicalDates(asOf, commitment.date);
    const daysLate = -daysUntil;
    const dueText = formatPtBrLogicalDate(commitment.date);
    const base = {
      href: commitment.href,
      date: commitment.date,
      title: clip(commitment.title, NOTIFICATION_TITLE_MAX),
    };

    if (commitment.direction === "RECEIVABLE") {
      if (daysLate < INCOME_OVERDUE_AFTER_DAYS || daysLate > MAX_OVERDUE_DAYS_NOTIFIED) continue;
      candidates.push({
        ...base,
        type: "INCOME_OVERDUE",
        dedupeKey: dedupeKey("INCOME_OVERDUE", commitment.id, commitment.date, "OVERDUE"),
        severity: "INFO",
        body: clip(
          `${amountPart(commitment, showValues)}era esperado em ${dueText}, há ${dayWord(daysLate)}`,
          NOTIFICATION_BODY_MAX,
        ),
      });
      continue;
    }

    const isCard = commitment.type === "CARD_STATEMENT";
    const type = isCard ? "CARD_STATEMENT_DUE" : "COMMITMENT_DUE";
    const prefix = isCard ? "CARD_DUE" : "COMMITMENT_DUE";

    if (daysLate >= 1) {
      if (daysLate > MAX_OVERDUE_DAYS_NOTIFIED) continue;
      candidates.push({
        ...base,
        type,
        dedupeKey: dedupeKey(prefix, commitment.id, commitment.date, "OVERDUE"),
        severity: "URGENT",
        body: clip(
          `${amountPart(commitment, showValues)}venceu em ${dueText}, há ${dayWord(daysLate)}`,
          NOTIFICATION_BODY_MAX,
        ),
      });
      continue;
    }

    if (daysUntil <= 1) {
      candidates.push({
        ...base,
        type,
        dedupeKey: dedupeKey(prefix, commitment.id, commitment.date, "DUE"),
        severity: "WARNING",
        body: clip(
          `${amountPart(commitment, showValues)}${whenLabel(daysUntil)} (${dueText})`,
          NOTIFICATION_BODY_MAX,
        ),
      });
      continue;
    }

    if (isCard && daysUntil <= 3) {
      candidates.push({
        ...base,
        type,
        dedupeKey: dedupeKey(prefix, commitment.id, commitment.date, "D3"),
        severity: "INFO",
        body: clip(
          `${amountPart(commitment, showValues)}${whenLabel(daysUntil)} (${dueText})`,
          NOTIFICATION_BODY_MAX,
        ),
      });
    }
  }

  return candidates;
}
