import { Prisma } from "@prisma/client";

import type { LogicalDate } from "@/app/lib/date/logical-date";
import type { MerchantActivity } from "@/app/types/merchant";

import {
  buildMerchantHistory,
  merchantMonthWindow,
  previousMonth,
  type MerchantSpendRow,
} from "@/app/lib/merchants/merchant-spend-model";
import { prisma } from "@/app/lib/prisma";

export const MERCHANT_RECENT_LIMIT = 12;

export async function getMerchantActivity(args: {
  userId: string;
  merchantId: string;
  asOf: LogicalDate;
}): Promise<MerchantActivity> {
  const { userId, merchantId, asOf } = args;
  const window = merchantMonthWindow(asOf);
  const periods = window.map(({ year, month }) => ({ year, month }));

  const [rawRows, byCategory, accounts, recent] = await Promise.all([
    prisma.$queryRaw<Array<{
      currency: string;
      accountType: MerchantSpendRow["accountType"];
      type: MerchantSpendRow["type"];
      year: number;
      month: number;
      count: bigint;
      total: bigint;
    }>>(Prisma.sql`
      SELECT
        a."currency" AS "currency",
        a."type"::text AS "accountType",
        t."type"::text AS "type",
        t."year" AS "year",
        t."month" AS "month",
        COUNT(*)::bigint AS "count",
        COALESCE(SUM(t."amount"), 0)::bigint AS "total"
      FROM "transactions" t
      INNER JOIN "accounts" a
        ON a."id" = t."accountId" AND a."userId" = t."userId"
      WHERE t."userId" = ${userId}
        AND t."merchant_id" = ${merchantId}
        AND t."kind" = 'NORMAL'
        AND t."status" = 'COMPLETED'
        AND (t."year" * 12 + t."month") BETWEEN ${window[0].year * 12 + window[0].month} AND ${asOf.year * 12 + asOf.month}
      GROUP BY a."currency", a."type", t."type", t."year", t."month"
    `),
    prisma.transaction.groupBy({
      by: ["categoryId", "accountId"],
      where: { userId, merchantId, kind: "NORMAL", type: "EXPENSE", status: "COMPLETED", categoryId: { not: null }, OR: periods },
      _sum: { amount: true },
    }),
    prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
    prisma.transaction.findMany({
      where: { userId, merchantId, year: asOf.year, month: asOf.month, status: { not: "CANCELLED" } },
      orderBy: [{ day: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: MERCHANT_RECENT_LIMIT,
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        description: true,
        year: true,
        month: true,
        day: true,
        account: { select: { id: true, name: true, currency: true } },
      },
    }),
  ]);

  const rows: MerchantSpendRow[] = rawRows.map((row) => ({
    ...row,
    merchantId,
    count: Number(row.count),
    total: Number(row.total),
  }));
  const core = buildMerchantHistory(rows, asOf);
  const current = core.history[core.history.length - 1];
  const previous = previousMonth(asOf);
  const previousPoint = core.history.find((point) => point.year === previous.year && point.month === previous.month);

  const currencyByAccount = new Map(accounts.map((account) => [account.id, account.currency]));
  const perCategory = new Map<string, number>();
  for (const group of byCategory) {
    if (!group.categoryId || currencyByAccount.get(group.accountId) !== core.currency) continue;
    perCategory.set(group.categoryId, (perCategory.get(group.categoryId) ?? 0) + (group._sum.amount ?? 0));
  }
  const categoryTotal = [...perCategory.values()].reduce((sum, value) => sum + value, 0);
  const [topId, topAmount] = [...perCategory.entries()].sort(([, left], [, right]) => right - left)[0] ?? [null, 0];
  const topRecord = topId ? await prisma.category.findFirst({ where: { id: topId, userId }, select: { id: true, name: true, color: true } }) : null;

  return {
    currency: core.currency,
    otherCurrencies: core.otherCurrencies,
    month: {
      year: asOf.year,
      month: asOf.month,
      expense: current.expense,
      previousExpense: previousPoint?.expense ?? 0,
      count: core.count,
    },
    history: core.history,
    previousAverage: core.previousAverage,
    topCategory:
      topRecord && categoryTotal > 0
        ? { ...topRecord, share: Math.round((topAmount / categoryTotal) * 100) }
        : null,
    recent: recent as MerchantActivity["recent"],
  };
}
