import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { Prisma } from '@prisma/client';
import { prisma } from "@/app/lib/prisma";
import { buildGlobalSearchFuzzyQuery } from '@/app/lib/search/global-search';

const createdUserIds: string[] = [];

function executionTimeMs(plan: string) {
  const match = plan.match(/Execution Time: ([0-9.]+) ms/);
  return match ? Number(match[1]) : null;
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("global search query plan", () => {
  it("measures the production plan and verifies the trigram index is usable", async () => {
    const suffix = randomUUID();
    const users = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        prisma.user.create({
          data: {
            name: `Search Plan ${index}`,
            email: `search-plan-${index}-${suffix}@example.com`,
            password: "test-hash",
          },
        }),
      ),
    );
    createdUserIds.push(...users.map((user) => user.id));

    for (const [userIndex, user] of users.entries()) {
      const account = await prisma.account.create({
        data: {
          name: `Conta Search ${userIndex} ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: user.id,
        },
      });
      const category = await prisma.category.create({
        data: {
          name: `Busca ${userIndex} ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: user.id,
        },
      });

      await prisma.transaction.createMany({
        data: Array.from({ length: 4_000 }, (_, index) => ({
          amount: 1_000 + index,
          year: 2024 + (index % 3),
          month: (index % 12) + 1,
          day: (index % 28) + 1,
          type: "EXPENSE",
          description:
            index % 137 === 0
              ? `Mercado Central ${index}`
              : `Compra comum ${userIndex} ${index}`,
          status: "COMPLETED",
          accountId: account.id,
          categoryId: category.id,
          userId: user.id,
        })),
      });
    }

    await prisma.$executeRawUnsafe('ANALYZE "transactions"');


    const sampleUser = users[0]!;
    const merchant = await prisma.merchant.create({
      data: {
        userId: sampleUser.id,
        name: `Nubank Mobilidade ${suffix.slice(0, 6)}`,
        aliases: {
          create: {
            pattern: 'Uber Trip',
            normalizedPattern: 'uber trip',
            operator: 'CONTAINS',
            userId: sampleUser.id,
          },
        },
      },
    });
    const tag = await prisma.tag.create({
      data: { userId: sampleUser.id, name: 'transporte', normalizedName: 'transporte' },
    });
    const sampleIds = (await prisma.transaction.findMany({
      where: { userId: sampleUser.id }, select: { id: true }, take: 12,
    })).map((item) => item.id);
    await prisma.transaction.updateMany({
      where: { userId: sampleUser.id, id: { in: sampleIds } },
      data: { merchantId: merchant.id },
    });
    await prisma.transactionTag.createMany({
      data: sampleIds.map((id) => ({ userId: sampleUser.id, transactionId: id, tagId: tag.id })),
    });

    const targetUserId = users[0]!.id;
    const defaultRows = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
       SELECT "id"
       FROM "transactions"
       WHERE "userId" = $1
         AND "description" ILIKE '%Mercado Central%'
       ORDER BY "year" DESC, "month" DESC, "day" DESC, "created_at" DESC, "id" DESC
       LIMIT 5`,
      targetUserId,
    );
    const defaultPlan = defaultRows
      .map((row) => row["QUERY PLAN"])
      .filter(Boolean)
      .join("\n");

    const trigramPlan = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
      const rows = await tx.$queryRawUnsafe<Array<Record<string, string>>>(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
         SELECT "id"
         FROM "transactions"
         WHERE "description" ILIKE '%Mercado Central%'
         LIMIT 5`,
      );
      return rows.map((row) => row["QUERY PLAN"]).filter(Boolean).join("\n");
    });

    const sequentialPlan = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL enable_bitmapscan = off");
      await tx.$executeRawUnsafe("SET LOCAL enable_indexscan = off");
      const rows = await tx.$queryRawUnsafe<Array<Record<string, string>>>(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
         SELECT "id"
         FROM "transactions"
         WHERE "userId" = $1
           AND "description" ILIKE '%Mercado Central%'
         ORDER BY "year" DESC, "month" DESC, "day" DESC, "created_at" DESC, "id" DESC
         LIMIT 5`,
        targetUserId,
      );
      return rows.map((row) => row["QUERY PLAN"]).filter(Boolean).join("\n");
    });

    const sizeRows = await prisma.$queryRawUnsafe<Array<{ bytes: bigint }>>(
      `SELECT pg_relation_size('"transactions_description_trgm_idx"')::bigint AS bytes`,
    );

    expect(trigramPlan).toContain("transactions_description_trgm_idx");

    // This composes exactly the query used by fuzzyTransactionIds, including
    // correlated alias/tag subqueries, not an approximate ILIKE surrogate.
    const fuzzyCases = [
      { group: 'description', text: 'Mercado Central' },
      { group: 'merchant', text: 'Nubank Mobilidade' },
      { group: 'alias', text: 'Uber Trip' },
      { group: 'tag', text: 'transporte' },
      { group: 'combined', text: 'Mercado' },
    ];
    const fuzzyMetrics = [];
    for (const testCase of fuzzyCases) {
      const rows = await prisma.$queryRaw<Array<{ 'QUERY PLAN': string }>>(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${buildGlobalSearchFuzzyQuery(targetUserId, testCase.text, [])}`,
      );
      const plan = rows.map((row) => row['QUERY PLAN']).join('\n');
      expect(plan.length).toBeGreaterThan(0);
      fuzzyMetrics.push({
        field: testCase.group,
        executionMs: executionTimeMs(plan),
        correlatedSubplans: (plan.match(/SubPlan/g) ?? []).length,
      });
    }
    console.info(JSON.stringify({
      event: 'global_search_real_fuzzy_plan',
      rows: 20_000, multiUser: true,
      metrics: fuzzyMetrics,
    }));


    console.info(
      JSON.stringify({
        event: "global_search_query_plan_measurement",
        rows: 20_000,
        defaultExecutionMs: executionTimeMs(defaultPlan),
        trigramExecutionMs: executionTimeMs(trigramPlan),
        sequentialExecutionMs: executionTimeMs(sequentialPlan),
        trigramIndexBytes: Number(sizeRows[0]?.bytes ?? 0),
      }),
    );
  }, 180_000);
});
