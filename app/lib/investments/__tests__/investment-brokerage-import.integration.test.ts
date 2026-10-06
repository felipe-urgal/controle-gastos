import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { getInvestmentTaxControlReportForUser } from "@/app/lib/investments/investment-tax-control";
import { confirmInvestmentImport } from "@/app/lib/investments/import/investment-import";
import {
  withInvestmentImportFingerprints,
  type ParsedInvestmentOperationItem,
} from "@/app/lib/investments/import/investment-import-parser";
import { signInvestmentImportPreview } from "@/app/lib/investments/import/preview-token";
import { prisma } from "@/app/lib/prisma";

process.env.JWT_SECRET ||= "investment-import-test-secret";

const userIds: string[] = [];

async function fixture() {
  const user = await prisma.user.create({
    data: {
      name: "Investment Import",
      email: `investment-import-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Corretora",
      type: "INVESTMENT",
      currency: "BRL",
      isActive: true,
    },
  });
  return { user, account };
}

function operation(args: {
  index: number;
  symbol: string;
  assetType: "STOCK" | "FII";
  noteNumber?: string;
  irrfCents?: number;
}): ParsedInvestmentOperationItem {
  return {
    index: args.index,
    source: "PDF",
    kind: "OPERATIONS",
    date: "2026-05-10",
    symbol: args.symbol,
    assetName: null,
    assetType: args.assetType,
    institution: "Nu Investimentos",
    quantity: "10",
    errors: [],
    operationType: "BUY",
    movement: `NUBANK_BROKERAGE_NOTE · Nota ${args.noteNumber ?? "42"} · negócio ${args.index + 1}`,
    unitPriceCents: 1_000 + args.index,
    feesCents: 10,
    amountCents: 10_000 + args.index * 10,
    rawUnitPrice: "10.00",
    brokerageNote: {
      broker: "Nu Investimentos",
      brokerCnpj: "62.169.875/0001-79",
      noteNumber: args.noteNumber ?? "42",
      tradeDate: "2026-05-10",
      businessIndex: args.index,
      market: "B3",
      grossAmountCents: 10_000 + args.index * 10,
      allocatedFeesCents: 10,
      irrfCents: args.irrfCents ?? 123,
    },
  };
}

async function confirm(args: {
  userId: string;
  accountId: string;
  rows: ParsedInvestmentOperationItem[];
}) {
  const previewItems = withInvestmentImportFingerprints({
    userId: args.userId,
    accountId: args.accountId,
    items: args.rows,
  });
  const token = signInvestmentImportPreview({
    userId: args.userId,
    accountId: args.accountId,
    items: previewItems,
  });
  return confirmInvestmentImport(
    new Request("http://localhost/api/investments/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId: args.accountId,
        previewToken: token,
        items: previewItems.map((item) => ({ ...item, selected: true })),
      }),
    }),
  );
}

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("investment brokerage import fiscal integration", () => {
  it("persists one imported IRRF for a deterministic brokerage note and replays safely", async () => {
    const { user, account } = await fixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
    const rows = [
      operation({ index: 0, symbol: "MXRF11", assetType: "FII" }),
      operation({ index: 1, symbol: "HGLG11", assetType: "FII" }),
    ];

    const first = await confirm({
      userId: user.id,
      accountId: account.id,
      rows,
    });
    expect(first.status).toBe(201);

    const second = await confirm({
      userId: user.id,
      accountId: account.id,
      rows,
    });
    expect(second.status).toBe(201);

    const withholdings = await prisma.investmentTaxWithholding.findMany({
      where: { userId: user.id },
    });
    expect(withholdings).toHaveLength(1);
    expect(withholdings[0]).toMatchObject({
      source: "IMPORT",
      assetType: "FII",
      currency: "BRL",
      amountCents: 123,
      year: 2026,
      month: 5,
      day: 10,
    });
    expect(withholdings[0]?.importFingerprint).toMatch(/^[a-f0-9]{64}$/);

    const operations = await prisma.investmentOperation.findMany({
      where: { userId: user.id },
      orderBy: { sequence: "asc" },
    });
    expect(operations).toHaveLength(2);
    expect(operations.map((item) => item.sequence)).toEqual([0, 0]);

    const report = await getInvestmentTaxControlReportForUser(user.id, 2026);
    expect(
      report.rows.reduce((sum, row) => sum + row.withholdingCents, 0),
    ).toBe(123);
  });

  it("creates a review instead of allocating IRRF when a note mixes tax classes", async () => {
    const { user, account } = await fixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const response = await confirm({
      userId: user.id,
      accountId: account.id,
      rows: [
        operation({ index: 0, symbol: "MXRF11", assetType: "FII", noteNumber: "99" }),
        operation({ index: 1, symbol: "PETR4", assetType: "STOCK", noteNumber: "99" }),
      ],
    });
    expect(response.status).toBe(201);

    expect(
      await prisma.investmentTaxWithholding.count({ where: { userId: user.id } }),
    ).toBe(0);
    const review = await prisma.investmentBrokerageTaxReview.findFirst({
      where: { userId: user.id },
    });
    expect(review).toMatchObject({
      status: "PENDING",
      amountCents: 123,
      noteNumber: "99",
    });
  });
});
