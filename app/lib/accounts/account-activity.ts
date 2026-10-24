import { prisma } from "@/app/lib/prisma";
import { compareLogicalDates, type LogicalDate } from "@/app/lib/date/logical-date";

export type AccountActivity = {
  /** Entradas e saídas concluídas no mês de `asOf` (centavos). */
  monthIncome: number;
  monthExpense: number;
  /** Entradas menos saídas das movimentações pendentes (qualquer data). */
  pendingNet: number;
  pendingCount: number;
  /** Saldo no fim de cada um dos últimos dias, do mais antigo para hoje; o último é o saldo atual. */
  balanceSeries: number[];
};

export const BALANCE_SERIES_DAYS = 30;

/** Soma (ou subtrai, com valor negativo) dias a uma data lógica. */
function shiftDays(date: LogicalDate, days: number): LogicalDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function dayKey(date: LogicalDate) {
  return date.year * 10_000 + date.month * 100 + date.day;
}

/**
 * Reconstrói o saldo dia a dia andando para trás a partir do saldo atual:
 * o saldo de ontem é o de hoje menos o que aconteceu hoje.
 */
export function buildBalanceSeries(args: {
  currentBalance: number;
  /** Variação líquida (entradas menos saídas) de cada dia com movimento, por chave AAAAMMDD. */
  dailyDeltas: ReadonlyMap<number, number>;
  asOf: LogicalDate;
  days?: number;
}): number[] {
  const days = args.days ?? BALANCE_SERIES_DAYS;
  const series: number[] = [];
  let balance = args.currentBalance;

  for (let offset = 0; offset < days; offset += 1) {
    series.unshift(balance);
    balance -= args.dailyDeltas.get(dayKey(shiftDays(args.asOf, -offset))) ?? 0;
  }

  return series;
}

export async function getAccountActivity(args: {
  userId: string;
  accountId: string;
  currentBalance: number;
  asOf: LogicalDate;
}): Promise<AccountActivity> {
  const { userId, accountId, currentBalance, asOf } = args;
  const windowStart = shiftDays(asOf, -(BALANCE_SERIES_DAYS - 1));
  const months = [
    { year: windowStart.year, month: windowStart.month },
    { year: asOf.year, month: asOf.month },
  ].filter((value, index, list) => list.findIndex((other) => other.year === value.year && other.month === value.month) === index);

  const [dailyRows, pendingRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["year", "month", "day", "type", "kind"],
      where: { userId, accountId, status: "COMPLETED", OR: months },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, accountId, status: "PENDING" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const dailyDeltas = new Map<number, number>();
  let monthIncome = 0;
  let monthExpense = 0;

  for (const row of dailyRows) {
    const amount = row._sum.amount ?? 0;
    const date = { year: row.year, month: row.month, day: row.day };

    // O saldo inicial entra na evolução do saldo, mas não é "entrou" nem "saiu" do mês.
    if (row.year === asOf.year && row.month === asOf.month && row.kind !== "OPENING_BALANCE") {
      if (row.type === "INCOME") monthIncome += amount;
      else monthExpense += amount;
    }
    if (compareLogicalDates(date, windowStart) >= 0 && compareLogicalDates(date, asOf) <= 0) {
      dailyDeltas.set(dayKey(date), (dailyDeltas.get(dayKey(date)) ?? 0) + (row.type === "INCOME" ? amount : -amount));
    }
  }

  let pendingNet = 0;
  let pendingCount = 0;
  for (const row of pendingRows) {
    const amount = row._sum.amount ?? 0;
    pendingNet += row.type === "INCOME" ? amount : -amount;
    pendingCount += row._count._all;
  }

  return {
    monthIncome,
    monthExpense,
    pendingNet,
    pendingCount,
    balanceSeries: buildBalanceSeries({ currentBalance, dailyDeltas, asOf }),
  };
}
