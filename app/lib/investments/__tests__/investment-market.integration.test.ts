import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { INVESTMENT_QUANTITY_SCALE } from "@/app/lib/investments/investment-domain";
import {
  INVESTMENT_QUOTE_TTL_MS,
  listInvestmentMarketDataForUser,
} from "@/app/lib/investments/investment-market";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("investment market data", () => {
  it("caches quotes, calculates market value and falls back to stale data", async () => {
    const owner = await fixtures.user({ name: "Quote Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
      name: "Corretora",
    });
    const asset = await prisma.investmentAsset.create({
      data: {
        userId: owner.id,
        symbol: "PETR4",
        name: "Petrobras PN",
        type: "STOCK",
        currency: "BRL",
        market: "B3",
      },
    });
    await prisma.investmentOperation.create({
      data: {
        userId: owner.id,
        accountId: account.id,
        assetId: asset.id,
        type: "BUY",
        quantityUnits: (INVESTMENT_QUANTITY_SCALE * BigInt(5)) / BigInt(2),
        unitPriceCents: 3_000,
        feesCents: 0,
        year: 2026,
        month: 10,
        day: 1,
      },
    });

    const now = new Date("2026-10-02T13:00:00.000Z");
    const fetchQuote = vi.fn(async () => ({
      symbol: "PETR4",
      priceCents: 4_000,
      currency: "BRL",
      referenceAt: new Date("2026-10-02T12:30:00.000Z"),
      source: "BRAPI" as const,
    }));

    const first = await listInvestmentMarketDataForUser(owner.id, { now, fetchQuote });
    expect(first.positions).toEqual([
      expect.objectContaining({
        assetId: asset.id,
        priceCents: 4_000,
        marketValueCents: 10_000,
        stale: false,
      }),
    ]);
    expect(fetchQuote).toHaveBeenCalledTimes(1);

    fetchQuote.mockClear();
    const cached = await listInvestmentMarketDataForUser(owner.id, {
      now: new Date(now.getTime() + 5 * 60_000),
      fetchQuote,
    });
    expect(cached.positions[0]).toMatchObject({
      marketValueCents: 10_000,
      stale: false,
    });
    expect(fetchQuote).not.toHaveBeenCalled();

    await prisma.assetQuote.update({
      where: { assetId: asset.id },
      data: { fetchedAt: new Date(now.getTime() - INVESTMENT_QUOTE_TTL_MS - 1) },
    });
    const failingFetch = vi.fn(async () => {
      throw new Error("brapi indisponível");
    });
    const stale = await listInvestmentMarketDataForUser(owner.id, {
      now,
      fetchQuote: failingFetch,
    });
    expect(stale.positions[0]).toMatchObject({
      marketValueCents: 10_000,
      stale: true,
    });

    await prisma.assetQuote.delete({ where: { assetId: asset.id } });
    const unavailable = await listInvestmentMarketDataForUser(owner.id, {
      now,
      fetchQuote: failingFetch,
    });
    expect(unavailable.positions).toEqual([]);
  });

  it("does not request unsupported or non-BRL positions", async () => {
    const owner = await fixtures.user({ name: "Unsupported Quote Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "USD",
    });
    const asset = await prisma.investmentAsset.create({
      data: {
        userId: owner.id,
        symbol: "BTC",
        type: "CRYPTO",
        currency: "USD",
      },
    });
    await prisma.investmentOperation.create({
      data: {
        userId: owner.id,
        accountId: account.id,
        assetId: asset.id,
        type: "BUY",
        quantityUnits: INVESTMENT_QUANTITY_SCALE,
        unitPriceCents: 1_000,
        feesCents: 0,
        year: 2026,
        month: 10,
        day: 1,
      },
    });
    const fetchQuote = vi.fn();

    const market = await listInvestmentMarketDataForUser(owner.id, { fetchQuote });
    expect(market.positions).toEqual([]);
    expect(fetchQuote).not.toHaveBeenCalled();
  });
});
