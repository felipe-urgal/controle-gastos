import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { getInvestmentAccountValuesForUser } from "@/app/lib/investments/investment-account-valuation";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

describe("investment account valuation", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("uses market value when quote exists and cost as fallback otherwise", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "Investment value",
        email: `investment-value-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    userIds.push(user.id);

    const account = await prisma.account.create({
      data: {
        name: "Nubank Investimentos",
        type: "INVESTMENT",
        currency: "BRL",
        userId: user.id,
      },
    });
    const [quoted, withoutQuote] = await Promise.all([
      prisma.investmentAsset.create({
        data: {
          symbol: "MXRF11",
          type: "FII",
          currency: "BRL",
          market: "B3",
          userId: user.id,
        },
      }),
      prisma.investmentAsset.create({
        data: {
          symbol: "VGIR11",
          type: "FII",
          currency: "BRL",
          market: "B3",
          userId: user.id,
        },
      }),
    ]);

    await prisma.investmentOperation.createMany({
      data: [
        {
          type: "BUY",
          quantityUnits: BigInt(100) * BigInt(100_000_000),
          unitPriceCents: 900,
          feesCents: 0,
          year: 2026,
          month: 9,
          day: 1,
          userId: user.id,
          accountId: account.id,
          assetId: quoted.id,
        },
        {
          type: "BUY",
          quantityUnits: BigInt(10) * BigInt(100_000_000),
          unitPriceCents: 1_000,
          feesCents: 0,
          year: 2026,
          month: 9,
          day: 1,
          userId: user.id,
          accountId: account.id,
          assetId: withoutQuote.id,
        },
      ],
    });
    await prisma.assetQuote.create({
      data: {
        assetId: quoted.id,
        priceCents: 950,
        currency: "BRL",
        referenceAt: new Date("2026-10-02T12:00:00Z"),
        source: "BRAPI",
        fetchedAt: new Date("2026-10-02T12:00:00Z"),
      },
    });

    const values = await getInvestmentAccountValuesForUser(user.id);

    expect(values.get(account.id)).toEqual({
      accountId: account.id,
      valueCents: 105_000,
      source: "MIXED",
      positionCount: 2,
    });
  });

  it("never mixes another user's positions into the account value", async () => {
    const suffix = randomUUID();
    const [owner, other] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Owner",
          email: `investment-owner-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
      prisma.user.create({
        data: {
          name: "Other",
          email: `investment-other-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
    ]);
    userIds.push(owner.id, other.id);

    const account = await prisma.account.create({
      data: {
        name: "Owner Investimentos",
        type: "INVESTMENT",
        currency: "BRL",
        userId: owner.id,
      },
    });

    const values = await getInvestmentAccountValuesForUser(owner.id);
    expect(values.has(account.id)).toBe(false);
  });
});
