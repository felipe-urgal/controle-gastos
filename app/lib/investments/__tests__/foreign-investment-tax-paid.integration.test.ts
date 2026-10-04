import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  createForeignInvestmentTaxPaid,
  removeForeignInvestmentTaxPaid,
} from "@/app/lib/investments/foreign-investment-tax-paid";
import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { removeInvestmentOperation } from "@/app/lib/investments/investments";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `foreign-credit-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createContext(userId: string, symbol: string) {
  const [account, asset] = await Promise.all([
    prisma.account.create({
      data: {
        name: "Foreign Credit " + symbol,
        type: "INVESTMENT",
        currency: "USD",
        userId,
      },
    }),
    prisma.investmentAsset.create({
      data: {
        symbol,
        type: "STOCK",
        currency: "USD",
        market: "NASDAQ",
        taxLocation: "ABROAD",
        userId,
      },
    }),
  ]);
  return { account, asset };
}

async function createIncome(args: {
  userId: string;
  accountId: string;
  assetId: string;
  type?: "DIVIDEND" | "INTEREST" | "INCOME";
  year?: number;
}) {
  return prisma.investmentIncome.create({
    data: {
      type: args.type ?? "DIVIDEND",
      quantityUnits: parseInvestmentQuantity("1")!,
      unitValueCents: 10_000,
      netAmountCents: 10_000,
      year: args.year ?? 2025,
      month: 4,
      day: 10,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
    },
  });
}

async function createSale(args: {
  userId: string;
  accountId: string;
  assetId: string;
}) {
  const quantityUnits = parseInvestmentQuantity("1")!;
  const operation = await prisma.investmentOperation.create({
    data: {
      type: "SELL",
      quantityUnits,
      unitPriceCents: 12_000,
      feesCents: 0,
      year: 2025,
      month: 6,
      day: 10,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
    },
  });
  await prisma.investmentFiscalEvent.create({
    data: {
      id: operation.id,
      type: "SELL",
      originalType: "SELL",
      classificationSource: "SYSTEM",
      quantityUnits,
      year: 2025,
      month: 6,
      day: 10,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
      operationId: operation.id,
    },
  });
  return operation;
}

function request(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/investments/taxes/foreign/credits",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function validBody(eventType: "INCOME" | "SALE", eventId: string) {
  return {
    eventType,
    eventId,
    countryCode: "us",
    currency: "USD",
    amountCents: 1_000,
    paidYear: 2025,
    paidMonth: 4,
    paidDay: 10,
    eligibilityBasis: "RECIPROCITY",
    nonRefundableConfirmed: true,
    note: "Federal withholding",
  };
}

describe("foreign investment tax paid", () => {
  afterEach(async () => {
    authMocks.getAuthenticatedUserId.mockReset();
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("registers foreign tax against a classified income", async () => {
    const owner = await createUser("Foreign Credit Owner");
    const { account, asset } = await createContext(owner.id, "CREDITDIV");
    const income = await createIncome({
      userId: owner.id,
      accountId: account.id,
      assetId: asset.id,
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await createForeignInvestmentTaxPaid(
      request(validBody("INCOME", income.id)),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      countryCode: "US",
      eventType: "INCOME",
      eventId: income.id,
      eligibilityBasis: "RECIPROCITY",
      nonRefundableConfirmed: true,
    });
    expect(
      await prisma.investmentForeignTaxPaid.count({
        where: { userId: owner.id, incomeId: income.id },
      }),
    ).toBe(1);
  });

  it("requires explicit non-refundable confirmation", async () => {
    const owner = await createUser("Foreign Refund Owner");
    const { account, asset } = await createContext(owner.id, "REFUND");
    const income = await createIncome({
      userId: owner.id,
      accountId: account.id,
      assetId: asset.id,
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await createForeignInvestmentTaxPaid(
      request({
        ...validBody("INCOME", income.id),
        nonRefundableConfirmed: false,
      }),
    );

    expect(response.status).toBe(400);
    expect(
      await prisma.investmentForeignTaxPaid.count({
        where: { userId: owner.id },
      }),
    ).toBe(0);
  });

  it("rejects unclassified income and a payment from another calendar year", async () => {
    const owner = await createUser("Foreign Validation Owner");
    const { account, asset } = await createContext(owner.id, "VALIDATE");
    const unclassified = await createIncome({
      userId: owner.id,
      accountId: account.id,
      assetId: asset.id,
      type: "INCOME",
    });
    const dividend = await createIncome({
      userId: owner.id,
      accountId: account.id,
      assetId: asset.id,
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    expect(
      (
        await createForeignInvestmentTaxPaid(
          request(validBody("INCOME", unclassified.id)),
        )
      ).status,
    ).toBe(409);

    expect(
      (
        await createForeignInvestmentTaxPaid(
          request({
            ...validBody("INCOME", dividend.id),
            paidYear: 2026,
          }),
        )
      ).status,
    ).toBe(409);
  });

  it("does not allow linking another user's event", async () => {
    const [owner, other] = await Promise.all([
      createUser("Foreign Owner"),
      createUser("Foreign Other"),
    ]);
    const context = await createContext(other.id, "FOREIGNOTHER");
    const income = await createIncome({
      userId: other.id,
      accountId: context.account.id,
      assetId: context.asset.id,
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await createForeignInvestmentTaxPaid(
      request(validBody("INCOME", income.id)),
    );

    expect(response.status).toBe(404);
  });

  it("blocks deleting a sale while foreign tax remains linked", async () => {
    const owner = await createUser("Foreign Protected Sale Owner");
    const { account, asset } = await createContext(owner.id, "PROTECTEDSALE");
    const sale = await createSale({
      userId: owner.id,
      accountId: account.id,
      assetId: asset.id,
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const createdResponse = await createForeignInvestmentTaxPaid(
      request({
        ...validBody("SALE", sale.id),
        paidMonth: 6,
      }),
    );
    expect(createdResponse.status).toBe(201);

    const deleteResponse = await removeInvestmentOperation(
      new Request(
        `http://localhost/api/investments/operations/${sale.id}`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: sale.id }) },
    );

    expect(deleteResponse.status).toBe(409);
    expect(await deleteResponse.json()).toMatchObject({
      success: false,
      error: {
        code: "INVESTMENT_DELETE_HAS_FOREIGN_TAX_CREDIT",
      },
    });
    expect(
      await prisma.investmentOperation.count({ where: { id: sale.id } }),
    ).toBe(1);
  });

  it("links a sale and allows only its owner to delete the tax record", async () => {
    const [owner, other] = await Promise.all([
      createUser("Foreign Sale Owner"),
      createUser("Foreign Delete Other"),
    ]);
    const { account, asset } = await createContext(owner.id, "CREDITSALE");
    const sale = await createSale({
      userId: owner.id,
      accountId: account.id,
      assetId: asset.id,
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const createdResponse = await createForeignInvestmentTaxPaid(
      request({
        ...validBody("SALE", sale.id),
        paidMonth: 6,
      }),
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()).data;

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const foreignDelete = await removeForeignInvestmentTaxPaid(
      new Request(
        `http://localhost/api/investments/taxes/foreign/credits/${created.id}`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(foreignDelete.status).toBe(404);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const ownerDelete = await removeForeignInvestmentTaxPaid(
      new Request(
        `http://localhost/api/investments/taxes/foreign/credits/${created.id}`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(ownerDelete.status).toBe(200);
    expect(
      await prisma.investmentForeignTaxPaid.count({
        where: { id: created.id },
      }),
    ).toBe(0);
  });
});
