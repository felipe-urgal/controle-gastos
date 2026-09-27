import {
  compareLogicalDates,
  isValidLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";

function assertBillingDay(day: number, field: string) {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`${field} deve estar entre 1 e 31`);
  }
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDate(year: number, month: number, day: number): LogicalDate {
  return {
    year,
    month,
    day: Math.min(day, daysInMonth(year, month)),
  };
}

function addMonths(year: number, month: number, amount: number) {
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

export type CreditCardStatementCycle = {
  closingDate: LogicalDate;
  dueDate: LogicalDate;
};

export function resolveCreditCardStatementCycle(args: {
  purchaseDate: LogicalDate;
  statementClosingDay: number;
  statementDueDay: number;
}): CreditCardStatementCycle {
  if (!isValidLogicalDate(args.purchaseDate)) {
    throw new Error("Data da compra inválida");
  }

  assertBillingDay(args.statementClosingDay, "Dia de fechamento");
  assertBillingDay(args.statementDueDay, "Dia de vencimento");

  const currentClosing = clampDate(
    args.purchaseDate.year,
    args.purchaseDate.month,
    args.statementClosingDay,
  );

  // Compras no próprio dia de fechamento entram no próximo ciclo.
  const cycleOffset =
    compareLogicalDates(args.purchaseDate, currentClosing) >= 0 ? 1 : 0;
  const cycleMonth = addMonths(
    args.purchaseDate.year,
    args.purchaseDate.month,
    cycleOffset,
  );
  const closingDate = clampDate(
    cycleMonth.year,
    cycleMonth.month,
    args.statementClosingDay,
  );

  let dueMonth =
    args.statementDueDay > args.statementClosingDay
      ? cycleMonth
      : addMonths(cycleMonth.year, cycleMonth.month, 1);
  let dueDate = clampDate(
    dueMonth.year,
    dueMonth.month,
    args.statementDueDay,
  );

  // Clamping de meses curtos nunca pode produzir vencimento no mesmo dia
  // ou antes do fechamento.
  if (compareLogicalDates(dueDate, closingDate) <= 0) {
    dueMonth = addMonths(cycleMonth.year, cycleMonth.month, 1);
    dueDate = clampDate(
      dueMonth.year,
      dueMonth.month,
      args.statementDueDay,
    );
  }

  return { closingDate, dueDate };
}
