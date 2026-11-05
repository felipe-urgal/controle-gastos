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

/** Fuso que define o "dia" do produto: o usuário é brasileiro, então "hoje" não vira às 21h (UTC). */
export const LOGICAL_TIME_ZONE = "America/Sao_Paulo";

const logicalDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOGICAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data civil (fuso do Brasil) de um instante real, como "agora" ou `createdAt`. */
export function logicalDateFromInstant(instant: Date): LogicalDate {
  if (Number.isNaN(instant.getTime())) {
    throw new Error("Instante de referência inválido");
  }

  const parts = Object.fromEntries(
    logicalDateFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** Data civil de hoje no fuso do Brasil. */
export function todayLogicalDate(): LogicalDate {
  return logicalDateFromInstant(new Date());
}

/**
 * Componentes UTC de um `Date` que já representa uma data lógica (meia-noite UTC).
 * Use só para aritmética de calendário; para "agora" use `logicalDateFromInstant`.
 */
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

/** "2026-11-05" → "05/11/2026". Só reordena as partes: use `parseIsoLogicalDate` antes se a entrada não for confiável. */
export function formatIsoDatePtBr(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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

/** Último dia do mês de `date`. */
export function lastDayOfMonth(date: LogicalDate): LogicalDate {
  const day = new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
  return { year: date.year, month: date.month, day };
}
