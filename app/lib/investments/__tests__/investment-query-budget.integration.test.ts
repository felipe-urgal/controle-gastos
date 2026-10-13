import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { measureSql } from "@/app/lib/__tests__/support/sql-counter";
import { getFiscalPendingCenterForUser } from "@/app/lib/investments/investment-fiscal-pending-center";
import { getInvestmentFiscalYearEndSnapshotForUser } from "@/app/lib/investments/investment-fiscal-snapshot";
import { getInvestmentRealizedResultReportForUser } from "@/app/lib/investments/investment-realized-result-report";
import { getInvestmentTaxControlReportForUser } from "@/app/lib/investments/investment-tax-control";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { listInvestmentPortfolioForUser } from "@/app/lib/investments/investments";
import { prisma } from "@/app/lib/prisma";

const YEAR = 2026;
const userIds: string[] = [];

afterEach(async () => {
  const ids = userIds.splice(0);
  if (ids.length > 0) await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({
    data: {
      name: "Budget Owner",
      email: `inv-budget-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

/** Cria `assets` ativos, cada um com compra e venda no ano fiscal e `buys` compras extras. */
async function seedPortfolio(userId: string, accountId: string, assets: number, buys: number) {
  for (let index = 0; index < assets; index += 1) {
    const asset = await prisma.investmentAsset.create({
      data: {
        symbol: `B${randomUUID().slice(0, 6).toUpperCase()}`,
        type: "STOCK",
        currency: "BRL",
        market: "B3",
        taxLocation: "BRAZIL",
        userId,
      },
    });
    const operations = [
      { type: "BUY" as const, quantity: "100", month: 1, day: 5 },
      ...Array.from({ length: buys }, (_, extra) => ({
        type: "BUY" as const,
        quantity: "1",
        month: 2,
        day: 1 + (extra % 27),
      })),
      { type: "SELL" as const, quantity: "10", month: 6, day: 10 },
    ];
    for (const operation of operations) {
      const quantityUnits = parseInvestmentQuantity(operation.quantity)!;
      const created = await prisma.investmentOperation.create({
        data: {
          type: operation.type,
          quantityUnits,
          unitPriceCents: operation.type === "BUY" ? 1000 : 1500,
          feesCents: 5,
          year: YEAR,
          month: operation.month,
          day: operation.day,
          userId,
          accountId,
          assetId: asset.id,
        },
      });
      await prisma.investmentFiscalEvent.create({
        data: {
          id: created.id,
          type: operation.type,
          originalType: operation.type,
          classificationSource: "SYSTEM",
          quantityUnits,
          year: YEAR,
          month: operation.month,
          day: operation.day,
          userId,
          accountId,
          assetId: asset.id,
          operationId: created.id,
        },
      });
    }
  }
}

async function measureAll(userId: string) {
  const portfolio = await measureSql(() => listInvestmentPortfolioForUser(userId));
  const fiscal = await measureSql(async () => {
    await Promise.all([
      getInvestmentTaxControlReportForUser(userId, YEAR),
      getFiscalPendingCenterForUser(userId, YEAR),
      getInvestmentFiscalYearEndSnapshotForUser(userId, YEAR),
      getInvestmentRealizedResultReportForUser(userId, YEAR),
    ]);
  });
  return { portfolio, fiscal };
}

describe("investments SQL budgets", () => {
  it("keeps portfolio and fiscal view statement counts independent of volume", async () => {
    const user = await createUser();
    const account = await prisma.account.create({
      data: { name: "Budget Broker", type: "INVESTMENT", currency: "BRL", userId: user.id },
    });

    await seedPortfolio(user.id, account.id, 2, 2);
    await measureAll(user.id); // aquece o pool
    const baseline = await measureAll(user.id);

    // 4x mais ativos e 10x mais operações por ativo: o número de consultas não cresce.
    await seedPortfolio(user.id, account.id, 6, 20);
    const scaled = await measureAll(user.id);

    // Tetos absolutos (baseline medido: carteira 21, visão fiscal 77; ~25% de folga).
    expect(baseline.portfolio.statements).toBeGreaterThan(0);
    expect(baseline.portfolio.statements).toBeLessThanOrEqual(26);
    expect(baseline.fiscal.statements).toBeLessThanOrEqual(96);

    expect(scaled.portfolio.statements).toBe(baseline.portfolio.statements);
    expect(scaled.fiscal.statements).toBe(baseline.fiscal.statements);

    // Payload inicial limitado: a carteira nunca devolve o histórico completo.
    const portfolio = scaled.portfolio.result as { operations: unknown[]; incomes: unknown[] };
    expect(portfolio.operations.length).toBeLessThanOrEqual(30);
    expect(portfolio.incomes.length).toBeLessThanOrEqual(30);

    // Latência: sanity check generoso, não SLO.
    expect(scaled.portfolio.durationMs).toBeLessThan(5_000);
    expect(scaled.fiscal.durationMs).toBeLessThan(10_000);
    console.info(
      `[budget] investments portfolio=${baseline.portfolio.statements} fiscal=${baseline.fiscal.statements} ` +
        `portfolioMs=${scaled.portfolio.durationMs} fiscalMs=${scaled.fiscal.durationMs}`,
    );
  });
});
