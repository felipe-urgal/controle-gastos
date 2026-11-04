import type { NotificationSeverity, NotificationType } from '@/app/types/notification';

/** Texto que cada tipo ganha na tela de preferências; só os que já têm regra aparecem. */
export const NOTIFICATION_TYPE_COPY: Partial<Record<NotificationType, { title: string; description: string }>> = {
  CARD_STATEMENT_DUE: {
    title: 'Fatura de cartão',
    description: 'Quando a fatura está para vencer (3 dias, 1 dia) ou já venceu.',
  },
  COMMITMENT_DUE: {
    title: 'Contas a pagar',
    description: 'Pendências e parcelas de dívida que vencem hoje ou amanhã, ou venceram.',
  },
  INCOME_OVERDUE: {
    title: 'Receita atrasada',
    description: 'Uma receita esperada que não chegou há mais de 3 dias.',
  },
  BUDGET_LIMIT: {
    title: 'Orçamento da categoria',
    description: 'Quando o gasto chega a 80% e a 100% do limite do mês.',
  },
  FORECAST_NEGATIVE: {
    title: 'Saldo previsto negativo',
    description: 'Quando a projeção de uma conta corrente cruza zero nos próximos 30 dias.',
  },
};

/** Ordem em que os tipos aparecem nas preferências. */
export const PREFERENCE_TYPES = Object.keys(NOTIFICATION_TYPE_COPY) as NotificationType[];

export const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  URGENT: 'Urgente',
  WARNING: 'Atenção',
  INFO: 'Informativo',
};

/** Contador do sino: acima de 9 vira "9+" para caber na bolinha. */
export function badgeLabel(count: number) {
  return count > 9 ? '9+' : String(count);
}

/** "agora", "há 5 min", "há 3 h", "ontem" ou a data; sempre relativo ao fuso do navegador. */
export function relativeTimeLabel(iso: string, now: Date = new Date()) {
  const created = new Date(iso);
  const minutes = Math.floor((now.getTime() - created.getTime()) / 60_000);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(created);
}
