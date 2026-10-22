import { Prisma } from "@prisma/client";

import type { MerchantSpendRow } from "@/app/lib/merchants/merchant-spend-model";

import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
import {
  buildMerchantSummary,
  merchantSpend,
  previousMonth,
} from "@/app/lib/merchants/merchant-spend-model";
import { prisma } from "@/app/lib/prisma";

/** Despesas concluídas do mês atual e do anterior, por estabelecimento (ou sem), moeda e tipo de conta. */
async function loadSpendRows(userId: string) {
  const today = logicalDateFromUtcInstant(new Date());
  const previous = previousMonth(today);
  const rows = await prisma.$queryRaw<Array<{
    merchantId: string | null;
    currency: string;
    accountType: MerchantSpendRow["accountType"];
    type: MerchantSpendRow["type"];
    year: number;
    month: number;
    count: bigint;
    total: bigint;
  }>>(Prisma.sql`
    SELECT
      t."merchant_id" AS "merchantId",
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
      AND t."kind" = 'NORMAL'
      AND t."status" = 'COMPLETED'
      AND (
        (t."year" = ${today.year} AND t."month" = ${today.month})
        OR (t."year" = ${previous.year} AND t."month" = ${previous.month})
      )
    GROUP BY t."merchant_id", a."currency", a."type", t."type", t."year", t."month"
  `);

  return {
    today,
    rows: rows.map((row) => ({ ...row, count: Number(row.count), total: Number(row.total) })),
  };
}

export async function monthSpendForMerchants(userId: string, merchantIds: string[]) {
  const { today, rows } = await loadSpendRows(userId);
  return new Map(merchantIds.map((id) => [id, merchantSpend(rows, id, today)]));
}

export async function getMerchantMonthSummary(userId: string) {
  const { today, rows } = await loadSpendRows(userId);
  const ids = [...new Set(rows.flatMap((row) => (row.merchantId ? [row.merchantId] : [])))];
  const merchants = ids.length
    ? await prisma.merchant.findMany({ where: { userId, id: { in: ids } }, select: { id: true, name: true } })
    : [];

  return buildMerchantSummary(rows, today, new Map(merchants.map((merchant) => [merchant.id, merchant.name])));
}
