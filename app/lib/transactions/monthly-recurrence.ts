import {
  compareLogicalDates,
  getLastDayOfMonth,
  isValidLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { TransactionStatus } from "@/app/types/transaction";

export {
  compareLogicalDates,
  formatIsoLogicalDate,
  formatPtBrLogicalDate,
  getLastDayOfMonth,
  isValidLogicalDate,
  parseIsoLogicalDate,
} from "@/app/lib/date/logical-date";
export type { LogicalDate } from "@/app/lib/date/logical-date";

export const MAX_MONTHLY_OCCURRENCES = 60;

export type MonthlyRecurrenceRule =
  | { mode: "count"; occurrences: number }
  | { mode: "endDate"; endDate: LogicalDate };

export type MonthlyOccurrence = LogicalDate & {
  status: TransactionStatus;
};

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
