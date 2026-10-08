export type LogicalDate = {
  year: number;
  month: number;
  day: number;
};

function logicalDateNumber(date: LogicalDate) {
  return date.year * 10000 + date.month * 100 + date.day;
}

export function compareLogicalDates(a: LogicalDate, b: LogicalDate) {
  return Math.sign(logicalDateNumber(a) - logicalDateNumber(b));
}

export function logicalDateFromUtcInstant(now: Date): LogicalDate {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Instante de referência inválido");
  }

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
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

export function addDaysToLogicalDate(date: LogicalDate, days: number): LogicalDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day));
  value.setUTCDate(value.getUTCDate() + days);
  return logicalDateFromUtcInstant(value);
}

/** Dias corridos de `from` até `to` (positivo quando `to` é posterior). */
export function daysBetweenLogicalDates(from: LogicalDate, to: LogicalDate) {
  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      86_400_000,
  );
}
