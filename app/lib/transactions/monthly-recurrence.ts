import { TransactionStatus } from "@/app/types/transaction";

export const MAX_MONTHLY_OCCURRENCES = 60;

export type LogicalDate = {
  year: number;
  month: number;
  day: number;
};

export type MonthlyRecurrenceRule =
  | { mode: "count"; occurrences: number }
  | { mode: "endDate"; endDate: LogicalDate };

export type MonthlyOccurrence = LogicalDate & {
  status: TransactionStatus;
};

function logicalDateNumber(date: LogicalDate) {
  return date.year * 10000 + date.month * 100 + date.day;
}

export function compareLogicalDates(a: LogicalDate, b: LogicalDate) {
  return Math.sign(logicalDateNumber(a) - logicalDateNumber(b));
}

export function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidLogicalDate(date: LogicalDate) {
  if (!Number.isInteger(date.year) || date.year < 2000 || date.year > 2100) {
    return false;
  }

  if (!Number.isInteger(date.month) || date.month < 1 || date.month > 12) {
    return false;
  }

  if (!Number.isInteger(date.day) || date.day < 1) {
    return false;
  }

  return date.day <= getLastDayOfMonth(date.year, date.month);
}

export function parseIsoLogicalDate(value: string): LogicalDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  return isValidLogicalDate(date) ? date : null;
}

export function formatIsoLogicalDate(date: LogicalDate) {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatPtBrLogicalDate(date: LogicalDate) {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${String(date.year).padStart(4, "0")}`;
}

export function getMonthlyDateAtIndex(start: LogicalDate, index: number) {
  if (!isValidLogicalDate(start) || !Number.isInteger(index) || index < 0) {
    throw new Error("Data mensal inválida");
  }

  const absoluteMonth = start.year * 12 + (start.month - 1) + index;
  const year = Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;

  return {
    year,
    month,
    day: Math.min(start.day, getLastDayOfMonth(year, month)),
  };
}

export function generateMonthlyDates(
  start: LogicalDate,
  rule: MonthlyRecurrenceRule
): LogicalDate[] {
  if (!isValidLogicalDate(start)) {
    throw new Error("Data inicial inválida");
  }

  if (rule.mode === "count") {
    if (
      !Number.isInteger(rule.occurrences) ||
      rule.occurrences < 2 ||
      rule.occurrences > MAX_MONTHLY_OCCURRENCES
    ) {
      throw new Error(
        `A recorrência deve ter entre 2 e ${MAX_MONTHLY_OCCURRENCES} ocorrências`
      );
    }

    return Array.from({ length: rule.occurrences }, (_, index) =>
      getMonthlyDateAtIndex(start, index)
    );
  }

  if (!isValidLogicalDate(rule.endDate)) {
    throw new Error("Data final inválida");
  }

  if (compareLogicalDates(rule.endDate, start) <= 0) {
    throw new Error("A data final deve ser posterior à data inicial");
  }

  const dates: LogicalDate[] = [];

  for (let index = 0; index < MAX_MONTHLY_OCCURRENCES; index += 1) {
    const date = getMonthlyDateAtIndex(start, index);
    if (compareLogicalDates(date, rule.endDate) > 0) break;
    dates.push(date);
  }

  if (dates.length < 2) {
    throw new Error("A data final deve incluir pelo menos duas ocorrências");
  }

  const nextDate = getMonthlyDateAtIndex(start, dates.length);
  if (
    dates.length === MAX_MONTHLY_OCCURRENCES &&
    compareLogicalDates(nextDate, rule.endDate) <= 0
  ) {
    throw new Error(
      `A recorrência pode ter no máximo ${MAX_MONTHLY_OCCURRENCES} ocorrências`
    );
  }

  return dates;
}

export function buildMonthlyOccurrences(args: {
  start: LogicalDate;
  rule: MonthlyRecurrenceRule;
  firstStatus: TransactionStatus;
}): MonthlyOccurrence[] {
  const dates = generateMonthlyDates(args.start, args.rule);

  return dates.map((date, index) => ({
    ...date,
    status: index === 0 ? args.firstStatus : "PENDING",
  }));
}
