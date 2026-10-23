import type { Debt } from '@/app/types/debt';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type LogicalDay = { year: number; month: number; day: number };

const currencyOrder: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

function parseDue(value: string): LogicalDay {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function dayNumber(date: LogicalDay) {
  return Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;
}

/** Dias até o vencimento; negativo quando já venceu. */
export function daysUntil(dueDate: string, today: LogicalDay) {
  return dayNumber(parseDue(dueDate)) - dayNumber(today);
}

/** Dívida com saldo a pagar: a mesma regra do total devedor (saldo positivo e não arquivada). */
const isOwed = (debt: Debt) => debt.balance > 0 && debt.status !== 'ARCHIVED';

/** Moedas com saldo devedor, na ordem BRL, USD, EUR. */
export function owedCurrencies(debts: Debt[]): SupportedCurrency[] {
  const present = new Set(debts.filter(isOwed).map((debt) => debt.currency));
  return currencyOrder.filter((currency) => present.has(currency));
}

export type DebtWeight = { debt: Debt; share: number };

export type DebtsSummary = {
  currency: SupportedCurrency;
  owedCents: number;
  activeCount: number;
  /** Soma das parcelas das dívidas ativas que informam parcela. */
  monthlyInstallmentCents: number;
  withInstallmentCount: number;
  /** Dívidas ativas sem parcela informada: ficam fora das somas de parcela. */
  withoutInstallmentCount: number;
  overdue: Array<{ debt: Debt; daysLate: number }>;
  dueSoon: Debt[];
  nextDue: { debt: Debt; days: number } | null;
  /** Mês do último vencimento estimado: vencimento + parcelas restantes. */
  lastInstallment: { year: number; month: number } | null;
  weights: DebtWeight[];
};

export function summarizeDebts(debts: Debt[], currency: SupportedCurrency, today: LogicalDay): DebtsSummary {
  const own = debts.filter((debt) => debt.currency === currency);
  const active = own.filter((debt) => debt.status === 'ACTIVE');
  const owed = own.filter(isOwed);
  const owedCents = owed.reduce((sum, debt) => sum + debt.balance, 0);
  const withInstallment = active.filter((debt) => debt.installmentAmount !== null);

  const dated = active.filter((debt) => debt.dueDate).map((debt) => ({ debt, days: daysUntil(debt.dueDate as string, today) }));
  const overdue = dated
    .filter((item) => item.days < 0)
    .sort((left, right) => left.days - right.days)
    .map((item) => ({ debt: item.debt, daysLate: -item.days }));
  const upcoming = dated.filter((item) => item.days >= 0).sort((left, right) => left.days - right.days);

  let lastIndex: number | null = null;
  for (const debt of withInstallment) {
    if (!debt.dueDate || !debt.remainingInstallments || debt.remainingInstallments < 1) continue;
    const due = parseDue(debt.dueDate);
    const index = due.year * 12 + (due.month - 1) + debt.remainingInstallments - 1;
    if (lastIndex === null || index > lastIndex) lastIndex = index;
  }

  return {
    currency,
    owedCents,
    activeCount: active.length,
    monthlyInstallmentCents: withInstallment.reduce((sum, debt) => sum + (debt.installmentAmount ?? 0), 0),
    withInstallmentCount: withInstallment.length,
    withoutInstallmentCount: active.length - withInstallment.length,
    overdue,
    dueSoon: upcoming.filter((item) => item.days <= 7).map((item) => item.debt),
    nextDue: upcoming[0] ?? null,
    lastInstallment: lastIndex === null ? null : { year: Math.floor(lastIndex / 12), month: (lastIndex % 12) + 1 },
    weights: [...owed]
      .sort((left, right) => right.balance - left.balance)
      .map((debt) => ({ debt, share: owedCents > 0 ? (debt.balance / owedCents) * 100 : 0 })),
  };
}

export type InstallmentMonth = { year: number; month: number; cents: number; count: number };

/**
 * Parcelas previstas nos próximos `months` meses (a partir do mês de `today`), pelo vencimento e
 * pelas parcelas restantes de cada dívida ativa. A parcela já vencida e não paga conta no mês atual;
 * parcelas seguintes de uma dívida atrasada que caem antes do mês atual não entram (não se sabe se foram pagas).
 */
export function installmentLoad(debts: Debt[], currency: SupportedCurrency, today: LogicalDay, months = 12): InstallmentMonth[] {
  const base = today.year * 12 + (today.month - 1);
  const result: InstallmentMonth[] = Array.from({ length: months }, (_, offset) => {
    const index = base + offset;
    return { year: Math.floor(index / 12), month: (index % 12) + 1, cents: 0, count: 0 };
  });

  for (const debt of debts) {
    if (debt.currency !== currency || debt.status !== 'ACTIVE') continue;
    if (debt.installmentAmount === null || !debt.dueDate || !debt.remainingInstallments) continue;
    const due = parseDue(debt.dueDate);
    const first = due.year * 12 + (due.month - 1);
    for (let step = 0; step < debt.remainingInstallments; step += 1) {
      let offset = first + step - base;
      if (offset < 0) {
        if (step !== 0) continue;
        offset = 0;
      }
      if (offset >= months) break;
      result[offset].cents += debt.installmentAmount;
      result[offset].count += 1;
    }
  }

  return result;
}

export function dueLabel(days: number) {
  if (days < 0) return `Vencida há ${-days} ${days === -1 ? 'dia' : 'dias'}`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Em ${days} dias`;
}
