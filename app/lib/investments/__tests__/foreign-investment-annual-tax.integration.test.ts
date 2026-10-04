import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const ptaxMocks = vi.hoisted(() => ({
  fetchPtaxExchangeRate: vi.fn(),
}));

vi.mock("@/app/lib/currency/ptax-client", () => ({
  fetchPtaxExchangeRate: ptaxMocks.fetchPtaxExchangeRate,
}));

import {
  getForeignInvestmentAnnualTaxReportForUser,
  refreshForeignInvestmentPtaxForUser,
} from "@/app/lib/investments/foreign-investment-annual-tax";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `foreign-tax-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createContext(args: {
  userId: string;
  symbol: string;
  currency?: "BRL" | "USD" | "EUR";
  taxLocation?: "BRAZIL" | "ABROAD";
}) {
  const currency = args.currency ?? "USD";
  const [account, asset] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Broker ${args.symbol}`,
        type: "INVESTMENT",
        currency,
        userId: args.userId,
      },
    }),
    prisma.investmentAsset.create({
      data: {
        symbol: args.symbol,
        type: "STOCK",
        currency,
        market: args.taxLocation === "BRAZIL" ? "B3" : "NASDAQ",
        taxLocation: args.taxLocation ?? "ABROAD",
        userId: args.userId,
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
  year: number;
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
      year: args.year,
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
      year: args.year,
      month: args.month,
      day: args.day,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
      operationId: operation.id,
    },
  });
  return operation;
}

async function addRate(args: {
  userId: string;
  side: "BUY" | "SELL";
  numerator: number;
  denominator?: number;
  year: number;
  month: number;
  day: number;
  currency?: "USD" | "EUR";
}) {
  return prisma.exchangeRate.create({
    data: {
      userId: args.userId,
      fromCurrency: args.currency ?? "USD",
      toCurrency: "BRL",
      numerator: args.numerator,
      denominator: args.denominator ?? 1,
      source: "BCB_PTAX",
      quoteSide: args.side,
      referenceYear: args.year,
      referenceMonth: args.month,
      referenceDay: args.day,
    },
  });
}

async function addIncome(args: {
  userId: string;
  accountId: string;
  assetId: string;
  type?: "DIVIDEND" | "INTEREST" | "INCOME";
  amountCents: number;
  year: number;
  month: number;
  day: number;
}) {
  return prisma.investmentIncome.create({
    data: {
      type: args.type ?? "DIVIDEND",
      quantityUnits: parseInvestmentQuantity("1")!,
      unitValueCents: args.amountCents,
      netAmountCents: args.amountCents,
      year: args.year,
      month: args.month,
      day: args.day,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
    },
  });
}

describe("foreign investment annual tax", () => {
  afterEach(async () => {
    ptaxMocks.fetchPtaxExchangeRate.mockReset();
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("uses PTAX BUY for cost and PTAX SELL for proceeds, including FX variation", async () => {
    const user = await createUser("Foreign Tax Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "USSTOCK",
    });

    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "10",
      priceCents: 10_000,
      year: 2025,
      month: 1,
      day: 10,
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "10",
      priceCents: 12_000,
      year: 2025,
      month: 6,
      day: 10,
    });
    await addRate({
      userId: user.id,
      side: "BUY",
      numerator: 5,
      year: 2025,
      month: 1,
      day: 10,
    });
    await addRate({
      userId: user.id,
      side: "SELL",
      numerator: 6,
      year: 2025,
      month: 6,
      day: 10,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.status).toBe("OK");
    expect(report.sales).toEqual([
      expect.objectContaining({
        symbol: "USSTOCK",
        netProceedsBrlCents: 720_000,
        allocatedCostBrlCents: 500_000,
        realizedResultBrlCents: 220_000,
        status: "OK",
      }),
    ]);
    expect(report.summary).toMatchObject({
      saleResultCents: 220_000,
      incomeCents: 0,
      taxableBaseCents: 220_000,
      taxDueCents: 33_000,
      closingLossCents: 0,
    });
  });

  it("uses weighted BRL cost basis on a partial sale", async () => {
    const user = await createUser("Partial Foreign Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "PARTIAL",
    });

    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "10",
      priceCents: 10_000,
      year: 2025,
      month: 1,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "10",
      priceCents: 10_000,
      year: 2025,
      month: 2,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "10",
      priceCents: 12_000,
      year: 2025,
      month: 3,
      day: 2,
    });

    await addRate({
      userId: user.id,
      side: "BUY",
      numerator: 5,
      year: 2025,
      month: 1,
      day: 2,
    });
    await addRate({
      userId: user.id,
      side: "BUY",
      numerator: 6,
      year: 2025,
      month: 2,
      day: 2,
    });
    await addRate({
      userId: user.id,
      side: "SELL",
      numerator: 13,
      denominator: 2,
      year: 2025,
      month: 3,
      day: 2,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.sales[0]).toMatchObject({
      netProceedsBrlCents: 780_000,
      allocatedCostBrlCents: 550_000,
      realizedResultBrlCents: 230_000,
    });
  });

  it("carries 2024 losses into 2025 and offsets foreign income", async () => {
    const user = await createUser("Carry Foreign Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "CARRY",
    });

    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "10",
      priceCents: 10_000,
      year: 2024,
      month: 1,
      day: 10,
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "10",
      priceCents: 8_000,
      year: 2024,
      month: 6,
      day: 10,
    });
    await addIncome({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      amountCents: 100_000,
      year: 2025,
      month: 4,
      day: 10,
    });

    await addRate({
      userId: user.id,
      side: "BUY",
      numerator: 6,
      year: 2024,
      month: 1,
      day: 10,
    });
    await addRate({
      userId: user.id,
      side: "SELL",
      numerator: 5,
      year: 2024,
      month: 6,
      day: 10,
    });
    await addRate({
      userId: user.id,
      side: "SELL",
      numerator: 5,
      year: 2025,
      month: 4,
      day: 10,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.annualRows).toEqual([
      expect.objectContaining({
        year: 2024,
        netResultBeforeLossCents: -200_000,
        closingLossCents: 200_000,
        taxDueCents: 0,
      }),
      expect.objectContaining({
        year: 2025,
        incomeCents: 500_000,
        openingLossCents: 200_000,
        compensatedLossCents: 200_000,
        taxableBaseCents: 300_000,
        taxDueCents: 45_000,
        closingLossCents: 0,
      }),
    ]);
  });

  it("keeps the annual tax pending when a required PTAX is missing", async () => {
    const user = await createUser("Missing PTAX Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "MISSING",
    });

    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 10_000,
      year: 2025,
      month: 1,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 12_000,
      year: 2025,
      month: 2,
      day: 2,
    });
    await addRate({
      userId: user.id,
      side: "SELL",
      numerator: 6,
      year: 2025,
      month: 2,
      day: 2,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.status).toBe("PENDING");
    expect(report.summary.taxDueCents).toBeNull();
    expect(report.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_PTAX",
          symbol: "MISSING",
        }),
      ]),
    );
  });

  it("ignores BRAZIL assets and isolates ownership", async () => {
    const [owner, other] = await Promise.all([
      createUser("Foreign Owner"),
      createUser("Foreign Other"),
    ]);
    const brazil = await createContext({
      userId: owner.id,
      symbol: "BRONLY",
      currency: "BRL",
      taxLocation: "BRAZIL",
    });
    const foreign = await createContext({
      userId: other.id,
      symbol: "OTHERUSD",
    });

    await addOperation({
      userId: owner.id,
      accountId: brazil.account.id,
      assetId: brazil.asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 1_000,
      year: 2025,
      month: 1,
      day: 1,
    });
    await addOperation({
      userId: owner.id,
      accountId: brazil.account.id,
      assetId: brazil.asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 2_000,
      year: 2025,
      month: 2,
      day: 1,
    });
    await addIncome({
      userId: other.id,
      accountId: foreign.account.id,
      assetId: foreign.asset.id,
      amountCents: 10_000,
      year: 2025,
      month: 3,
      day: 1,
    });
    await addRate({
      userId: other.id,
      side: "SELL",
      numerator: 5,
      year: 2025,
      month: 3,
      day: 1,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      owner.id,
      2025,
    );

    expect(report.sales).toEqual([]);
    expect(report.incomes).toEqual([]);
    expect(report.summary.taxDueCents).toBe(0);
  });

  it("refreshes missing PTAX idempotently", async () => {
    const user = await createUser("PTAX Refresh Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "PTAXREF",
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 10_000,
      year: 2025,
      month: 1,
      day: 10,
    });

    ptaxMocks.fetchPtaxExchangeRate.mockResolvedValue({
      from: "USD",
      to: "BRL",
      numerator: 5,
      denominator: 1,
      referenceDate: { year: 2025, month: 1, day: 10 },
      quoteSide: "BUY",
    });

    const first = await refreshForeignInvestmentPtaxForUser(user.id, 2025);
    const second = await refreshForeignInvestmentPtaxForUser(user.id, 2025);

    expect(first).toMatchObject({
      requested: 1,
      fetched: 1,
      reused: 0,
      failed: [],
    });
    expect(second).toMatchObject({
      requested: 1,
      fetched: 0,
      reused: 1,
      failed: [],
    });
    expect(
      await prisma.exchangeRate.count({
        where: {
          userId: user.id,
          source: "BCB_PTAX",
          quoteSide: "BUY",
        },
      }),
    ).toBe(1);
    expect(ptaxMocks.fetchPtaxExchangeRate).toHaveBeenCalledTimes(1);
  });
});
