import { formatCurrency } from '@/app/lib/currency/format-currency';
import { formatIsoLogicalDate, logicalDateFromUtcInstant } from '@/app/lib/date/logical-date';
import { ExchangeRateModel } from '@/app/types/exchange-rate';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { NetWorthValuationBasis } from '@/app/types/net-worth';

export const currencies: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

export function currentPeriod() {
  const today = logicalDateFromUtcInstant(new Date());
  return { year: today.year, month: today.month };
}

export function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

export function displayPercent(value: number | null, showValues: boolean) {
  if (!showValues) return '••••';
  if (value === null) return '—';

  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatted}%`;
}

export function currentIsoDate() {
  return formatIsoLogicalDate(logicalDateFromUtcInstant(new Date()));
}

export function refreshFailureMessage(mutation: string | null, what: string) {
  return mutation
    ? `A taxa foi ${mutation} com sucesso, mas ${what}. Recarregue a página para ver o estado atual.`
    : null;
}

export function rateProvenanceLabel(rate: ExchangeRateModel['provenance'], from: string, to: string) {
  if (rate === 'PTAX_CROSS') {
    return `Derivada das PTAX ${from}/BRL e ${to}/BRL (referência, não é cotação direta)`;
  }
  if (rate === 'PTAX_DIRECT') return 'PTAX direta (BCB)';
  return 'Taxa manual';
}

export function periodInputValue(period: { year: number; month: number }) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

export function parsePeriodInput(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export function logicalDateLabel(date: { year: number; month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
}

export function valuationBasisLabel(basis: NetWorthValuationBasis) {
  if (basis === 'POSITION_MARKET') return 'posições a valor de mercado';
  if (basis === 'POSITION_COST') return 'posições a custo';
  if (basis === 'MIXED') return 'base mista';
  return 'saldo transacional';
}

export function quoteDateTimeLabel(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function rateRatioLabel(rate: { numerator: number; denominator: number }) {
  return (rate.numerator / rate.denominator).toLocaleString('pt-BR', {
    maximumFractionDigits: 6,
  });
}

export function decimalRateToRatio(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) return null;

  const [integerPart, fractionPart = ''] = normalized.split('.');
  const denominator = 10 ** fractionPart.length;
  const numerator = Number(`${integerPart}${fractionPart}`);

  if (!Number.isSafeInteger(numerator) || numerator <= 0) return null;

  const gcd = (left: number, right: number): number =>
    right === 0 ? left : gcd(right, left % right);
  const divisor = gcd(numerator, denominator);

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

export function monthShort(year: number, month: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  })
    .format(new Date(year, month - 1, 1))
    .replace('.', '');
}
