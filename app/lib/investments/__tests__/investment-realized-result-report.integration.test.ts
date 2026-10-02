import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { getInvestmentRealizedResultReportForUser } from "@/app/lib/investments/investment-realized-result-report";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `realized-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createContext(
  userId: string,
  symbol: string,
  type: "FII" | "STOCK",
) {
  const [account, asset] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Broker ${symbol}`,
        type: "INVESTMENT",
        currency: "BRL",
        userId,
      },
    }),
    prisma.investmentAsset.create({
      data: {
        symbol,
        type,
        currency: "BRL",
        market: "B3",
        userId,
      },
    }),
  ]);
  return { account, asset };
}

async function addOperation(args: {
  userId: string;
  accountId: string;
  assetId: string;
  type: "BUY" | "SELL";
  quantity: string;
  priceCents: number;
  feesCents?: number;
  month: number;
  day: number;
}) {
  const quantityUnits = parseInvestmentQuantity(args.quantity)!;
  const operation = await prisma.investmentOperation.create({
    data: {
      type: args.type,
      quantityUnits,
      unitPriceCents: args.priceCents,
      feesCents: args.feesCents ?? 0,
      year: 2026,
      month: args.month,
      day: args.day,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
    },
  });
  await prisma.investmentFiscalEvent.create({
    data: {
      id: operation.id,
      type: args.type,
      originalType: args.type,
      classificationSource: "SYSTEM",
      quantityUnits,
      year: 2026,
      month: args.month,
      day: args.day,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
      operationId: operation.id,
    },
  });
}

describe("investment realized result report", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("groups multiple sales by month and keeps FII separated from STOCK", async () => {
    const user = await createUser("Realized Owner");
    const [fii, stock] = await Promise.all([
      createContext(user.id, "FII11", "FII"),
      createContext(user.id, "ACAO3", "STOCK"),
    ]);

    await addOperation({
      userId: user.id,
      accountId: fii.account.id,
      assetId: fii.asset.id,
      type: "BUY",
      quantity: "100",
      priceCents: 1_000,
      month: 1,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: stock.account.id,
      assetId: stock.asset.id,
      type: "BUY",
      quantity: "20",
      priceCents: 2_000,
      month: 1,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: fii.account.id,
      assetId: fii.asset.id,
      type: "SELL",
      quantity: "10",
      priceCents: 1_200,
      feesCents: 20,
      month: 4,
      day: 10,
    });
    await addOperation({
      userId: user.id,
      accountId: fii.account.id,
      assetId: fii.asset.id,
      type: "SELL",
      quantity: "5",
      priceCents: 900,
      feesCents: 10,
      month: 4,
      day: 15,
    });
    await addOperation({
      userId: user.id,
      accountId: stock.account.id,
      assetId: stock.asset.id,
      type: "SELL",
      quantity: "5",
      priceCents: 2_500,
      feesCents: 30,
      month: 4,
      day: 20,
    });

    const report = await getInvestmentRealizedResultReportForUser(
      user.id,
      2026,
    );

    expect(report.saleCount).toBe(3);
    expect(report.monthlyGroups).toHaveLength(2);

    const fiiGroup = report.monthlyGroups.find(
      (group) => group.assetType === "FII",
    );
    expect(fiiGroup).toMatchObject({
      month: 4,
      currency: "BRL",
      saleCount: 2,
      grossProceedsCents: 16_500,
      feesCents: 30,
      netProceedsCents: 16_470,
      allocatedCostCents: 15_000,
      realizedResultCents: 1_470,
      status: "OK",
    });

    const stockGroup = report.monthlyGroups.find(
      (group) => group.assetType === "STOCK",
    );
    expect(stockGroup).toMatchObject({
      saleCount: 1,
      realizedResultCents: 2_470,
      status: "OK",
    });
  });

  it("does not leak another user's realized sales", async () => {
    const [owner, other] = await Promise.all([
      createUser("Realized Owner"),
      createUser("Realized Other"),
    ]);
    const [ownerContext, otherContext] = await Promise.all([
      createContext(owner.id, "OWN11", "FII"),
      createContext(other.id, "OTHER11", "FII"),
    ]);

    for (const context of [
      { user: owner, ...ownerContext },
      { user: other, ...otherContext },
    ]) {
      await addOperation({
        userId: context.user.id,
        accountId: context.account.id,
        assetId: context.asset.id,
        type: "BUY",
        quantity: "10",
        priceCents: 1_000,
        month: 1,
        day: 1,
      });
      await addOperation({
        userId: context.user.id,
        accountId: context.account.id,
        assetId: context.asset.id,
        type: "SELL",
        quantity: "1",
        priceCents: 2_000,
        month: 2,
        day: 1,
      });
    }

    const report = await getInvestmentRealizedResultReportForUser(
      owner.id,
      2026,
    );

    expect(report.saleCount).toBe(1);
    expect(report.monthlyGroups[0]?.sales[0]?.symbol).toBe("OWN11");
  });
});
