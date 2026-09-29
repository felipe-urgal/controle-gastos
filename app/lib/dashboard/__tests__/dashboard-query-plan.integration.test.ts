import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";

function executionTimeMs(plan: string) {
  const match = plan.match(/Execution Time: ([0-9.]+) ms/);
  return match ? Number(match[1]) : null;
}

describe("dashboard transaction query plan", () => {
  it("uses the dashboard transaction index for completed balance aggregation", async () => {
    const suffix = randomUUID();
    const users = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        prisma.user.create({
          data: {
            name: `Plan User ${index}`,
            email: `dashboard-plan-${index}-${suffix}@example.com`,
            password: "test-hash",
          },
        }),
      ),
    );

    try {
      const accounts = await Promise.all(
        users.map((user, index) =>
          prisma.account.create({
            data: {
              name: `Plan Account ${index} ${suffix}`,
              type: "CREDIT_DEBIT",
              currency: "BRL",
              userId: user.id,
            },
          }),
        ),
      );
      const categories = await Promise.all(
        users.map((user, index) =>
          prisma.category.create({
            data: {
              name: `Plan Category ${index} ${suffix}`.slice(0, 50),
              type: "EXPENSE",
              userId: user.id,
            },
          }),
        ),
      );

      for (let userIndex = 0; userIndex < users.length; userIndex += 1) {
        const user = users[userIndex]!;
        const account = accounts[userIndex]!;
        const category = categories[userIndex]!;

        await prisma.transaction.createMany({
          data: Array.from({ length: 1_500 }, (_, index) => ({
            amount: 100 + index,
            year: 2020 + (index % 7),
            month: (index % 12) + 1,
            day: (index % 28) + 1,
            type: index % 5 === 0 ? "INCOME" : "EXPENSE",
            description: `Plan transaction ${index}`,
            status: index % 5 === 4 ? "PENDING" : "COMPLETED",
            accountId: account.id,
            categoryId: category.id,
            userId: user.id,
          })),
        });
      }

      await prisma.$executeRawUnsafe('ANALYZE "transactions"');

      const targetUserId = users[0]!.id;
      const defaultPlanRows = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
         SELECT "accountId", "type", SUM("amount")
         FROM "transactions"
         WHERE "userId" = $1 AND "status" = 'COMPLETED'
         GROUP BY "accountId", "type"`,
        targetUserId,
      );
      const defaultPlan = defaultPlanRows
        .map((row) => row["QUERY PLAN"])
        .filter(Boolean)
        .join("\n");

      const sequentialPlan = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL enable_indexscan = off");
        await tx.$executeRawUnsafe("SET LOCAL enable_bitmapscan = off");
        const rows = await tx.$queryRawUnsafe<Array<Record<string, string>>>(
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
           SELECT "accountId", "type", SUM("amount")
           FROM "transactions"
           WHERE "userId" = $1 AND "status" = 'COMPLETED'
           GROUP BY "accountId", "type"`,
          targetUserId,
        );
        return rows.map((row) => row["QUERY PLAN"]).filter(Boolean).join("\n");
      });

      expect(defaultPlan).toContain(
        "transactions_userId_status_accountId_type_idx",
      );

      console.info(
        JSON.stringify({
          event: "dashboard_query_plan_measurement",
          rows: 12_000,
          indexedExecutionMs: executionTimeMs(defaultPlan),
          sequentialExecutionMs: executionTimeMs(sequentialPlan),
        }),
      );
    } finally {
      await prisma.user.deleteMany({
        where: { id: { in: users.map((user) => user.id) } },
      });
    }
  }, 30_000);
});

afterAll(async () => {
  await prisma.$disconnect();
});
