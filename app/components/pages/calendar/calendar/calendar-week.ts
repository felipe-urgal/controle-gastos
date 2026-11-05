import type { CalendarEvent } from '@/app/types/calendar';

/** Domingo da semana de `date` (a mesma convenção do grade do mês), à meia-noite local. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Os sete dias (domingo a sábado) da semana de `date`. */
export function weekDates(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function isSameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

/**
 * Só lançamento normal ainda pendente muda de data pelo calendário (arrastar ou escolher a data): é um compromisso
 * que ainda não aconteceu. Transferência, fatura, parcela de dívida, meta e investimento têm regras próprias.
 */
export function canRescheduleEvent(event: Pick<CalendarEvent, 'sourceKind' | 'status'>) {
  return event.sourceKind === 'TRANSACTION' && event.status === 'PENDING';
}

/** Corpo da atualização de data; `null` quando soltar no mesmo dia não muda nada. */
export function rescheduleBody(event: Pick<CalendarEvent, 'date'>, target: Date) {
  const body = { year: target.getFullYear(), month: target.getMonth() + 1, day: target.getDate() };
  const same = body.year === event.date.year && body.month === event.date.month && body.day === event.date.day;
  return same ? null : body;
}
