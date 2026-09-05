import { TransactionStatus } from "@/app/types/transaction";
import {
  compareLogicalDates,
  getLastDayOfMonth,
  isValidLogicalDate,
  LogicalDate,
} from "@/app/lib/transactions/monthly-recurrence";

export const MAX_RECURRENCE_OCCURRENCES = 60;

export type LogicalRecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export type LogicalRecurrenceRule = {
  frequency: LogicalRecurrenceFrequency;
  interval: number;
} & (
  | { mode: "count"; occurrences: number }
  | { mode: "endDate"; endDate: LogicalDate }
);

export type LogicalRecurrenceOccurrence = LogicalDate & {
  status: TransactionStatus;
};

export function isSupportedRecurrenceFrequencyInterval(
  frequency: LogicalRecurrenceFrequency,
  interval: number
) {
  if (!Number.isInteger(interval)) return false;

  if (frequency === "WEEKLY") return interval === 1 || interval === 2;
  if (frequency === "MONTHLY") return interval === 1 || interval === 3;
  return frequency === "YEARLY" && interval === 1;
}

function validateFrequencyAndInterval(
  frequency: LogicalRecurrenceFrequency,
  interval: number
) {
  if (!Number.isInteger(interval) || interval < 1 || interval > 12) {
    throw new Error("Intervalo de recorrência inválido");
  }

  if (!isSupportedRecurrenceFrequencyInterval(frequency, interval)) {
    throw new Error("Combinação de recorrência fora do MVP");
  }
}

function addUtcDays(start: LogicalDate, days: number): LogicalDate {
  const date = new Date(
    Date.UTC(start.year, start.month - 1, start.day + days)
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getMonthlyDateAtIndex(
  start: LogicalDate,
  interval: number,
  index: number
): LogicalDate {
  const absoluteMonth =
    start.year * 12 + (start.month - 1) + interval * index;
  const year = Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;

  return {
    year,
    month,
    day: Math.min(start.day, getLastDayOfMonth(year, month)),
  };
}

function getYearlyDateAtIndex(
  start: LogicalDate,
  interval: number,
  index: number
): LogicalDate {
  const year = start.year + interval * index;

  return {
    year,
    month: start.month,
    day: Math.min(start.day, getLastDayOfMonth(year, start.month)),
  };
}

export function getLogicalRecurrenceDateAtIndex(args: {
  start: LogicalDate;
  frequency: LogicalRecurrenceFrequency;
  interval: number;
  index: number;
}): LogicalDate {
  if (!isValidLogicalDate(args.start)) {
    throw new Error("Data inicial inválida");
  }
  if (!Number.isInteger(args.index) || args.index < 0) {
    throw new Error("Índice de recorrência inválido");
  }

  validateFrequencyAndInterval(args.frequency, args.interval);

  switch (args.frequency) {
    case "WEEKLY":
      return addUtcDays(args.start, 7 * args.interval * args.index);
    case "MONTHLY":
      return getMonthlyDateAtIndex(args.start, args.interval, args.index);
    case "YEARLY":
      return getYearlyDateAtIndex(args.start, args.interval, args.index);
  }
}

export function generateLogicalRecurrenceDates(
  start: LogicalDate,
  rule: LogicalRecurrenceRule
): LogicalDate[] {
  if (!isValidLogicalDate(start)) {
    throw new Error("Data inicial inválida");
  }

  validateFrequencyAndInterval(rule.frequency, rule.interval);

  if (rule.mode === "count") {
    if (
      !Number.isInteger(rule.occurrences) ||
      rule.occurrences < 2 ||
      rule.occurrences > MAX_RECURRENCE_OCCURRENCES
    ) {
      throw new Error(
        `A recorrência deve ter entre 2 e ${MAX_RECURRENCE_OCCURRENCES} ocorrências`
      );
    }

    return Array.from({ length: rule.occurrences }, (_, index) =>
      getLogicalRecurrenceDateAtIndex({
        start,
        frequency: rule.frequency,
        interval: rule.interval,
        index,
      })
    );
  }

  if (!isValidLogicalDate(rule.endDate)) {
    throw new Error("Data final inválida");
  }

  if (compareLogicalDates(rule.endDate, start) <= 0) {
    throw new Error("A data final deve ser posterior à data inicial");
  }

  const dates: LogicalDate[] = [];

  for (let index = 0; index < MAX_RECURRENCE_OCCURRENCES; index += 1) {
    const date = getLogicalRecurrenceDateAtIndex({
      start,
      frequency: rule.frequency,
      interval: rule.interval,
      index,
    });

    if (compareLogicalDates(date, rule.endDate) > 0) break;
    dates.push(date);
  }

  if (dates.length < 2) {
    throw new Error("A data final deve incluir pelo menos duas ocorrências");
  }

  const nextDate = getLogicalRecurrenceDateAtIndex({
    start,
    frequency: rule.frequency,
    interval: rule.interval,
    index: dates.length,
  });

  if (
    dates.length === MAX_RECURRENCE_OCCURRENCES &&
    compareLogicalDates(nextDate, rule.endDate) <= 0
  ) {
    throw new Error(
      `A recorrência pode ter no máximo ${MAX_RECURRENCE_OCCURRENCES} ocorrências`
    );
  }

  return dates;
}

export function buildLogicalRecurrenceOccurrences(args: {
  start: LogicalDate;
  rule: LogicalRecurrenceRule;
  firstStatus: TransactionStatus;
}): LogicalRecurrenceOccurrence[] {
  return generateLogicalRecurrenceDates(args.start, args.rule).map(
    (date, index) => ({
      ...date,
      status: index === 0 ? args.firstStatus : "PENDING",
    })
  );
}
