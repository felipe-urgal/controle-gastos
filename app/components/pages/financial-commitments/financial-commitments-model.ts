import type {
  FinancialCommitment,
  FinancialCommitmentDate,
  FinancialCommitmentDirection,
  FinancialCommitmentsData,
} from '@/app/types/financial-commitment';

export type CommitmentFilter = 'all' | FinancialCommitmentDirection;

export type CommitmentDay = {
  key: string;
  label: string;
  /** Receitas a receber menos despesas a pagar do dia; null quando só há itens sem valor. */
  net: number | null;
  items: FinancialCommitment[];
};

export type CommitmentWeek = {
  key: string;
  label: string;
  payable: number;
  receivable: number;
  payableWidth: number;
  receivableWidth: number;
};

type Money = (cents: number) => string;

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function utcDay(date: FinancialCommitmentDate) {
  return Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;
}

function fromDayNumber(dayNumber: number): FinancialCommitmentDate {
  const date = new Date(dayNumber * 86_400_000);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function daysBetween(from: FinancialCommitmentDate, to: FinancialCommitmentDate) {
  return utcDay(to) - utcDay(from);
}

export function shortDate(date: FinancialCommitmentDate) {
  return `${date.day} ${MONTHS[date.month - 1]}`;
}

export function formatDate(date: FinancialCommitmentDate) {
  return [date.day, date.month].map((part) => String(part).padStart(2, '0')).join('/') + '/' + date.year;
}

function dayTitle(date: FinancialCommitmentDate, asOf: FinancialCommitmentDate) {
  const offset = daysBetween(asOf, date);
  const weekday = WEEKDAYS[new Date(utcDay(date) * 86_400_000).getUTCDay()];
  const base = `${weekday}, ${shortDate(date).replace(' ', ' de ')}`;
  if (offset === 0) return `Hoje · ${base}`;
  if (offset === 1) return `Amanhã · ${base}`;
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} · em ${offset} dias`;
}

export function overdueLabel(date: FinancialCommitmentDate, asOf: FinancialCommitmentDate) {
  const days = daysBetween(date, asOf);
  return days <= 1 ? 'há 1 dia' : `há ${days} dias`;
}

/** Positivo para a receber, negativo para a pagar, null para marcos ou valor desconhecido. */
export function signedAmount(item: FinancialCommitment) {
  if (item.amount === null || item.direction === 'MILESTONE') return null;
  return item.direction === 'PAYABLE' ? -item.amount : item.amount;
}

export function filterItems(items: FinancialCommitment[], filter: CommitmentFilter) {
  return filter === 'all' ? items : items.filter((item) => item.direction === filter);
}

/** Vencidos ficam em bloco próprio; o restante é agrupado por dia, em ordem cronológica. */
export function splitCommitments(items: FinancialCommitment[]) {
  return {
    overdue: items.filter((item) => item.state === 'OVERDUE'),
    upcoming: items.filter((item) => item.state !== 'OVERDUE'),
  };
}

export function groupByDay(items: FinancialCommitment[], asOf: FinancialCommitmentDate): CommitmentDay[] {
  const groups = new Map<number, FinancialCommitment[]>();
  for (const item of items) {
    const key = utcDay(item.date);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([key, dayItems]) => {
      const amounts = dayItems.map(signedAmount).filter((value): value is number => value !== null);
      return {
        key: String(key),
        label: dayTitle(fromDayNumber(key), asOf),
        net: amounts.length === 0 ? null : amounts.reduce((sum, value) => sum + value, 0),
        items: dayItems,
      };
    });
}

/** Semanas corridas a partir de hoje; só entram as que têm valor a pagar ou a receber. */
export function weekBuckets(items: FinancialCommitment[], asOf: FinancialCommitmentDate): CommitmentWeek[] {
  const start = utcDay(asOf);
  const weeks = new Map<number, { payable: number; receivable: number }>();

  for (const item of items) {
    if (item.amount === null || item.direction === 'MILESTONE' || item.state === 'OVERDUE') continue;
    const index = Math.max(0, Math.floor((utcDay(item.date) - start) / 7));
    const week = weeks.get(index) ?? { payable: 0, receivable: 0 };
    if (item.direction === 'PAYABLE') week.payable += item.amount;
    else week.receivable += item.amount;
    weeks.set(index, week);
  }

  const peak = Math.max(0, ...[...weeks.values()].flatMap((week) => [week.payable, week.receivable]));
  return [...weeks.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, week]) => ({
      key: String(index),
      label: `${shortDate(fromDayNumber(start + index * 7))} – ${shortDate(fromDayNumber(start + index * 7 + 6))}`,
      ...week,
      payableWidth: peak === 0 ? 0 : Math.round((week.payable / peak) * 100),
      receivableWidth: peak === 0 ? 0 : Math.round((week.receivable / peak) * 100),
    }));
}

/** Saldo previsto do horizonte: o que entra menos o que sai (negativo quando saem mais do que entram). */
export function forecastBalance(totals: FinancialCommitmentsData['totals']) {
  return totals.receivable.amount - totals.payable.amount;
}

export function dayMonth(date: FinancialCommitmentDate) {
  return [date.day, date.month].map((part) => String(part).padStart(2, '0')).join('/');
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function buildLede(data: FinancialCommitmentsData, money: Money) {
  const { payable, receivable, milestoneCount, overdueCount } = data.totals;
  if (payable.count === 0 && receivable.count === 0 && milestoneCount === 0 && overdueCount === 0) {
    return `Nada previsto para os próximos ${data.days} dias. Compromissos aparecem aqui quando houver lançamentos pendentes, parcelas, faturas, dívidas ou metas com prazo.`;
  }

  const parts = [
    `Você tem ${plural(payable.count, 'compromisso a pagar', 'compromissos a pagar')} e ${plural(receivable.count, 'entrada a receber', 'entradas a receber')} nos próximos ${data.days} dias.`,
  ];
  const net = forecastBalance(data.totals);
  if (payable.count > 0 || receivable.count > 0) {
    parts.push(
      net === 0
        ? 'O que entra cobre exatamente o que sai.'
        : net < 0
          ? `Descontando o que entra, saem ${money(Math.abs(net))} a mais do que entram.`
          : `Descontando o que sai, entram ${money(net)} a mais do que saem.`,
    );
  }
  if (overdueCount > 0) parts.push(`Há ${plural(overdueCount, 'item vencido', 'itens vencidos')}.`);
  return parts.join(' ');
}
