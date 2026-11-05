import type { Prisma } from "@prisma/client";

import type { LogicalDate } from "@/app/lib/date/logical-date";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

export const MONTH_LOCKED_CODE = "MONTH_LOCKED";

type MonthRef = Pick<LogicalDate, "year" | "month">;

function monthKey({ year, month }: MonthRef) {
  return year * 12 + month;
}

function formatMonth({ year, month }: MonthRef) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

/**
 * Impede gravar lançamento em mês travado. Chame dentro da transação que grava,
 * com todas as datas (antes e depois da mudança) que a operação toca.
 */
export async function assertMonthsOpen(
  tx: Pick<Prisma.TransactionClient, "lockedMonth">,
  userId: string,
  dates: readonly MonthRef[],
) {
  if (dates.length === 0) return;

  const unique = new Map(dates.map((date) => [monthKey(date), date]));
  const locked = await tx.lockedMonth.findMany({
    where: {
      userId,
      OR: [...unique.values()].map(({ year, month }) => ({ year, month })),
    },
    select: { year: true, month: true },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const first = locked[0];
  if (!first) return;

  throw new HttpError(
    `O mês ${formatMonth(first)} está travado. Reabra o mês no Fechamento para alterar lançamentos`,
    409,
    MONTH_LOCKED_CODE,
  );
}

export type MonthLockState = {
  locked: boolean;
  lockedAt: string | null;
};

export async function getMonthLockState(
  db: Pick<Prisma.TransactionClient, "lockedMonth">,
  userId: string,
  { year, month }: MonthRef,
): Promise<MonthLockState> {
  const row = await db.lockedMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    select: { lockedAt: true },
  });
  return { locked: Boolean(row), lockedAt: row?.lockedAt.toISOString() ?? null };
}

/** Idempotente: travar um mês já travado devolve o estado existente. */
export async function lockMonthForUser(
  userId: string,
  period: MonthRef,
  asOf: LogicalDate,
): Promise<MonthLockState> {
  if (monthKey(period) > monthKey(asOf)) {
    throw new HttpError("Não é possível travar um mês futuro", 400);
  }
  await prisma.lockedMonth.upsert({
    where: { userId_year_month: { userId, ...period } },
    create: { userId, ...period },
    update: {},
  });
  return getMonthLockState(prisma, userId, period);
}

/** Idempotente: reabrir um mês que não está travado não faz nada. */
export async function unlockMonthForUser(
  userId: string,
  period: MonthRef,
): Promise<MonthLockState> {
  await prisma.lockedMonth.deleteMany({ where: { userId, ...period } });
  return { locked: false, lockedAt: null };
}
