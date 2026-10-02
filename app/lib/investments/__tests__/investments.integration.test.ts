import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));
const quoteMocks = vi.hoisted(() => ({
  fetchBrapiQuote: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));
vi.mock("@/app/lib/investments/brapi-client", () => ({
  fetchBrapiQuote: quoteMocks.fetchBrapiQuote,
}));

import {
  createInvestmentAsset,
  createInvestmentOperation,
  getInvestmentPortfolio,
  refreshInvestmentQuotes,
  removeInvestmentOperation,
} from "@/app/lib/investments/investments";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  quoteMocks.fetchBrapiQuote.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createAsset(userId: string, overrides: Record<string, unknown> = {}) {
  authMocks.getAuthenticatedUserId.mockResolvedValue(userId);
  const response = await createInvestmentAsset(
    jsonRequest("http://localhost/api/investments/assets", {
      symbol: "PETR4",
      name: "Petrobras PN",
      type: "STOCK",
      currency: "BRL",
      market: "B3",
      ...overrides,
    }),
  );
  return { response, body: await response.json() };
}

async function createOperation(
  userId: string,
  input: Record<string, unknown>,
) {
  authMocks.getAuthenticatedUserId.mockResolvedValue(userId);
  const response = await createInvestmentOperation(
    jsonRequest("http://localhost/api/investments/operations", input),
  );
  return { response, body: await response.json() };
}

describe("investments integration", () => {
  it("persists assets and derives a fractional position without creating transactions", async () => {
    const owner = await fixtures.user({ name: "Investment Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
      name: "Corretora",
    });
    const asset = await createAsset(owner.id);

    expect(asset.response.status).toBe(201);

    const buy = await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "10.125",
      unitPriceCents: 3_000,
      feesCents: 50,
      date: "2026-10-01",
    });
    expect(buy.response.status).toBe(201);

    const secondBuy = await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "1.875",
      unitPriceCents: 4_000,
      feesCents: 50,
      date: "2026-10-02",
    });
    expect(secondBuy.response.status).toBe(201);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const portfolioResponse = await getInvestmentPortfolio();
    const portfolio = (await portfolioResponse.json()).data;

    expect(portfolio.positions).toEqual([
      expect.objectContaining({
        symbol: "PETR4",
        quantity: "12",
        currency: "BRL",
        investedCents: 37_975,
      }),
    ]);
    expect(portfolio.totalsByCurrency.BRL).toBe(37_975);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("supports partial and full sells while preventing oversell", async () => {
    const owner = await fixtures.user({ name: "Sell Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
    });
    const asset = await createAsset(owner.id);

    await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "5",
      unitPriceCents: 1_000,
      date: "2026-10-01",
    });

    const oversell = await createOperation(owner.id, {
      type: "SELL",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "6",
      unitPriceCents: 1_200,
      date: "2026-10-02",
    });
    expect(oversell.response.status).toBe(409);
    expect(oversell.body.error.code).toBe("SELL_EXCEEDS_POSITION");

    const partial = await createOperation(owner.id, {
      type: "SELL",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "2",
      unitPriceCents: 1_200,
      date: "2026-10-02",
    });
    expect(partial.response.status).toBe(201);

    const full = await createOperation(owner.id, {
      type: "SELL",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "3",
      unitPriceCents: 1_300,
      date: "2026-10-03",
    });
    expect(full.response.status).toBe(201);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await getInvestmentPortfolio();
    expect((await response.json()).data.positions).toEqual([]);
  });

  it("requires an owned investment account with the same currency as the asset", async () => {
    const [owner, other] = await Promise.all([
      fixtures.user({ name: "Owner" }),
      fixtures.user({ name: "Other" }),
    ]);
    const checking = await fixtures.account(owner.id, {
      type: "CREDIT_DEBIT",
      currency: "BRL",
    });
    const usdInvestment = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "USD",
    });
    const foreignInvestment = await fixtures.account(other.id, {
      type: "INVESTMENT",
      currency: "BRL",
    });
    const asset = await createAsset(owner.id);

    const common = {
      type: "BUY",
      assetId: asset.body.data.id,
      quantity: "1",
      unitPriceCents: 1_000,
      date: "2026-10-01",
    };

    const wrongType = await createOperation(owner.id, {
      ...common,
      accountId: checking.id,
    });
    expect(wrongType.response.status).toBe(409);
    expect(wrongType.body.error.code).toBe("INVESTMENT_ACCOUNT_REQUIRED");

    const wrongCurrency = await createOperation(owner.id, {
      ...common,
      accountId: usdInvestment.id,
    });
    expect(wrongCurrency.response.status).toBe(409);
    expect(wrongCurrency.body.error.code).toBe("INVESTMENT_CURRENCY_MISMATCH");

    const foreign = await createOperation(owner.id, {
      ...common,
      accountId: foreignInvestment.id,
    });
    expect(foreign.response.status).toBe(404);
  });

  it("does not reveal another user's asset and isolates portfolio data", async () => {
    const [owner, other] = await Promise.all([
      fixtures.user({ name: "Owner" }),
      fixtures.user({ name: "Other" }),
    ]);
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
    });
    const foreignAsset = await createAsset(other.id, { symbol: "VALE3" });

    const attempt = await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: foreignAsset.body.data.id,
      quantity: "1",
      unitPriceCents: 1_000,
      date: "2026-10-01",
    });
    expect(attempt.response.status).toBe(404);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const portfolio = await getInvestmentPortfolio();
    expect((await portfolio.json()).data.assets).toEqual([]);
  });

  it("prevents deleting a buy when later sells depend on it", async () => {
    const owner = await fixtures.user({ name: "Delete Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
    });
    const asset = await createAsset(owner.id);

    const buy = await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "2",
      unitPriceCents: 1_000,
      date: "2026-10-01",
    });
    await createOperation(owner.id, {
      type: "SELL",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "1",
      unitPriceCents: 1_200,
      date: "2026-10-02",
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await removeInvestmentOperation(
      new Request(
        `http://localhost/api/investments/operations/${buy.body.data.id}`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: buy.body.data.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("INVESTMENT_DELETE_BREAKS_POSITION");
    expect(
      await prisma.investmentOperation.count({
        where: { userId: owner.id },
      }),
    ).toBe(2);
  });

  it("rejects duplicate asset symbols in the same currency", async () => {
    const owner = await fixtures.user({ name: "Duplicate Owner" });
    expect((await createAsset(owner.id)).response.status).toBe(201);
    expect((await createAsset(owner.id)).response.status).toBe(409);
  });
});


describe("investment market quotes", () => {
  it("persiste cotação, calcula valor de mercado e respeita TTL", async () => {
    const owner = await fixtures.user({ name: "Quote Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
      name: "Corretora",
    });
    const asset = await createAsset(owner.id);

    await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "2.5",
      unitPriceCents: 3_000,
      date: "2026-10-01",
    });

    quoteMocks.fetchBrapiQuote.mockResolvedValue({
      requestedSymbol: "PETR4",
      symbol: "PETR4",
      priceCents: 4_000,
      currency: "BRL",
      referenceAt: new Date("2026-10-02T13:00:00.000Z"),
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const firstRefresh = await refreshInvestmentQuotes();
    expect(firstRefresh.status).toBe(200);
    expect((await firstRefresh.json()).data).toMatchObject({
      refreshed: 1,
      cached: 0,
      failed: [],
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const secondRefresh = await refreshInvestmentQuotes();
    expect((await secondRefresh.json()).data).toMatchObject({
      refreshed: 0,
      cached: 1,
      failed: [],
    });
    expect(quoteMocks.fetchBrapiQuote).toHaveBeenCalledTimes(1);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const portfolioResponse = await getInvestmentPortfolio();
    const portfolio = (await portfolioResponse.json()).data;

    expect(portfolio.positions[0]).toMatchObject({
      symbol: "PETR4",
      marketValueCents: 10_000,
      quote: {
        priceCents: 4_000,
        currency: "BRL",
        source: "BRAPI",
        isStale: false,
      },
    });
  });

  it("preserva última cotação quando a brapi falha", async () => {
    const owner = await fixtures.user({ name: "Fallback Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
    });
    const asset = await createAsset(owner.id);

    await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "1",
      unitPriceCents: 3_000,
      date: "2026-10-01",
    });

    await prisma.assetQuote.create({
      data: {
        assetId: asset.body.data.id,
        priceCents: 3_500,
        currency: "BRL",
        referenceAt: new Date("2026-09-30T13:00:00.000Z"),
        source: "BRAPI",
        fetchedAt: new Date(0),
      },
    });
    quoteMocks.fetchBrapiQuote.mockRejectedValue(
      new Error("Não foi possível consultar a brapi"),
    );

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const refresh = await refreshInvestmentQuotes();
    const refreshBody = await refresh.json();

    expect(refresh.status).toBe(200);
    expect(refreshBody.data.failed).toEqual([
      expect.objectContaining({ symbol: "PETR4" }),
    ]);

    const persisted = await prisma.assetQuote.findUnique({
      where: { assetId: asset.body.data.id },
    });
    expect(persisted?.priceCents).toBe(3_500);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const portfolio = await getInvestmentPortfolio();
    expect((await portfolio.json()).data.positions[0]).toMatchObject({
      marketValueCents: 3_500,
      quote: {
        priceCents: 3_500,
        isStale: true,
      },
    });
  });

  it("rejeita cotação com moeda diferente sem substituir cache", async () => {
    const owner = await fixtures.user({ name: "Currency Quote Owner" });
    const account = await fixtures.account(owner.id, {
      type: "INVESTMENT",
      currency: "BRL",
    });
    const asset = await createAsset(owner.id);

    await createOperation(owner.id, {
      type: "BUY",
      accountId: account.id,
      assetId: asset.body.data.id,
      quantity: "1",
      unitPriceCents: 3_000,
      date: "2026-10-01",
    });

    quoteMocks.fetchBrapiQuote.mockResolvedValue({
      requestedSymbol: "PETR4",
      symbol: "PETR4",
      priceCents: 4_000,
      currency: "USD",
      referenceAt: new Date("2026-10-02T13:00:00.000Z"),
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const refresh = await refreshInvestmentQuotes();
    const body = await refresh.json();

    expect(body.data.refreshed).toBe(0);
    expect(body.data.failed[0]?.message).toContain("Moeda");
    expect(
      await prisma.assetQuote.count({
        where: { assetId: asset.body.data.id },
      }),
    ).toBe(0);
  });
});
