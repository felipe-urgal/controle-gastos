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
import type { SupportedCurrency } from "@/app/types/financial-summary";

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

export type BudgetNotificationInput = {
  categoryId: string;
  categoryName: string;
  currency: SupportedCurrency;
  /** Limite do mês, em centavos. */
  limitAmount: number;
  /** Realizado mais comprometido, em centavos. */
  consumption: number;
  /** Consumo sobre o limite, em %; `null` quando o limite é zero e já há gasto. */
  planningPercentage: number | null;
};

/** Primeiro dia do mês, para a chave de deduplicação valer pelo mês inteiro. */
function monthStart(date: LogicalDate): LogicalDate {
  return { year: date.year, month: date.month, day: 1 };
}

/**
 * Orçamento por categoria: avisa ao chegar a 80% e a 100% do limite do mês, uma vez por mês e
 * limiar. Se o primeiro contato já é acima de 100%, só o aviso de 100%.
 */
export function budgetNotifications(args: {
  items: readonly BudgetNotificationInput[];
  asOf: LogicalDate;
  showValues: boolean;
}): NotificationCandidate[] {
  const { items, asOf, showValues } = args;
  const month = monthStart(asOf);
  const candidates: NotificationCandidate[] = [];

  for (const item of items) {
    const pct = item.planningPercentage;
    const over = pct === null || pct >= 100;
    const near = pct !== null && pct >= 80 && pct < 100;
    if (!over && !near) continue;

    const percent = pct === null ? null : Math.round(pct);
    const values = showValues
      ? `${formatCurrency(item.consumption, item.currency)} de ${formatCurrency(item.limitAmount, item.currency)}`
      : null;
    const detail = [values, percent === null ? null : `${percent}%`].filter(Boolean).join(" · ");

    candidates.push({
      type: "BUDGET_LIMIT",
      dedupeKey: dedupeKey("BUDGET_LIMIT", item.categoryId, month, over ? "P100" : "P80"),
      severity: over ? "URGENT" : "WARNING",
      title: clip(
        over ? `Orçamento estourado · ${item.categoryName}` : `Orçamento quase no limite · ${item.categoryName}`,
        NOTIFICATION_TITLE_MAX,
      ),
      body: clip(
        `${over ? "Passou do limite do mês" : "Chegou perto do limite do mês"}${detail ? ` (${detail})` : ""}`,
        NOTIFICATION_BODY_MAX,
      ),
      href: `/categorias/show/${item.categoryId}`,
      date: month,
    });
  }

  return candidates;
}

export type ForecastNotificationAccount = {
  id: string;
  name: string;
  currency: SupportedCurrency;
  /** Menor saldo previsto no horizonte, em centavos. */
  lowestProjectedBalance: number;
  lowestProjectedBalanceDate: LogicalDate;
};

/** Dias até o ponto negativo em que o aviso passa a ser urgente. */
export const FORECAST_URGENT_WITHIN_DAYS = 7;

/**
 * Saldo previsto negativo: a projeção de uma conta corrente cruza zero dentro do horizonte.
 * Uma vez por conta e mês do ponto mais baixo, para o dia do mínimo mudar não repetir o aviso.
 */
export function forecastNotifications(args: {
  accounts: readonly ForecastNotificationAccount[];
  asOf: LogicalDate;
  showValues: boolean;
}): NotificationCandidate[] {
  const { accounts, asOf, showValues } = args;
  const candidates: NotificationCandidate[] = [];

  for (const account of accounts) {
    if (account.lowestProjectedBalance >= 0) continue;

    const when = account.lowestProjectedBalanceDate;
    const daysUntil = daysBetweenLogicalDates(asOf, when);
    const value = showValues
      ? `${formatCurrency(account.lowestProjectedBalance, account.currency)} `
      : "";

    candidates.push({
      type: "FORECAST_NEGATIVE",
      dedupeKey: dedupeKey("FORECAST_NEGATIVE", account.id, monthStart(when), "LOW"),
      severity: daysUntil <= FORECAST_URGENT_WITHIN_DAYS ? "URGENT" : "WARNING",
      title: clip(`Saldo previsto negativo · ${account.name}`, NOTIFICATION_TITLE_MAX),
      body: clip(
        `Pela projeção, o saldo fica ${value}negativo em ${formatPtBrLogicalDate(when)}`,
        NOTIFICATION_BODY_MAX,
      ),
      href: `/contas/show/${account.id}`,
      date: when,
    });
  }

  return candidates;
}
