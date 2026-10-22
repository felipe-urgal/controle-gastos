import { Prisma } from "@prisma/client";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { normalizeTagNameKey } from "@/app/lib/tags/tag-name";
import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
import { aggregateTagCurrencies, type TagReportRow } from "@/app/lib/tags/tag-report-model";
import { createTagSchema, updateTagSchema } from "@/app/lib/tags/tag-schema";

const tagInclude = {
  _count: { select: { transactionLinks: true } },
} as const;

function tagNameConflict() {
  return new HttpError(
    "Já existe uma tag com esse nome",
    409,
    "TAG_NAME_CONFLICT",
  );
}

function tagInUse(count: number) {
  return new HttpError(
    `Esta tag está vinculada a ${count} transação(ões). Arquive a tag para preservar o histórico.`,
    409,
    "TAG_IN_USE",
  );
}

function rethrowTagWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw tagNameConflict();
  }

  throw error;
}

async function assertUniqueName(
  userId: string,
  normalizedName: string,
  exceptId?: string,
) {
  const duplicate = await prisma.tag.findFirst({
    where: {
      userId,
      normalizedName,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) throw tagNameConflict();
}

/** Despesa líquida do mês atual por moeda de cada tag da página; moedas não se somam. */
async function monthExpensesByTag(userId: string, tagIds: string[]) {
  const result = new Map<string, Array<{ currency: string; expense: number }>>();
  if (tagIds.length === 0) return result;

  const today = logicalDateFromUtcInstant(new Date());
  const rows = await prisma.$queryRaw<Array<{
    tagId: string;
    currency: string;
    accountType: TagReportRow["accountType"];
    type: TagReportRow["type"];
    count: bigint;
    total: bigint;
  }>>`
    SELECT
      tt."tag_id" AS "tagId",
      a."currency" AS "currency",
      a."type"::text AS "accountType",
      t."type"::text AS "type",
      COUNT(*)::bigint AS "count",
      COALESCE(SUM(t."amount"), 0)::bigint AS "total"
    FROM "transaction_tags" tt
    INNER JOIN "transactions" t
      ON t."id" = tt."transaction_id" AND t."userId" = tt."userId"
    INNER JOIN "accounts" a
      ON a."id" = t."accountId" AND a."userId" = t."userId"
    WHERE tt."userId" = ${userId}
      AND tt."tag_id" IN (${Prisma.join(tagIds)})
      AND t."kind" = 'NORMAL'
      AND t."status" = 'COMPLETED'
      AND t."year" = ${today.year}
      AND t."month" = ${today.month}
    GROUP BY tt."tag_id", a."currency", a."type", t."type"
  `;

  for (const tagId of tagIds) {
    const tagRows: TagReportRow[] = rows
      .filter((row) => row.tagId === tagId)
      .map((row) => ({ ...row, year: today.year, month: today.month, count: Number(row.count), total: Number(row.total) }));
    result.set(
      tagId,
      aggregateTagCurrencies(tagRows, "month", today)
        .filter((entry) => entry.expense !== 0)
        .map(({ currency, expense }) => ({ currency, expense })),
    );
  }
  return result;
}

export const tagCrud = baseCrudHandler({
  model: (db) => db.tag,
  entityName: "Tag",
  createSchema: createTagSchema,
  updateSchema: updateTagSchema,
  filterableFields: ["isActive"],
  searchableFields: ["name"],
  limit: true,
  orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
  include: tagInclude,
  async afterList({ items, userId }) {
    const monthly = await monthExpensesByTag(userId, items.map((item) => item.id));
    return items.map((item) => ({ ...item, monthExpenses: monthly.get(item.id) ?? [] }));
  },
  async beforeCreate(data, userId) {
    const normalizedName = normalizeTagNameKey(data.name);
    await assertUniqueName(userId, normalizedName);

    try {
      return await prisma.tag.create({
        data: { ...data, normalizedName, userId },
        include: tagInclude,
      });
    } catch (error) {
      rethrowTagWriteError(error);
    }
  },
  async beforeUpdate(data, entity, userId) {
    if (!data.name) return data;

    const normalizedName = normalizeTagNameKey(data.name);
    await assertUniqueName(userId, normalizedName, entity.id);
    return { ...data, normalizedName };
  },
  async customUpdate({ data, entity, userId }) {
    try {
      return await prisma.tag.update({
        where: { id: entity.id, userId },
        data,
        include: tagInclude,
      });
    } catch (error) {
      rethrowTagWriteError(error);
    }
  },
  async customDelete(entity, userId) {
    const transactionCount = await prisma.transactionTag.count({
      where: { userId, tagId: entity.id },
    });
    if (transactionCount > 0) throw tagInUse(transactionCount);

    const deleted = await prisma.tag.deleteMany({
      where: {
        id: entity.id,
        userId,
        transactionLinks: { none: {} },
      },
    });
    if (deleted.count !== 1) {
      const currentCount = await prisma.transactionTag.count({
        where: { userId, tagId: entity.id },
      });
      throw tagInUse(currentCount);
    }
  },
  mapper(entity) {
    const tag = { ...entity };
    const transactionCount = tag._count?.transactionLinks ?? 0;
    delete tag.normalizedName;
    delete tag._count;

    return {
      ...tag,
      transactionCount,
    };
  },
});
