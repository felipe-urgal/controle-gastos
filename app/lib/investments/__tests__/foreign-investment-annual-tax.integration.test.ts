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

async function addForeignTaxPaid(args: {
  userId: string;
  assetId: string;
  incomeId?: string;
  fiscalEventId?: string;
  amountCents: number;
  currency?: "BRL" | "USD" | "EUR";
  year: number;
  month: number;
  day: number;
}) {
  return prisma.investmentForeignTaxPaid.create({
    data: {
      userId: args.userId,
      assetId: args.assetId,
      incomeId: args.incomeId ?? null,
      fiscalEventId: args.fiscalEventId ?? null,
      countryCode: "US",
      currency: args.currency ?? "USD",
      amountCents: args.amountCents,
      paidYear: args.year,
      paidMonth: args.month,
      paidDay: args.day,
      eligibilityBasis: "RECIPROCITY",
      nonRefundableConfirmed: true,
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

  it("allows a new auditable position after a fully liquidated unknown basis", async () => {
    const user = await createUser("Reset Basis Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "RESET",
    });

    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 10_000,
      year: 2024,
      month: 1,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 11_000,
      year: 2024,
      month: 2,
      day: 2,
    });

    await addRate({
      userId: user.id,
      side: "SELL",
      numerator: 5,
      year: 2024,
      month: 2,
      day: 2,
    });

    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 20_000,
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
      priceCents: 22_000,
      year: 2025,
      month: 2,
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
      side: "SELL",
      numerator: 5,
      year: 2025,
      month: 2,
      day: 2,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.sales).toEqual([
      expect.objectContaining({
        date: "2025-02-02",
        allocatedCostBrlCents: 100_000,
        netProceedsBrlCents: 110_000,
        realizedResultBrlCents: 10_000,
        status: "OK",
      }),
    ]);
    expect(report.status).toBe("PENDING");
    expect(report.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          year: 2024,
          code: "MISSING_PTAX",
        }),
        expect.objectContaining({
          year: 2025,
          code: "PRIOR_YEAR_PENDING",
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

  it("applies foreign tax paid on a dividend using PTAX BUY", async () => {
    const user = await createUser("Foreign Credit Dividend Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "DIVCREDIT",
    });
    const income = await addIncome({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      amountCents: 10_000,
      year: 2025,
      month: 4,
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
    await addForeignTaxPaid({
      userId: user.id,
      assetId: asset.id,
      incomeId: income.id,
      amountCents: 1_000,
      year: 2025,
      month: 4,
      day: 10,
    });
    await addRate({
      userId: user.id,
      side: "BUY",
      numerator: 5,
      year: 2025,
      month: 4,
      day: 10,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.status).toBe("OK");
    expect(report.summary).toMatchObject({
      incomeCents: 50_000,
      taxDueCents: 7_500,
      foreignTaxPaidBrlCents: 5_000,
      foreignTaxEligibleCents: 5_000,
      foreignTaxCreditAppliedCents: 5_000,
      foreignTaxExcessCents: 0,
      netTaxDueCents: 2_500,
    });
    expect(report.foreignTaxCredits).toEqual([
      expect.objectContaining({
        eventType: "INCOME",
        eventId: income.id,
        amountBrlCents: 5_000,
        eventBrazilianTaxCapCents: 7_500,
        eligibleCreditCents: 5_000,
        excessCents: 0,
        status: "OK",
      }),
    ]);
  });

  it("caps multiple foreign tax payments cumulatively at the same event", async () => {
    const user = await createUser("Foreign Credit Event Cap Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "MULTICREDIT",
    });
    const income = await addIncome({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      amountCents: 10_000,
      year: 2025,
      month: 5,
      day: 2,
    });
    await addRate({
      userId: user.id,
      side: "SELL",
      numerator: 5,
      year: 2025,
      month: 5,
      day: 2,
    });
    for (const day of [2, 3]) {
      await addForeignTaxPaid({
        userId: user.id,
        assetId: asset.id,
        incomeId: income.id,
        amountCents: 1_000,
        year: 2025,
        month: 5,
        day,
      });
      await addRate({
        userId: user.id,
        side: "BUY",
        numerator: 5,
        year: 2025,
        month: 5,
        day,
      });
    }

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.summary).toMatchObject({
      taxDueCents: 7_500,
      foreignTaxPaidBrlCents: 10_000,
      foreignTaxEligibleCents: 7_500,
      foreignTaxCreditAppliedCents: 7_500,
      foreignTaxExcessCents: 2_500,
      netTaxDueCents: 0,
    });
    expect(
      report.foreignTaxCredits.reduce(
        (sum, item) => sum + (item.eligibleCreditCents ?? 0),
        0,
      ),
    ).toBe(7_500);
  });

  it("caps the applied credit at annual Brazilian tax after losses", async () => {
    const user = await createUser("Foreign Credit Annual Cap Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "ANNUALCAP",
      currency: "BRL",
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 50_000,
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
      priceCents: 10_000,
      year: 2025,
      month: 2,
      day: 2,
    });
    const income = await addIncome({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      amountCents: 50_000,
      year: 2025,
      month: 5,
      day: 2,
    });
    await addForeignTaxPaid({
      userId: user.id,
      assetId: asset.id,
      incomeId: income.id,
      amountCents: 5_000,
      currency: "BRL",
      year: 2025,
      month: 5,
      day: 2,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.summary).toMatchObject({
      saleResultCents: -40_000,
      incomeCents: 50_000,
      taxableBaseCents: 10_000,
      taxDueCents: 1_500,
      foreignTaxEligibleCents: 1_500,
      foreignTaxCreditAppliedCents: 1_500,
      foreignTaxExcessCents: 3_500,
      netTaxDueCents: 0,
    });
  });

  it("does not use credit from an application with zero annual result against another application", async () => {
    const user = await createUser("Foreign Credit Application Cap Owner");
    const first = await createContext({
      userId: user.id,
      symbol: "ZERONET",
      currency: "BRL",
    });
    const second = await createContext({
      userId: user.id,
      symbol: "OTHERGAIN",
      currency: "BRL",
    });

    await addOperation({
      userId: user.id,
      accountId: first.account.id,
      assetId: first.asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 10_000,
      year: 2025,
      month: 1,
      day: 2,
    });
    const firstSaleGain = await addOperation({
      userId: user.id,
      accountId: first.account.id,
      assetId: first.asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 20_000,
      year: 2025,
      month: 2,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: first.account.id,
      assetId: first.asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 20_000,
      year: 2025,
      month: 3,
      day: 2,
    });
    await addOperation({
      userId: user.id,
      accountId: first.account.id,
      assetId: first.asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 10_000,
      year: 2025,
      month: 4,
      day: 2,
    });

    await addOperation({
      userId: user.id,
      accountId: second.account.id,
      assetId: second.asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 10_000,
      year: 2025,
      month: 1,
      day: 3,
    });
    await addOperation({
      userId: user.id,
      accountId: second.account.id,
      assetId: second.asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 20_000,
      year: 2025,
      month: 5,
      day: 2,
    });

    await addForeignTaxPaid({
      userId: user.id,
      assetId: first.asset.id,
      fiscalEventId: firstSaleGain.id,
      amountCents: 1_500,
      currency: "BRL",
      year: 2025,
      month: 2,
      day: 2,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.summary).toMatchObject({
      saleResultCents: 10_000,
      taxDueCents: 1_500,
      foreignTaxPaidBrlCents: 1_500,
      foreignTaxEligibleCents: 0,
      foreignTaxCreditAppliedCents: 0,
      foreignTaxExcessCents: 1_500,
      netTaxDueCents: 1_500,
    });
    expect(report.foreignTaxCredits[0]).toMatchObject({
      assetId: first.asset.id,
      eventId: firstSaleGain.id,
      eventBrazilianTaxCapCents: 1_500,
      assetYearTaxableBaseCents: 0,
      assetYearBrazilianTaxCapCents: 0,
      eligibleCreditCents: 0,
    });
  });

  it("applies credit to a foreign sale only up to the positive sale tax cap", async () => {
    const user = await createUser("Foreign Sale Credit Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "SALECREDIT",
      currency: "BRL",
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
    const sale = await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 30_000,
      year: 2025,
      month: 6,
      day: 2,
    });
    await addForeignTaxPaid({
      userId: user.id,
      assetId: asset.id,
      fiscalEventId: sale.id,
      amountCents: 4_000,
      currency: "BRL",
      year: 2025,
      month: 6,
      day: 2,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.summary).toMatchObject({
      saleResultCents: 20_000,
      taxDueCents: 3_000,
      foreignTaxEligibleCents: 3_000,
      foreignTaxCreditAppliedCents: 3_000,
      foreignTaxExcessCents: 1_000,
      netTaxDueCents: 0,
    });
    expect(report.foreignTaxCredits[0]).toMatchObject({
      eventType: "SALE",
      eventId: sale.id,
      eventBrazilianTaxCapCents: 3_000,
      eligibleCreditCents: 3_000,
    });
  });

  it("keeps credit pending when PTAX BUY for foreign tax payment is missing", async () => {
    const user = await createUser("Foreign Credit Missing PTAX Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "CREDITPTAX",
    });
    const income = await addIncome({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      amountCents: 10_000,
      year: 2025,
      month: 4,
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
    await addForeignTaxPaid({
      userId: user.id,
      assetId: asset.id,
      incomeId: income.id,
      amountCents: 1_000,
      year: 2025,
      month: 4,
      day: 11,
    });

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.status).toBe("PENDING");
    expect(report.summary.netTaxDueCents).toBeNull();
    expect(report.foreignTaxCredits[0]).toMatchObject({
      status: "PENDING",
      amountBrlCents: null,
    });
    expect(report.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_PTAX",
          symbol: "CREDITPTAX",
        }),
      ]),
    );
  });

  it("refreshes PTAX BUY required by foreign tax payment", async () => {
    const user = await createUser("Foreign Credit PTAX Refresh Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "CREDITREFRESH",
    });
    const income = await addIncome({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      amountCents: 10_000,
      year: 2025,
      month: 4,
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
    await addForeignTaxPaid({
      userId: user.id,
      assetId: asset.id,
      incomeId: income.id,
      amountCents: 1_000,
      year: 2025,
      month: 4,
      day: 11,
    });

    ptaxMocks.fetchPtaxExchangeRate.mockResolvedValue({
      from: "USD",
      to: "BRL",
      numerator: 5,
      denominator: 1,
      referenceDate: { year: 2025, month: 4, day: 11 },
      quoteSide: "BUY",
    });

    const first = await refreshForeignInvestmentPtaxForUser(user.id, 2025);
    const second = await refreshForeignInvestmentPtaxForUser(user.id, 2025);

    expect(first).toMatchObject({
      fetched: 1,
      failed: [],
    });
    expect(second.fetched).toBe(0);
    expect(second.reused).toBeGreaterThanOrEqual(2);
    expect(
      await prisma.exchangeRate.count({
        where: {
          userId: user.id,
          source: "BCB_PTAX",
          quoteSide: "BUY",
          referenceYear: 2025,
          referenceMonth: 4,
          referenceDay: 11,
        },
      }),
    ).toBe(1);
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

  it("never accepts a MANUAL rate as PTAX in the fiscal report", async () => {
    const user = await createUser("Manual Is Not PTAX Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "MANUALFX",
    });
    for (const [type, month, price] of [
      ["BUY", 1, 10_000],
      ["SELL", 2, 12_000],
    ] as const) {
      await addOperation({
        userId: user.id,
        accountId: account.id,
        assetId: asset.id,
        type,
        quantity: "1",
        priceCents: price,
        year: 2025,
        month,
        day: 2,
      });
    }
    for (const month of [1, 2]) {
      await prisma.exchangeRate.create({
        data: {
          userId: user.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 9,
          denominator: 1,
          source: "MANUAL",
          quoteSide: "GENERIC",
          referenceYear: 2025,
          referenceMonth: month,
          referenceDay: 2,
        },
      });
    }

    const report = await getForeignInvestmentAnnualTaxReportForUser(
      user.id,
      2025,
    );

    expect(report.status).toBe("PENDING");
    expect(report.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_PTAX", symbol: "MANUALFX" }),
      ]),
    );
  });

  it("refresh ignores MANUAL: manual only fetches, PTAX exists reuses, manual is kept", async () => {
    const user = await createUser("Refresh Ignores Manual Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "REFMANUAL",
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "1",
      priceCents: 10_000,
      year: 2025,
      month: 3,
      day: 10,
    });
    const manual = await prisma.exchangeRate.create({
      data: {
        userId: user.id,
        fromCurrency: "USD",
        toCurrency: "BRL",
        numerator: 9,
        denominator: 1,
        source: "MANUAL",
        quoteSide: "GENERIC",
        referenceYear: 2025,
        referenceMonth: 3,
        referenceDay: 10,
      },
    });
    ptaxMocks.fetchPtaxExchangeRate.mockResolvedValue({
      from: "USD",
      to: "BRL",
      numerator: 5,
      denominator: 1,
      referenceDate: { year: 2025, month: 3, day: 10 },
      quoteSide: "BUY",
    });

    const first = await refreshForeignInvestmentPtaxForUser(user.id, 2025);
    const second = await refreshForeignInvestmentPtaxForUser(user.id, 2025);

    expect(first).toMatchObject({ requested: 1, fetched: 1, reused: 0 });
    expect(second).toMatchObject({ requested: 1, fetched: 0, reused: 1 });
    expect(ptaxMocks.fetchPtaxExchangeRate).toHaveBeenCalledTimes(1);
    const kept = await prisma.exchangeRate.findUnique({
      where: { id: manual.id },
    });
    expect(kept).toMatchObject({ numerator: 9, source: "MANUAL" });
  });

  it("PTAX BUY does not satisfy a SELL requirement (and vice versa) in refresh", async () => {
    const user = await createUser("Refresh Side Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "REFSIDE",
    });
    await addOperation({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "1",
      priceCents: 10_000,
      year: 2025,
      month: 4,
      day: 7,
    });
    await addRate({
      userId: user.id,
      side: "BUY",
      numerator: 5,
      year: 2025,
      month: 4,
      day: 7,
    });
    ptaxMocks.fetchPtaxExchangeRate.mockResolvedValue({
      from: "USD",
      to: "BRL",
      numerator: 6,
      denominator: 1,
      referenceDate: { year: 2025, month: 4, day: 7 },
      quoteSide: "SELL",
    });

    const result = await refreshForeignInvestmentPtaxForUser(user.id, 2025);

    expect(result).toMatchObject({ fetched: 1, reused: 0 });
    expect(ptaxMocks.fetchPtaxExchangeRate).toHaveBeenCalledWith(
      expect.objectContaining({ quoteSide: "SELL" }),
    );
  });

  it("refresh runs with limited concurrency and keeps partial failures", async () => {
    const user = await createUser("Refresh Concurrency Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "REFCONC",
    });
    for (let day = 1; day <= 10; day += 1) {
      await addOperation({
        userId: user.id,
        accountId: account.id,
        assetId: asset.id,
        type: "BUY",
        quantity: "1",
        priceCents: 10_000,
        year: 2025,
        month: 5,
        day: day * 2,
      });
    }
    let active = 0;
    let maxActive = 0;
    ptaxMocks.fetchPtaxExchangeRate.mockImplementation(
      async (input: { referenceDate: { year: number; month: number; day: number } }) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        if (input.referenceDate.day === 4) throw new Error("BCB indisponível");
        return {
          from: "USD",
          to: "BRL",
          numerator: 5,
          denominator: 1,
          referenceDate: input.referenceDate,
          quoteSide: "BUY",
        };
      },
    );

    const result = await refreshForeignInvestmentPtaxForUser(user.id, 2025);

    expect(result.requested).toBe(10);
    expect(result.fetched).toBe(9);
    expect(result.failed).toHaveLength(1);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(4);
  });

  it("loads only the needed PTAX rows (not the whole FX history)", async () => {
    const user = await createUser("Query Budget Owner");
    const { account, asset } = await createContext({
      userId: user.id,
      symbol: "QBUDGET",
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
      day: 6,
    });
    await prisma.exchangeRate.createMany({
      data: [
        ...Array.from({ length: 30 }, (_, index) => ({
          userId: user.id,
          fromCurrency: "EUR",
          toCurrency: "BRL",
          numerator: 6,
          denominator: 1,
          source: "BCB_PTAX" as const,
          quoteSide: "BUY" as const,
          referenceYear: 2025,
          referenceMonth: 1,
          referenceDay: index + 1,
        })),
        {
          userId: user.id,
          fromCurrency: "USD",
          toCurrency: "EUR",
          numerator: 9,
          denominator: 10,
          source: "BCB_PTAX" as const,
          quoteSide: "BUY" as const,
          referenceYear: 2025,
          referenceMonth: 1,
          referenceDay: 6,
        },
      ],
    });
    const spy = vi.spyOn(prisma.exchangeRate, "findMany");
    try {
      await getForeignInvestmentAnnualTaxReportForUser(user.id, 2025);
      const where = spy.mock.calls[0]![0]!.where as {
        fromCurrency: { in: string[] };
      };
      expect(spy).toHaveBeenCalledTimes(1);
      expect(where.fromCurrency.in).toEqual(["USD"]);
    } finally {
      spy.mockRestore();
    }
  });
});
