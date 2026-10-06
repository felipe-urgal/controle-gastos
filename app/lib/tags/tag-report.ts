import type { AccountType } from "@/app/types/account";
import type { TransactionType } from "@/app/types/transaction";

import { success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { transactionFinancialImpact } from "@/app/lib/transactions/financial-impact";

export async function getTagReport(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) throw new HttpError("Tag não encontrada", 404);
    const { id } = await context.params;

    const tag = await prisma.tag.findFirst({
      where: { id, userId },
      select: { id: true, name: true },
    });
    if (!tag) throw new HttpError("Tag não encontrada", 404);

    const rows = await prisma.$queryRaw<Array<{
      currency: string;
      accountType: AccountType;
      type: TransactionType;
      count: bigint;
      total: bigint;
    }>>`
      SELECT
        a."currency" AS "currency",
        a."type"::text AS "accountType",
        t."type"::text AS "type",
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
      GROUP BY a."currency", a."type", t."type"
      ORDER BY a."currency" ASC, a."type" ASC, t."type" ASC
    `;

    const currencies = new Map<string, {
      currency: string;
      transactionCount: number;
      income: number;
      expense: number;
      balance: number;
    }>();

    for (const row of rows) {
      const current = currencies.get(row.currency) ?? {
        currency: row.currency,
        transactionCount: 0,
        income: 0,
        expense: 0,
        balance: 0,
      };
      current.transactionCount += Number(row.count);

      const impact = transactionFinancialImpact(
        row.accountType,
        row.type,
        Number(row.total),
      );
      current.income += impact.income;
      current.expense += impact.expense;
      current.balance = current.income - current.expense;
      currencies.set(row.currency, current);
    }

    return success({ tag, currencies: [...currencies.values()] });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao gerar relatório da tag" });
  }
}
