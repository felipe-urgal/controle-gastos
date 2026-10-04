import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  createInvestmentTaxPayment,
  createInvestmentTaxWithholding,
  getInvestmentTaxControlReportForUser,
} from "@/app/lib/investments/investment-tax-control";
import { prisma } from "@/app/lib/prisma";

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn(),
}));

const authMock = vi.mocked(getAuthenticatedUserId);
const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `tax-control-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

describe("investment tax control integration", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    vi.clearAllMocks();
  });

  it("aggregates multiple IRRF records and DARFs by competence", async () => {
    const owner = await createUser("Tax Owner");
    authMock.mockResolvedValue(owner.id);

    for (const amountCents of [120, 80]) {
      const response = await createInvestmentTaxWithholding(
        new Request("http://localhost/api/investments/taxes/withholdings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            assetType: "FII",
            currency: "BRL",
            amountCents,
            year: 2025,
            month: 4,
            day: 15,
          }),
        }),
      );
      expect(response.status).toBe(201);
    }

    for (const amountCents of [500, 300]) {
      const response = await createInvestmentTaxPayment(
        new Request("http://localhost/api/investments/taxes/payments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            assetType: "FII",
            currency: "BRL",
            amountCents,
            competenceYear: 2025,
            competenceMonth: 4,
            code: "6015",
            paidYear: 2025,
            paidMonth: 5,
            paidDay: 20,
          }),
        }),
      );
      expect(response.status).toBe(201);
    }

    const report = await getInvestmentTaxControlReportForUser(owner.id, 2025);

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      month: 4,
      taxGroup: "FII_FIAGRO",
      currency: "BRL",
      withholdingCents: 200,
      paidDarfCents: 800,
      taxDueCents: 0,
      openTaxBalanceCents: 0,
      status: "OK",
    });
    expect(report.ruleSupported).toBe(true);
    expect(report.taxExercise).toBe(2026);
    expect(report.darfCode).toBe("6015");
    expect(report.totalsByCurrency).toEqual({
      BRL: {
        withholdingCents: 200,
        paidDarfCents: 800,
        taxDueCents: 0,
        openTaxBalanceCents: 0,
      },
    });
  });

  it("links IRRF to an owned operation and rejects another user's operation", async () => {
    const [owner, other] = await Promise.all([
      createUser("Tax Owner"),
      createUser("Tax Other"),
    ]);
    const account = await prisma.account.create({
      data: {
        name: "Other Broker",
        type: "INVESTMENT",
        currency: "BRL",
        userId: other.id,
      },
    });
    const asset = await prisma.investmentAsset.create({
      data: {
        symbol: "OTHER11",
        type: "FII",
        currency: "BRL",
        market: "B3",
        userId: other.id,
      },
    });
    const operation = await prisma.investmentOperation.create({
      data: {
        type: "SELL",
        quantityUnits: BigInt(100_000_000),
        unitPriceCents: 1_000,
        feesCents: 0,
        year: 2026,
        month: 4,
        day: 1,
        userId: other.id,
        accountId: account.id,
        assetId: asset.id,
      },
    });

    authMock.mockResolvedValue(owner.id);
    const response = await createInvestmentTaxWithholding(
      new Request("http://localhost/api/investments/taxes/withholdings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType: "FII",
          currency: "BRL",
          amountCents: 100,
          year: 2026,
          month: 4,
          day: 1,
          operationId: operation.id,
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(
      await prisma.investmentTaxWithholding.count({
        where: { userId: owner.id },
      }),
    ).toBe(0);
  });

  it("keeps legacy foreign-currency fiscal records pending instead of calculating local tax", async () => {
    const owner = await createUser("Foreign Tax Owner");

    await prisma.investmentTaxWithholding.create({
      data: {
        userId: owner.id,
        assetType: "STOCK",
        currency: "USD",
        amountCents: 999,
        year: 2026,
        month: 4,
        day: 1,
      },
    });

    const report = await getInvestmentTaxControlReportForUser(owner.id, 2026);

    expect(report.status).toBe("PENDING");
    expect(report.unsupportedCurrencies).toEqual(["USD"]);
    expect(report.rows).toEqual([]);
    expect(report.totalsByCurrency).toEqual({});
  });

  it("rejects new IRRF and DARF records in foreign currencies", async () => {
    const owner = await createUser("Foreign Tax Owner");
    authMock.mockResolvedValue(owner.id);

    const withholding = await createInvestmentTaxWithholding(
      new Request("http://localhost/api/investments/taxes/withholdings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType: "STOCK",
          currency: "USD",
          amountCents: 100,
          year: 2026,
          month: 4,
          day: 1,
        }),
      }),
    );
    expect(withholding.status).toBe(400);

    const payment = await createInvestmentTaxPayment(
      new Request("http://localhost/api/investments/taxes/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType: "ETF",
          currency: "EUR",
          amountCents: 1_000,
          competenceYear: 2026,
          competenceMonth: 4,
          code: "6015",
          paidYear: 2026,
          paidMonth: 5,
          paidDay: 20,
        }),
      }),
    );
    expect(payment.status).toBe(400);

    expect(
      await prisma.investmentTaxWithholding.count({ where: { userId: owner.id } }),
    ).toBe(0);
    expect(
      await prisma.investmentTaxPayment.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("rejects local IRRF for a BRL asset classified abroad", async () => {
    const owner = await createUser("Foreign BRL Tax Owner");
    const asset = await prisma.investmentAsset.create({
      data: {
        symbol: "FOREIGNBRL",
        type: "STOCK",
        currency: "BRL",
        market: "OTC",
        taxLocation: "ABROAD",
        userId: owner.id,
      },
    });

    authMock.mockResolvedValue(owner.id);
    const response = await createInvestmentTaxWithholding(
      new Request("http://localhost/api/investments/taxes/withholdings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType: "STOCK",
          currency: "BRL",
          amountCents: 100,
          year: 2026,
          month: 4,
          day: 1,
          assetId: asset.id,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(
      await prisma.investmentTaxWithholding.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("uses a semantic tax-rule dependency instead of an issue number", async () => {
    const owner = await createUser("Tax Rules Owner");

    const supported = await getInvestmentTaxControlReportForUser(owner.id, 2026);
    expect(supported.ruleSupported).toBe(true);
    expect(supported.ruleDependency).toBeNull();

    const unsupported = await getInvestmentTaxControlReportForUser(owner.id, 2027);
    expect(unsupported.ruleSupported).toBe(false);
    expect(unsupported.status).toBe("WAITING_RULES");
    expect(unsupported.ruleDependency).toBe("TAX_RULE_CATALOG");
  });

  it("keeps DARF and IRRF records isolated by ownership", async () => {
    const [owner, other] = await Promise.all([
      createUser("Tax Owner"),
      createUser("Tax Other"),
    ]);

    await prisma.investmentTaxWithholding.create({
      data: {
        userId: other.id,
        assetType: "FII",
        currency: "BRL",
        amountCents: 999,
        year: 2026,
        month: 4,
        day: 1,
      },
    });
    await prisma.investmentTaxPayment.create({
      data: {
        userId: other.id,
        assetType: "FII",
        currency: "BRL",
        amountCents: 999,
        competenceYear: 2026,
        competenceMonth: 4,
        code: "6015",
        paidYear: 2026,
        paidMonth: 5,
        paidDay: 1,
      },
    });

    const report = await getInvestmentTaxControlReportForUser(owner.id, 2026);

    expect(report.rows).toEqual([]);
    expect(report.totalsByCurrency).toEqual({});
  });
});
