import type { DashboardComparisonMetric } from '@/app/types/dashboard';
import type {
  MonthlyClosingLogicalDate,
  MonthlyClosingReadiness,
  MonthlyClosingRetrospective,
} from '@/app/types/monthly-closing';

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export type ClosingTone = 'good' | 'bad' | 'flat';

export type ClosingTodoItem = {
  key: 'pending' | 'statements';
  ok: boolean;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
};

type Money = (cents: number) => string;

export function periodValue(year: number, month: number) {
  return String(year) + '-' + String(month).padStart(2, '0');
}

export function monthName(month: number) {
  return MONTH_NAMES[month - 1] ?? '';
}

export function monthTitle(year: number, month: number) {
  return monthName(month) + ' de ' + year;
}

export function shiftPeriod(year: number, month: number, offset: number) {
  const absolute = year * 12 + (month - 1) + offset;
  return { year: Math.floor(absolute / 12), month: (((absolute % 12) + 12) % 12) + 1 };
}

export function formatLogicalDate(date: MonthlyClosingLogicalDate) {
  return [date.day, date.month].map((part) => String(part).padStart(2, '0')).join('/') + '/' + date.year;
}

/** Parcela da receita que virou despesa, limitada a 0–100 para a barra de proporção. */
export function spentShare({ income, expense }: { income: number; expense: number }) {
  if (expense <= 0) return 0;
  if (income <= 0) return 100;
  return Math.min(100, Math.round((expense / income) * 100));
}

/** Frase de abertura em linguagem natural; `previousMonth` nomeia a base da comparação. */
export function summaryLede({
  summary,
  comparison,
  previousMonth,
  money,
}: {
  summary: MonthlyClosingRetrospective['summary'];
  comparison: MonthlyClosingRetrospective['comparison'];
  previousMonth: string;
  money: Money;
}) {
  if (summary.income === 0 && summary.expense === 0) {
    return 'Nenhuma receita ou despesa realizada nesta moeda no período. O que estiver pendente aparece em “Para fechar o mês”.';
  }

  const base = 'Você ganhou ' + money(summary.income) + ' e gastou ' + money(summary.expense) + '.';

  if (summary.balance < 0) {
    return base + ' As saídas superaram as entradas em ' + money(Math.abs(summary.balance)) + '.';
  }

  const kept = summary.income > 0 ? 'Ficou com ' + Math.round((summary.balance / summary.income) * 100) + '% da receita' : '';
  const percentage = comparison.balance.percentage;
  if (!kept) return base;
  if (percentage === null || percentage === 0) return base + ' ' + kept + '.';

  return base + ' ' + kept + ', ' + Math.abs(percentage) + '% ' + (percentage > 0 ? 'mais' : 'menos') + ' que em ' + previousMonth + '.';
}

/** `lowerIsBetter` vale para despesas: cair é bom. */
export function describeDelta(
  metric: DashboardComparisonMetric,
  previousMonth: string,
  lowerIsBetter = false,
): { text: string; tone: ClosingTone } {
  const { percentage } = metric;
  if (percentage === null) return { text: 'Sem base comparável', tone: 'flat' };
  if (percentage === 0) return { text: 'Igual a ' + previousMonth, tone: 'flat' };

  const up = percentage > 0;
  const good = lowerIsBetter ? !up : up;
  return {
    text: (up ? '▲ ' : '▼ ') + Math.abs(percentage) + '% vs. ' + previousMonth,
    tone: good ? 'good' : 'bad',
  };
}

export function budgetUsage(planning: MonthlyClosingRetrospective['planning']) {
  if (planning.budget <= 0) return null;
  const percent = Math.round((planning.realized / planning.budget) * 100);
  return {
    percent,
    barPercent: Math.min(100, percent),
    remaining: planning.budget - planning.realized,
  };
}

/** Itens do bloco “Para fechar o mês”; cada um aponta para onde o usuário resolve. */
export function buildTodoItems({
  readiness,
  money,
  pendingHref,
}: {
  readiness: MonthlyClosingReadiness;
  money: Money;
  pendingHref: string;
}): ClosingTodoItem[] {
  const pending = readiness.pendingTransactions;
  const statements = readiness.cardStatements;
  const toReview = statements.items.filter((statement) => statement.state !== 'PAID');

  return [
    {
      key: 'pending',
      ok: pending.totalCount === 0,
      title: pending.totalCount === 0 ? 'Nenhum lançamento pendente' : pending.totalCount + ' lançamento(s) pendente(s)',
      detail:
        pending.totalCount === 0
          ? 'Tudo o que aconteceu no período já foi concluído.'
          : 'Só entram no saldo quando forem concluídos: + ' + money(pending.income.amount) + ' e − ' + money(pending.expense.amount) + '.',
      actionLabel: 'Revisar pendências',
      href: pendingHref,
    },
    {
      key: 'statements',
      ok: toReview.length === 0,
      title:
        statements.count === 0
          ? 'Nenhuma fatura a revisar'
          : toReview.length === 0
            ? 'Faturas do período pagas'
            : statements.openCount + ' fatura(s) em aberto',
      detail:
        toReview.length === 0
          ? 'Não há fatura com valor pendente neste período.'
          : statements.overdueCount > 0
            ? statements.overdueCount + ' vencida(s).'
            : 'Nenhuma vencida.',
      actionLabel: 'Ver faturas',
      href: toReview[0]?.href ?? '/contas',
    },
  ];
}
