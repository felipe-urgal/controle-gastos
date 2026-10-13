import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import { buildGlobalSearchFuzzyQuery } from "@/app/lib/search/global-search";

const THRESHOLD = 0.35;
const userIds: string[] = [];

afterEach(async () => {
  const ids = userIds.splice(0);
  if (ids.length > 0) await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Forma correlacionada original (referência semântica do SQL set-based atual). */
function legacyFuzzyQuery(userId: string, query: string, excludeIds: string[]) {
  const score = Prisma.sql`GREATEST(
    word_similarity(${query}, t.description),
    word_similarity(${query}, COALESCE(m.name, '')),
    COALESCE((
      SELECT MAX(word_similarity(${query}, ma.pattern))
      FROM merchant_aliases ma
      WHERE ma."merchant_id" = t."merchant_id" AND ma."userId" = ${userId}
    ), 0),
    COALESCE((
      SELECT MAX(word_similarity(${query}, tag.name))
      FROM transaction_tags tt
      JOIN tags tag ON tag.id = tt."tag_id"
      WHERE tt."transaction_id" = t.id AND tt."userId" = ${userId}
    ), 0)
  )`;
  return Prisma.sql`
    SELECT t.id, ${score} AS score
    FROM transactions t
    LEFT JOIN merchants m ON m.id = t."merchant_id" AND m."userId" = ${userId}
    WHERE t."userId" = ${userId}
      AND t.id NOT IN (${Prisma.join(excludeIds.length ? excludeIds : ["__none__"])})
      AND ${score} >= ${THRESHOLD}
    ORDER BY score DESC, t.year DESC, t.month DESC, t.day DESC, t."created_at" DESC, t.id DESC
    LIMIT 8`;
}

describe("global search fuzzy query equivalence", () => {
  it("returns the same ids and scores as the correlated reference query", async () => {
    const suffix = randomUUID().slice(0, 8);
    const [owner, other] = await Promise.all(
      ["owner", "other"].map((name) =>
        prisma.user.create({
          data: { name, email: `fuzzy-eq-${name}-${suffix}@example.com`, password: "test-hash" },
        }),
      ),
    );
    userIds.push(owner!.id, other!.id);

    const build = async (userId: string) => {
      const [account, category] = await Promise.all([
        prisma.account.create({ data: { name: "Conta", type: "CREDIT_DEBIT", userId } }),
        prisma.category.create({ data: { name: `Cat ${suffix}`, type: "EXPENSE", userId } }),
      ]);
      const merchant = await prisma.merchant.create({
        data: {
          userId,
          name: "Nubank Mobilidade",
          aliases: {
            create: [
              { pattern: "Uber Trip", normalizedPattern: "uber trip", operator: "CONTAINS", userId },
              { pattern: "99 Pop", normalizedPattern: "99 pop", operator: "CONTAINS", userId },
            ],
          },
        },
      });
      const tag = await prisma.tag.create({
        data: { userId, name: "transporte", normalizedName: "transporte" },
      });
      const descriptions = [
        "Mercado Central", "Mercadu Centrl", "Padaria do Zé", "Farmácia Popular",
        "Corrida aplicativo", "Assinatura streaming", "Combustível posto", "Cinema sábado",
        "Mercado Livre", "Livraria Cultura", "Uber viagem", "Pagamento de aluguel",
      ];
      const created: Array<{ id: string }> = [];
      for (const [index, description] of descriptions.entries()) {
        created.push(
          await prisma.transaction.create({
            data: {
              amount: 1_000 + index,
              year: 2026,
              month: (index % 12) + 1,
              day: (index % 28) + 1,
              type: "EXPENSE",
              description,
              status: "COMPLETED",
              accountId: account.id,
              categoryId: category.id,
              merchantId: index % 3 === 0 ? merchant.id : null,
              userId,
            },
          }),
        );
      }
      await prisma.transactionTag.createMany({
        data: created.filter((_, i) => i % 4 === 0).map((item) => ({
          userId, transactionId: item.id, tagId: tag.id,
        })),
      });
      return created;
    };

    const ownerTransactions = await build(owner!.id);
    await build(other!.id);

    const queries = [
      "Mercado", "Mercadu", "Nubank Mobilid", "Uber Tripp", "99 Pop", "transport",
      "transporte", "Farmacia", "streaming", "inexistente zzz", "Cinema",
    ];
    const excludeSets = [[], [ownerTransactions[0]!.id, ownerTransactions[4]!.id]];

    let nonEmpty = 0;
    for (const query of queries) {
      for (const excludeIds of excludeSets) {
        const [actual, expected] = await Promise.all([
          prisma.$queryRaw<Array<{ id: string; score: number }>>(
            Prisma.sql`SELECT * FROM (${buildGlobalSearchFuzzyQuery(owner!.id, query, excludeIds)}) q LIMIT 8`,
          ),
          prisma.$queryRaw<Array<{ id: string; score: number }>>(
            legacyFuzzyQuery(owner!.id, query, excludeIds),
          ),
        ]);
        expect(actual.map((row) => row.id), `ids para "${query}"`).toEqual(
          expected.map((row) => row.id),
        );
        if (actual.length > 0) nonEmpty += 1;
        actual.forEach((row, index) => {
          expect(row.score).toBeCloseTo(expected[index]!.score, 5);
        });
      }
    }
    // Garante que a comparação não é vazia (descrição, merchant, alias e tag).
    expect(nonEmpty).toBeGreaterThanOrEqual(12);
  });
});
