import type { CardLogicalDate, CreditCardStatementItem, CreditCardStatementsData } from '@/app/types/credit-card';

function dayNumber(date: CardLogicalDate) {
  return Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;
}

/** Dias de `from` até `to`; negativo quando `to` já passou. */
export function daysBetween(from: CardLogicalDate, to: CardLogicalDate) {
  return Math.round(dayNumber(to) - dayNumber(from));
}

/** Fatura que já fechou, está em aberto e tem valor: é a única que dá para pagar. */
export function isPayableStatement(statement: CreditCardStatementItem, today: CardLogicalDate) {
  return statement.status === 'OPEN' && statement.total > 0 && daysBetween(today, statement.closingDate) <= 0;
}

/** A fatura mais urgente para pagar (menor vencimento); null quando não há nenhuma pagável. */
export function pickStatementToPay(data: Pick<CreditCardStatementsData, 'current' | 'history'>, today: CardLogicalDate) {
  const payable = [...data.history, data.current].filter((statement) => isPayableStatement(statement, today));
  payable.sort((left, right) => dayNumber(left.dueDate) - dayNumber(right.dueDate));
  return payable[0] ?? null;
}

/** "vence hoje", "vence amanhã", "vence em 5 dias" ou "venceu há 3 dias". */
export function dueDistanceLabel(dueDate: CardLogicalDate, today: CardLogicalDate) {
  const days = daysBetween(today, dueDate);
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  if (days > 1) return `vence em ${days} dias`;
  const late = Math.abs(days);
  return `venceu há ${late} ${late === 1 ? 'dia' : 'dias'}`;
}

/** "fecha hoje", "fecha amanhã" ou "fecha em 8 dias"; fatura já fechada diz "fechou". */
export function closingDistanceLabel(closingDate: CardLogicalDate, today: CardLogicalDate) {
  const days = daysBetween(today, closingDate);
  if (days === 0) return 'fecha hoje';
  if (days === 1) return 'fecha amanhã';
  if (days > 1) return `fecha em ${days} dias`;
  return 'fechada';
}

export function usagePercent(card: Pick<CreditCardStatementsData['card'], 'creditLimit' | 'usedLimit'>) {
  if (card.creditLimit <= 0) return 0;
  return Math.min(100, Math.round((card.usedLimit / card.creditLimit) * 100));
}

export type LimitTone = 'ok' | 'near' | 'over';

export function limitTone(card: Pick<CreditCardStatementsData['card'], 'creditLimit' | 'usedLimit' | 'overLimit'>): LimitTone {
  if (card.overLimit > 0) return 'over';
  return card.creditLimit > 0 && card.usedLimit >= card.creditLimit * 0.9 ? 'near' : 'ok';
}
