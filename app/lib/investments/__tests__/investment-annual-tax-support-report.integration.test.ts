import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  annualTaxReportToCsv,
  annualTaxReportToPdf,
} from "@/app/lib/investments/investment-annual-tax-support-export";
import { getAnnualTaxSupportReportForUser } from "@/app/lib/investments/investment-annual-tax-support-report";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `annual-report-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function addIncome(args: {
  userId: string;
  symbol: string;
  currency: "BRL" | "USD";
  amountCents: number;
  type?: "INCOME" | "DIVIDEND";
}) {
  const [account, asset] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Broker ${args.currency} ${randomUUID()}`,
        type: "INVESTMENT",
        currency: args.currency,
        userId: args.userId,
      },
    }),
    prisma.investmentAsset.create({
      data: {
        symbol: args.symbol,
        type: "FII",
        currency: args.currency,
        market: args.currency === "BRL" ? "B3" : null,
        userId: args.userId,
      },
    }),
  ]);

  await prisma.investmentIncome.create({
    data: {
      type: args.type ?? "DIVIDEND",
      quantityUnits: parseInvestmentQuantity("10")!,
      unitValueCents: Math.max(1, Math.round(args.amountCents / 10)),
      netAmountCents: args.amountCents,
      year: 2025,
      month: 6,
      day: 15,
      userId: args.userId,
      accountId: account.id,
      assetId: asset.id,
    },
  });
}

describe("annual tax support report", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("consolidates multiple currencies and propagates fiscal pendencies", async () => {
    const owner = await createUser("Annual Owner");
    await addIncome({
      userId: owner.id,
      symbol: "BRL11",
      currency: "BRL",
      amountCents: 10_000,
      type: "INCOME",
    });
    await addIncome({
      userId: owner.id,
      symbol: "USD11",
      currency: "USD",
      amountCents: 2_500,
      type: "DIVIDEND",
    });

    const report = await getAnnualTaxSupportReportForUser(owner.id, 2025);

    expect(report.officialReturn).toBe(false);
    expect(report.status).toBe("INCOMPLETE");
    expect(report.summary.incomeEventCount).toBe(2);
    expect(report.incomes.totalsByCurrency).toEqual({
      BRL: 10_000,
      USD: 2_500,
    });
    expect(report.pendencies.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "INCOME_CLASSIFICATION",
          status: "ACTIVE",
        }),
      ]),
    );
  });

  it("keeps another user's data out of the annual report", async () => {
    const [owner, other] = await Promise.all([
      createUser("Annual Owner"),
      createUser("Annual Other"),
    ]);
    await addIncome({
      userId: owner.id,
      symbol: "OWN11",
      currency: "BRL",
      amountCents: 100,
    });
    await addIncome({
      userId: other.id,
      symbol: "OTHER11",
      currency: "BRL",
      amountCents: 999_999,
    });

    const report = await getAnnualTaxSupportReportForUser(owner.id, 2025);

    expect(report.summary.incomeEventCount).toBe(1);
    expect(report.incomes.items).toHaveLength(1);
    expect(report.incomes.items[0]?.symbol).toBe("OWN11");
  });

  it("exports CSV and a valid basic PDF without hiding pending status", async () => {
    const owner = await createUser("Annual Export Owner");
    await addIncome({
      userId: owner.id,
      symbol: "PEND11",
      currency: "BRL",
      amountCents: 12_345,
      type: "INCOME",
    });
    const report = await getAnnualTaxSupportReportForUser(owner.id, 2025);

    const csv = annualTaxReportToCsv(report);
    expect(csv).toContain("Relatório anual de apoio ao IR");
    expect(csv).toContain("PENDÊNCIAS");
    expect(csv).toContain("INCOME_CLASSIFICATION");
    expect(csv).toContain("INCOMPLETE");

    const pdf = annualTaxReportToPdf(report);
    const pdfText = Buffer.from(pdf).toString("latin1");
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain("/Type /Catalog");
    expect(pdfText).toContain("Pendencias");
    expect(pdfText).toContain("INCOMPLETE");
    expect(pdfText.endsWith("%%EOF\n")).toBe(true);
  });
});
