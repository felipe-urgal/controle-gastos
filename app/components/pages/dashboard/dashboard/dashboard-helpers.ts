import { wrappableMoney } from '@/app/lib/currency/wrappable-money';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { DashboardRecentTransaction, DashboardSection } from '@/app/types/dashboard';
import { FinancialCommitment } from '@/app/types/financial-commitment';

export function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? wrappableMoney(formatCurrency(amount, currency)) : '••••';
}

export function signedMoney(amount: number, showValues: boolean, currency: string) {
  if (!showValues) return '••••';
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${wrappableMoney(formatCurrency(Math.abs(amount), currency))}`;
}

export function periodOffset(periodValue: string, offset: number) {
  const [year, month] = periodValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

const DASHBOARD_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export const DEFAULT_DASHBOARD_CURRENCY = 'BRL';

/** Período (`AAAA-MM`) e moeda vindos da URL; valor ausente ou inválido cai no padrão. */
export function parseDashboardUrlState(
  params: { get(name: string): string | null },
  defaultPeriod: string,
) {
  const rawPeriod = params.get('m') ?? '';
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(rawPeriod);
  const period = match && Number(match[1]) >= 2000 && Number(match[1]) <= 2100 ? rawPeriod : defaultPeriod;
  const rawCurrency = params.get('c') ?? '';
  const currency = DASHBOARD_CURRENCIES.find((item) => item === rawCurrency) ?? DEFAULT_DASHBOARD_CURRENCY;

  return { period, currency };
}

export function monthLabel(periodValue: string) {
  const [year, month] = periodValue.split('-').map(Number);
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  // Só a primeira letra: `capitalize` do CSS gerava "Outubro De 2026".
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function compactMonthLabel(month: number, year: number) {
  return new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
    .replace('.', '');
}

export function dashboardLogicalDateLabel(date: { year: number; month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}`;
}

export function transactionDateLabel(transaction: DashboardRecentTransaction) {
  return new Date(
    Date.UTC(transaction.year, transaction.month - 1, transaction.day),
  )
    .toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
    .replace('.', '');
}

export function logicalDateDistance(
  item: { year: number; month: number; day: number },
  asOf: { year: number; month: number; day: number },
) {
  const itemTime = Date.UTC(item.year, item.month - 1, item.day);
  const asOfTime = Date.UTC(asOf.year, asOf.month - 1, asOf.day);
  return Math.round((itemTime - asOfTime) / 86_400_000);
}

export function commitmentBadge(
  item: { year: number; month: number; day: number },
  asOf: { year: number; month: number; day: number } | null,
) {
  if (!asOf) return '';
  const distance = logicalDateDistance(item, asOf);
  if (distance < 0) return 'Vencido';
  if (distance === 0) return 'Hoje';
  if (distance === 1) return 'Em 1 dia';
  return `Em ${distance} dias`;
}

export function sectionState<T>(section: DashboardSection<T>) {
  return section.status === 'SUCCESS'
    ? { data: section.data, loading: false, error: '' }
    : { data: null, loading: false, error: section.message };
}

export const COMMITMENT_DIRECTION_LABELS = {
  PAYABLE: 'A pagar',
  RECEIVABLE: 'A receber',
  MILESTONE: 'Marcos',
} as const;

export function groupCommitments(
  items: readonly FinancialCommitment[],
  limitPerGroup: number,
) {
  return (['PAYABLE', 'RECEIVABLE', 'MILESTONE'] as const)
    .map((direction) => ({
      direction,
      label: COMMITMENT_DIRECTION_LABELS[direction],
      items: items
        .filter((item) => item.direction === direction)
        .slice(0, limitPerGroup),
    }))
    .filter((group) => group.items.length > 0);
}

export function commitmentCountWithinTenDays(
  items: readonly FinancialCommitment[],
  asOf: { year: number; month: number; day: number },
) {
  return items.filter((item) => {
    if (item.state === 'OVERDUE') return true;
    const distance = logicalDateDistance(item.date, asOf);
    return distance >= 0 && distance <= 10;
  }).length;
}
