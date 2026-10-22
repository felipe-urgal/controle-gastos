import type { AccountType } from "@/app/types/account";
import type { TransactionType } from "@/app/types/transaction";

import { success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
import {
  aggregateTagCurrencies,
  aggregateTagHistory,
  parseTagReportPeriod,
  type TagReportRow,
} from "@/app/lib/tags/tag-report-model";

export async function getTagReport(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) throw new HttpError("Tag não encontrada", 404);
    const { id } = await context.params;
    const period = parseTagReportPeriod(new URL(request.url).searchParams.get("period"));

    const tag = await prisma.tag.findFirst({
      where: { id, userId },
      select: { id: true, name: true },
    });
    if (!tag) throw new HttpError("Tag não encontrada", 404);

    const rows = await prisma.$queryRaw<Array<{
      currency: string;
      accountType: AccountType;
      type: TransactionType;
      year: number;
      month: number;
      count: bigint;
      total: bigint;
    }>>`
      SELECT
        a."currency" AS "currency",
        a."type"::text AS "accountType",
        t."type"::text AS "type",
        t."year" AS "year",
        t."month" AS "month",
        COUNT(*)::bigint AS "count",
        COALESCE(SUM(t."amount"), 0)::bigint AS "total"
      FROM "transaction_tags" tt
      INNER JOIN "transactions" t
        ON t."id" = tt."transaction_id"
        AND t."userId" = tt."userId"
      INNER JOIN "accounts" a
        ON a."id" = t."accountId"
        AND a."userId" = t."userId"
      WHERE
        tt."userId" = ${userId}
        AND tt."tag_id" = ${id}
        AND t."kind" = 'NORMAL'
        AND t."status" = 'COMPLETED'
      GROUP BY a."currency", a."type", t."type", t."year", t."month"
    `;

    const today = logicalDateFromUtcInstant(new Date());
    const reportRows: TagReportRow[] = rows.map((row) => ({
      ...row,
      count: Number(row.count),
      total: Number(row.total),
    }));

    return success({
      tag,
      period,
      currencies: aggregateTagCurrencies(reportRows, period, today),
      history: aggregateTagHistory(reportRows, today),
    });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao gerar relatório da tag" });
  }
}
