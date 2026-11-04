import type { NotificationSeverity, NotificationType } from "@prisma/client";

import type { LogicalDate } from "@/app/lib/date/logical-date";

/** Um aviso que as regras querem emitir; ainda não foi gravado nem entregue. */
export type NotificationCandidate = {
  type: NotificationType;
  /** Chave estável do fato notificado: a mesma chave nunca gera dois avisos para o mesmo usuário. */
  dedupeKey: string;
  severity: NotificationSeverity;
  title: string;
  /** Sem valores monetários quando o usuário oculta valores. */
  body: string;
  href: string;
  /** Data do fato (vencimento, por exemplo); só serve para ordenar. */
  date: LogicalDate;
};

export type NotificationChannels = { inApp: boolean; email: boolean; push: boolean };

/** Padrão por tipo quando o usuário ainda não escolheu. E-mail e push são sempre opt-in. */
export const NOTIFICATION_DEFAULTS: Record<NotificationType, NotificationChannels> = {
  CARD_STATEMENT_DUE: { inApp: true, email: false, push: false },
  COMMITMENT_DUE: { inApp: true, email: false, push: false },
  INCOME_OVERDUE: { inApp: false, email: false, push: false },
  BUDGET_LIMIT: { inApp: true, email: false, push: false },
  FORECAST_NEGATIVE: { inApp: true, email: false, push: false },
  GOAL_DEADLINE: { inApp: false, email: false, push: false },
  SUMMARY: { inApp: true, email: false, push: false },
};

/** Máximo de avisos novos por usuário por dia; o excedente vira um único aviso-resumo. */
export const DAILY_NOTIFICATION_CAP = 5;

/** Atrasos mais antigos que isso não são fato novo: o Dashboard já os mostra. */
export const MAX_OVERDUE_DAYS_NOTIFIED = 7;

export const NOTIFICATION_TITLE_MAX = 120;
export const NOTIFICATION_BODY_MAX = 300;
