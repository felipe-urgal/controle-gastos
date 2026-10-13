import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: async () => authState.userId,
}));
vi.mock("@/app/lib/search/global-search-rate-limit", () => ({
  consumeGlobalSearchRateLimit: async () => ({ limited: false, retryAfterSeconds: 0 }),
}));

import { prisma } from "@/app/lib/prisma";
import {
  GLOBAL_SEARCH_P95_BUDGET_MS,
  getGlobalSearch,
} from "@/app/lib/search/global-search";

/**
 * Teste de carga OPT-IN (não roda no `pnpm test` padrão): volume representativo
 * de "dezenas de milhares de transações por usuário" com múltiplos usuários.
 *
 *   SEARCH_LOAD=1 pnpm exec vitest run app/lib/search/__tests__/global-search-load.integration.test.ts
 *
 * Variáveis: SEARCH_LOAD_USERS (padrão 6), SEARCH_LOAD_ROWS_PER_USER (padrão 40000),
 * SEARCH_LOAD_SAMPLES (padrão 20 por padrão de consulta) e SEARCH_LOAD_KEEP=1
 * (não apaga o dataset; imprime o id do usuário-alvo para investigar com EXPLAIN).
 */
const enabled = process.env.SEARCH_LOAD === "1";
const USERS = Number(process.env.SEARCH_LOAD_USERS ?? 6);
const ROWS_PER_USER = Number(process.env.SEARCH_LOAD_ROWS_PER_USER ?? 40_000);
const SAMPLES = Number(process.env.SEARCH_LOAD_SAMPLES ?? 20);
const CHUNK = 5_000;

const WORDS = [
  "Mercado", "Padaria", "Farmácia", "Combustível", "Restaurante", "Streaming",
  "Academia", "Transporte", "Cinema", "Livraria", "Pet shop", "Assinatura",
];

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index]!;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe.skipIf(!enabled)("global search load (opt-in)", () => {
  it(
    "keeps p95 within the budget with a representative multi-user dataset",
    async () => {
      const suffix = randomUUID().slice(0, 8);
      const users = await Promise.all(
        Array.from({ length: USERS }, (_, index) =>
          prisma.user.create({
            data: {
              name: `Search Load ${index}`,
              email: `search-load-${index}-${suffix}@example.com`,
              password: "test-hash",
            },
          }),
        ),
      );

      try {
        const seedStartedAt = performance.now();
        for (const [userIndex, user] of users.entries()) {
          const [account, category] = await Promise.all([
            prisma.account.create({
              data: { name: `Conta ${userIndex}`, type: "CREDIT_DEBIT", userId: user.id },
            }),
            prisma.category.create({
              data: { name: `Cat ${userIndex} ${suffix}`.slice(0, 50), type: "EXPENSE", userId: user.id },
            }),
          ]);
          const merchants = await Promise.all(
            Array.from({ length: 50 }, (_, index) =>
              prisma.merchant.create({
                data: { userId: user.id, name: `${WORDS[index % WORDS.length]} ${userIndex}-${index}` },
              }),
            ),
          );
          const tag = await prisma.tag.create({
            data: { userId: user.id, name: `viagem${userIndex}`, normalizedName: `viagem${userIndex}` },
          });

          for (let offset = 0; offset < ROWS_PER_USER; offset += CHUNK) {
            const size = Math.min(CHUNK, ROWS_PER_USER - offset);
            await prisma.transaction.createMany({
              data: Array.from({ length: size }, (_, i) => {
                const index = offset + i;
                const word = WORDS[index % WORDS.length]!;
                return {
                  amount: 1_000 + (index % 9_000),
                  year: 2023 + (index % 4),
                  month: (index % 12) + 1,
                  day: (index % 28) + 1,
                  type: "EXPENSE" as const,
                  description: `${word} ${index % 500} ref ${index}`,
                  status: "COMPLETED" as const,
                  accountId: account.id,
                  categoryId: category.id,
                  merchantId: index % 10 === 0 ? merchants[index % merchants.length]!.id : null,
                  userId: user.id,
                };
              }),
            });
          }

          const taggedIds = (
            await prisma.transaction.findMany({
              where: { userId: user.id },
              select: { id: true },
              take: 500,
            })
          ).map((item) => item.id);
          await prisma.transactionTag.createMany({
            data: taggedIds.map((id) => ({ userId: user.id, transactionId: id, tagId: tag.id })),
          });
        }
        await prisma.$executeRawUnsafe('ANALYZE "transactions"');
        const seedMs = Math.round(performance.now() - seedStartedAt);

        const target = users[0]!;
        authState.userId = target.id;
        // Handler completo de GET /api/search (auth, schema, consulta, telemetria, JSON).
        const search = async (query: string) => {
          const response = await getGlobalSearch(
            new Request(`http://localhost/api/search?q=${encodeURIComponent(query)}`),
          );
          expect(response.status).toBe(200);
          await response.json();
        };
        const patterns: Record<string, string> = {
          exact: "Mercado 17 ref 17",
          prefix: "Farmác",
          contains: "Combust",
          typo: "Mercadu 42",
          tag: "#viagem0",
          noResult: "zzqxwv inexistente",
        };

        const byPattern: Record<string, { p50: number; p95: number; max: number }> = {};
        const all: number[] = [];
        for (const [name, query] of Object.entries(patterns)) {
          await search(query); // aquece plano/cache
          const samples: number[] = [];
          for (let i = 0; i < SAMPLES; i += 1) {
            const startedAt = performance.now();
            await search(query);
            samples.push(performance.now() - startedAt);
          }
          const sorted = [...samples].sort((a, b) => a - b);
          byPattern[name] = {
            p50: Math.round(percentile(sorted, 50)),
            p95: Math.round(percentile(sorted, 95)),
            max: Math.round(sorted.at(-1)!),
          };
          all.push(...samples);
        }

        const sortedAll = [...all].sort((a, b) => a - b);
        const summary = {
          event: "global_search_load_result",
          users: USERS,
          rowsPerUser: ROWS_PER_USER,
          totalRows: USERS * ROWS_PER_USER,
          samples: all.length,
          seedMs,
          p50Ms: Math.round(percentile(sortedAll, 50)),
          p95Ms: Math.round(percentile(sortedAll, 95)),
          maxMs: Math.round(sortedAll.at(-1)!),
          budgetMs: GLOBAL_SEARCH_P95_BUDGET_MS,
          byPattern,
        };
        console.info(JSON.stringify(summary));

        if (process.env.SEARCH_LOAD_ENFORCE !== "0") {
          expect(summary.p95Ms).toBeLessThanOrEqual(GLOBAL_SEARCH_P95_BUDGET_MS);
        }
      } finally {
        if (process.env.SEARCH_LOAD_KEEP === "1") {
          console.info(JSON.stringify({ event: "global_search_load_kept", targetUserId: users[0]!.id }));
        } else {
          await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
        }
      }
    },
    1_800_000,
  );
});
