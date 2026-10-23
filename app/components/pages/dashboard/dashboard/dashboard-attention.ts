import { displayMoney, logicalDateDistance } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { insightDetail } from '@/app/components/pages/dashboard/dashboard/insight-cards';
import type { DashboardCreditCard, DashboardRecentTransaction } from '@/app/types/dashboard';
import type { FinancialCommitment } from '@/app/types/financial-commitment';
import type { FinancialInsight } from '@/app/types/financial-insight';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastLogicalDate } from '@/app/types/forecast';

export type AttentionTone = 'urgent' | 'warning' | 'info';

export type AttentionItem = {
  id: string;
  tone: AttentionTone;
  title: string;
  detail: string;
  href: string | null;
  /** Texto curto da ação, exibido à direita do item. */
  action: string;
};

/** Faturas que vencem nesta janela (em dias) entram na lista de atenção. */
export const CARD_DUE_WINDOW_DAYS = 7;
const URGENT_DUE_DAYS = 3;
export const MAX_ATTENTION_ITEMS = 3;
/** Pagamentos a vencer nesta janela (em dias) entram na lista de atenção. */
const PAYABLE_WINDOW_DAYS = 7;

/** Insights só informativos (sem ação direta) ficam fora da lista de atenção do Dashboard. */
const INFORMATIONAL_INSIGHTS = new Set<FinancialInsight['type']>(['RECURRING_SHARE', 'FORECAST_BALANCE', 'INCOME_CHANGE']);

function dueLabel(distance: number) {
  if (distance < 0) return 'venceu';
  if (distance === 0) return 'vence hoje';
  if (distance === 1) return 'vence amanhã';
  return `vence em ${distance} dias`;
}

export function buildAttentionItems({
  cards,
  recentTransactions,
  insights,
  asOf,
  showValues,
  currency,
  commitments = null,
  budgetMissing = false,
}: {
  cards: DashboardCreditCard[];
  recentTransactions: DashboardRecentTransaction[];
  insights: FinancialInsight[];
  asOf: ForecastLogicalDate;
  showValues: boolean;
  currency: string;
  /** Compromissos do Forecast; `null` quando a seção falhou (aí vale o insight de pendências). */
  commitments?: FinancialCommitment[] | null;
  /** Mês em andamento sem nenhum orçamento definido. */
  budgetMissing?: boolean;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const card of cards) {
    const statement = card.nextStatement;
    if (!statement || statement.amount <= 0) continue;

    const distance = logicalDateDistance(statement.dueDate, asOf);
    if (distance > CARD_DUE_WINDOW_DAYS) continue;

    items.push({
      id: `card-due-${card.id}`,
      tone: distance <= URGENT_DUE_DAYS ? 'urgent' : 'warning',
      title: `Fatura ${card.name} ${dueLabel(distance)}`,
      detail: `${displayMoney(statement.amount, showValues, currency)} · dia ${String(statement.dueDate.day).padStart(2, '0')}/${String(statement.dueDate.month).padStart(2, '0')}`,
      href: `/contas/show/${card.id}`,
      action: 'Ver fatura',
    });
  }

  // Faturas já aparecem acima; aqui entram as demais contas a pagar vencidas ou próximas.
  for (const item of commitments ?? []) {
    if (item.direction !== 'PAYABLE' || item.type === 'CARD_STATEMENT' || item.amount === null) continue;

    const distance = logicalDateDistance(item.date, asOf);
    const overdue = item.state === 'OVERDUE';
    if (!overdue && distance > PAYABLE_WINDOW_DAYS) continue;

    items.push({
      id: `payable-${item.id}`,
      tone: overdue ? 'urgent' : 'warning',
      title: `Pagar ${item.title}`,
      detail: `${displayMoney(item.amount, showValues, currency)} · ${overdue ? 'venceu' : dueLabel(distance)}`,
      href: item.href,
      action: 'Ver',
    });
  }

  for (const insight of insights) {
    if (INFORMATIONAL_INSIGHTS.has(insight.type)) continue;
    // As pendências já saem dos compromissos quando eles carregaram.
    if (insight.type === 'UPCOMING_PENDING' && commitments !== null) continue;

    if (insight.type === 'SPENDING_ANOMALY') {
      const { categoryName, currentAmount, baselineMedian, percentageDifference } = insight.data;
      const ratio = baselineMedian > 0 ? currentAmount / baselineMedian : null;
      const how = ratio !== null && ratio >= 2
        ? `${ratio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x acima do normal`
        : ratio !== null
          ? `${Math.round(percentageDifference).toLocaleString('pt-BR')}% acima do normal`
          : 'fora do padrão';
      items.push({
        id: `insight-${insight.id}`,
        tone: 'info',
        title: `${categoryName} está ${how}`,
        detail: `${displayMoney(currentAmount, showValues, currency)} neste mês · costuma ser ${displayMoney(baselineMedian, showValues, currency)}`,
        href: insight.href,
        action: insight.href ? 'Ver' : '',
      });
      continue;
    }

    // Os demais insights já trazem a mensagem e o destino; só o tom é decidido aqui.
    const critical =
      insight.type === 'SAFE_TO_SPEND' ||
      (insight.type === 'CATEGORY_BUDGET' && insight.data.state === 'OVER');
    items.push({
      id: `insight-${insight.id}`,
      tone: critical ? 'warning' : 'info',
      title: insight.message,
      detail: insightDetail(insight, showValues, currency as SupportedCurrency),
      href: insight.href,
      action: insight.href ? 'Ver' : '',
    });
  }

  // Transações lançadas sem categoria distorcem os gráficos; só movimentações normais contam.
  const uncategorized = recentTransactions.filter(
    (transaction) => transaction.kind === 'NORMAL' && transaction.category === null,
  ).length;
  if (uncategorized > 0) {
    items.push({
      id: 'uncategorized-recent',
      tone: 'info',
      title: `${uncategorized} ${uncategorized === 1 ? 'transação recente sem categoria' : 'transações recentes sem categoria'}`,
      detail: 'Categorize para os gráficos e orçamentos ficarem certos.',
      href: '/transacoes',
      action: 'Revisar',
    });
  }

  if (budgetMissing) {
    items.push({
      id: 'budget-missing',
      tone: 'info',
      title: 'Defina um orçamento para o mês',
      detail: 'Sem orçamento não dá para saber se o gasto está no ritmo.',
      href: '/categorias',
      action: 'Definir',
    });
  }

  const rank: Record<AttentionTone, number> = { urgent: 0, warning: 1, info: 2 };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank[a.item.tone] - rank[b.item.tone] || a.index - b.index)
    .map(({ item }) => item)
    .slice(0, MAX_ATTENTION_ITEMS);
}
