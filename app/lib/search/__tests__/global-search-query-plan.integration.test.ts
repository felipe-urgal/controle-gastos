import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";

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
  }, 30_000);
});
