import {
  compareLogicalDates,
  logicalDateFromUtcInstant,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import {
  getLogicalRecurrenceDateAtIndex,
  type LogicalRecurrenceFrequency,
} from '@/app/lib/transactions/logical-recurrence';

export function addLogicalDaysUtc(date: LogicalDate, days: number): LogicalDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

export function recurringWindowStart(
  months: number,
  now: Date = new Date(),
): { year: number; month: number } {
  if (!Number.isInteger(months) || months < 1) {
    throw new Error('Janela de recorrência inválida');
  }

  const reference = logicalDateFromUtcInstant(now);
  const value = new Date(
    Date.UTC(reference.year, reference.month - months, 1),
  );
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
  };
}

export function firstRecurrenceOnOrAfter(
  start: LogicalDate,
  frequency: LogicalRecurrenceFrequency,
  interval: number,
  reference: LogicalDate,
) {
  let candidate = start;

  for (
    let index = 0;
    index < 1200 && compareLogicalDates(candidate, reference) < 0;
    index += 1
  ) {
    candidate = getLogicalRecurrenceDateAtIndex({
      start: candidate,
      frequency,
      interval,
      index: 1,
    });
  }

  if (compareLogicalDates(candidate, reference) < 0) {
    throw new Error('Não foi possível calcular a próxima recorrência');
  }

  return candidate;
}

export function firstFutureRecurrence(
  start: LogicalDate,
  frequency: LogicalRecurrenceFrequency,
  interval: number,
  now: Date = new Date(),
) {
  return firstRecurrenceOnOrAfter(
    start,
    frequency,
    interval,
    logicalDateFromUtcInstant(now),
  );
}

export function defaultRecurrenceOccurrences(
  frequency: LogicalRecurrenceFrequency,
  interval: number,
) {
  if (frequency === 'WEEKLY') return interval === 2 ? 26 : 52;
  if (frequency === 'MONTHLY') return interval === 3 ? 4 : 12;
  return 5;
}
