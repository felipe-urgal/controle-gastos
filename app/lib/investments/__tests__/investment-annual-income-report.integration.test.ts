import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { getInvestmentAnnualIncomeReportForUser } from "@/app/lib/investments/investment-annual-income-report";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `income-report-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createIncomeContext(args: {
  userId: string;
  accountName: string;
  symbol: string;
  currency: "BRL" | "USD";
  assetType?: "FII" | "STOCK";
}) {
  const [account, asset] = await Promise.all([
    prisma.account.create({
      data: {
        name: args.accountName,
        type: "INVESTMENT",
        currency: args.currency,
        userId: args.userId,
      },
    }),
    prisma.investmentAsset.create({
      data: {
        symbol: args.symbol,
        type: args.assetType ?? "FII",
        currency: args.currency,
        market: args.currency === "BRL" ? "B3" : null,
        userId: args.userId,
      },
    }),
  ]);

  return { account, asset };
}

describe("investment annual income report", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("consolidates MXRF11 and VGIR11 by asset, type and institution", async () => {
    const user = await createUser("Income Owner");
    const [mxrf, vgir] = await Promise.all([
      createIncomeContext({
        userId: user.id,
        accountName: "Nubank Investimentos",
        symbol: "MXRF11",
        currency: "BRL",
      }),
      createIncomeContext({
        userId: user.id,
        accountName: "Rico",
        symbol: "VGIR11",
        currency: "BRL",
      }),
    ]);

    await prisma.investmentIncome.createMany({
      data: [
        {
          type: "DIVIDEND",
          quantityUnits: parseInvestmentQuantity("2100")!,
          unitValueCents: 10,
          netAmountCents: 21000,
          year: 2026,
          month: 1,
          day: 15,
          userId: user.id,
          accountId: mxrf.account.id,
          assetId: mxrf.asset.id,
        },
        {
          type: "DIVIDEND",
          quantityUnits: parseInvestmentQuantity("2100")!,
          unitValueCents: 10,
          netAmountCents: 21000,
          year: 2026,
          month: 1,
          day: 31,
          userId: user.id,
          accountId: mxrf.account.id,
          assetId: mxrf.asset.id,
        },
        {
          type: "INTEREST",
          quantityUnits: parseInvestmentQuantity("306")!,
          unitValueCents: 8,
          netAmountCents: 2448,
          year: 2026,
          month: 1,
          day: 20,
          userId: user.id,
          accountId: vgir.account.id,
          assetId: vgir.asset.id,
        },
      ],
    });

    const report = await getInvestmentAnnualIncomeReportForUser(user.id, 2026);

    expect(report.eventCount).toBe(3);
    expect(report.groupCount).toBe(2);
    expect(report.totalsByCurrency).toEqual({ BRL: 44_448 });
    expect(report.totalsByTypeAndCurrency).toEqual({
      BRL: {
        DIVIDEND: 42_000,
        INTEREST: 2_448,
      },
    });
    expect(report.status).toBe("OK");

    const mxrfGroup = report.items.find((item) => item.symbol === "MXRF11");
    expect(mxrfGroup).toMatchObject({
      incomeType: "DIVIDEND",
      institutionName: "Nubank Investimentos",
      eventCount: 2,
      netAmountCents: 42_000,
      pending: [],
    });
    expect(mxrfGroup?.events).toHaveLength(2);
  });

  it("keeps currencies separated and marks generic income as pending", async () => {
    const user = await createUser("Currency Owner");
    const brl = await createIncomeContext({
      userId: user.id,
      accountName: "Nubank",
      symbol: "BRFI11",
      currency: "BRL",
    });
    const usd = await createIncomeContext({
      userId: user.id,
      accountName: "Broker USD",
      symbol: "USDSTK",
      currency: "USD",
      assetType: "STOCK",
    });

    await prisma.investmentIncome.createMany({
      data: [
        {
          type: "INCOME",
          quantityUnits: parseInvestmentQuantity("10")!,
          unitValueCents: 100,
          netAmountCents: 1_000,
          year: 2026,
          month: 2,
          day: 1,
          userId: user.id,
          accountId: brl.account.id,
          assetId: brl.asset.id,
        },
        {
          type: "DIVIDEND",
          quantityUnits: parseInvestmentQuantity("2")!,
          unitValueCents: 500,
          netAmountCents: 1_000,
          year: 2026,
          month: 2,
          day: 1,
          userId: user.id,
          accountId: usd.account.id,
          assetId: usd.asset.id,
        },
      ],
    });

    const report = await getInvestmentAnnualIncomeReportForUser(user.id, 2026);

    expect(report.totalsByCurrency).toEqual({ BRL: 1_000, USD: 1_000 });
    expect(report.status).toBe("PENDING");
    expect(report.pending).toHaveLength(1);
    expect(report.pending[0]).toMatchObject({
      code: "UNCLASSIFIED_INCOME_TYPE",
      symbol: "BRFI11",
      incomeType: "INCOME",
    });
  });

  it("does not double count a duplicate import fingerprint", async () => {
    const user = await createUser("Duplicate Owner");
    const context = await createIncomeContext({
      userId: user.id,
      accountName: "Nubank",
      symbol: "MXRF11",
      currency: "BRL",
    });
    const fingerprint = "a".repeat(64);
    const row = {
      type: "DIVIDEND" as const,
      quantityUnits: parseInvestmentQuantity("100")!,
      unitValueCents: 10,
      netAmountCents: 1_000,
      year: 2026,
      month: 3,
      day: 1,
      userId: user.id,
      accountId: context.account.id,
      assetId: context.asset.id,
      importSource: "CSV" as const,
      importFingerprint: fingerprint,
    };

    await prisma.investmentIncome.createMany({
      data: [row, row],
      skipDuplicates: true,
    });

    const report = await getInvestmentAnnualIncomeReportForUser(user.id, 2026);

    expect(report.eventCount).toBe(1);
    expect(report.totalsByCurrency).toEqual({ BRL: 1_000 });
  });

  it("does not leak another user's income events", async () => {
    const [owner, other] = await Promise.all([
      createUser("Income Owner"),
      createUser("Income Other"),
    ]);
    const ownerContext = await createIncomeContext({
      userId: owner.id,
      accountName: "Owner Broker",
      symbol: "OWN11",
      currency: "BRL",
    });
    const otherContext = await createIncomeContext({
      userId: other.id,
      accountName: "Other Broker",
      symbol: "OTHER11",
      currency: "BRL",
    });

    await prisma.investmentIncome.createMany({
      data: [
        {
          type: "DIVIDEND",
          quantityUnits: parseInvestmentQuantity("1")!,
          unitValueCents: 100,
          netAmountCents: 100,
          year: 2026,
          month: 4,
          day: 1,
          userId: owner.id,
          accountId: ownerContext.account.id,
          assetId: ownerContext.asset.id,
        },
        {
          type: "DIVIDEND",
          quantityUnits: parseInvestmentQuantity("999")!,
          unitValueCents: 999,
          netAmountCents: 998_001,
          year: 2026,
          month: 4,
          day: 1,
          userId: other.id,
          accountId: otherContext.account.id,
          assetId: otherContext.asset.id,
        },
      ],
    });

    const report = await getInvestmentAnnualIncomeReportForUser(owner.id, 2026);

    expect(report.eventCount).toBe(1);
    expect(report.items).toHaveLength(1);
    expect(report.items[0]?.symbol).toBe("OWN11");
    expect(report.totalsByCurrency).toEqual({ BRL: 100 });
  });
});
