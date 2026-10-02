import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { getInvestmentFiscalYearEndSnapshotForUser } from "@/app/lib/investments/investment-fiscal-snapshot";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `snapshot-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createContext(userId: string, symbol = "TEST11") {
  const [account, secondAccount, asset] = await Promise.all([
    prisma.account.create({
      data: {
        name: "Corretora A",
        type: "INVESTMENT",
        currency: "BRL",
        userId,
      },
    }),
    prisma.account.create({
      data: {
        name: "Corretora B",
        type: "INVESTMENT",
        currency: "BRL",
        userId,
      },
    }),
    prisma.investmentAsset.create({
      data: {
        symbol,
        type: "FII",
        currency: "BRL",
        market: "B3",
        userId,
      },
    }),
  ]);
  return { account, secondAccount, asset };
}

async function createOperationWithFiscalEvent(args: {
  userId: string;
  accountId: string;
  assetId: string;
  type: "BUY" | "SELL";
  fiscalType?:
    | "BUY"
    | "SELL"
    | "CUSTODY_TRANSFER_IN"
    | "CUSTODY_TRANSFER_OUT";
  quantity: string;
  unitPriceCents: number;
  year: number;
  month?: number;
  day?: number;
  sourceInstitution?: string;
  destinationInstitution?: string;
}) {
  const quantityUnits = parseInvestmentQuantity(args.quantity)!;
  const operation = await prisma.investmentOperation.create({
    data: {
      type: args.type,
      quantityUnits,
      unitPriceCents: args.unitPriceCents,
      feesCents: 0,
      year: args.year,
      month: args.month ?? 1,
      day: args.day ?? 1,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
    },
  });

  await prisma.investmentFiscalEvent.create({
    data: {
      id: operation.id,
      type: args.fiscalType ?? args.type,
      originalType: args.type,
      classificationSource:
        args.fiscalType && args.fiscalType !== args.type ? "USER" : "SYSTEM",
      quantityUnits,
      year: args.year,
      month: args.month ?? 1,
      day: args.day ?? 1,
      sourceInstitution: args.sourceInstitution,
      destinationInstitution: args.destinationInstitution,
      userId: args.userId,
      accountId: args.accountId,
      assetId: args.assetId,
      operationId: operation.id,
    },
  });

  return operation;
}

describe("investment fiscal year-end snapshot", () => {
  afterEach(async () => {
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("compares 31/12 with the previous year using fiscal cost, not market value", async () => {
    const user = await createUser("Snapshot Owner");
    const { account, asset } = await createContext(user.id);

    await createOperationWithFiscalEvent({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "10",
      unitPriceCents: 1_000,
      year: 2025,
    });
    await createOperationWithFiscalEvent({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "4",
      unitPriceCents: 9_999,
      year: 2026,
    });
    await prisma.assetQuote.create({
      data: {
        assetId: asset.id,
        priceCents: 50_000,
        currency: "BRL",
        referenceAt: new Date("2026-12-31T12:00:00Z"),
        fetchedAt: new Date("2026-12-31T12:00:00Z"),
        source: "BRAPI",
      },
    });

    const snapshot = await getInvestmentFiscalYearEndSnapshotForUser(
      user.id,
      2026,
    );

    expect(snapshot.previous.items[0]).toMatchObject({
      quantity: "10",
      costBasisCents: 10_000,
      status: "OK",
    });
    expect(snapshot.current.items[0]).toMatchObject({
      quantity: "6",
      costBasisCents: 6_000,
      status: "OK",
    });
    expect(snapshot.comparison[0]).toMatchObject({
      previousQuantity: "10",
      currentQuantity: "6",
      previousCostBasisCents: 10_000,
      currentCostBasisCents: 6_000,
    });
  });

  it("keeps a fully sold asset in the comparison with zero year-end position", async () => {
    const user = await createUser("Full Sell Owner");
    const { account, asset } = await createContext(user.id, "ZERO11");

    await createOperationWithFiscalEvent({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "3",
      unitPriceCents: 1_000,
      year: 2025,
    });
    await createOperationWithFiscalEvent({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "SELL",
      quantity: "3",
      unitPriceCents: 1_500,
      year: 2026,
    });

    const snapshot = await getInvestmentFiscalYearEndSnapshotForUser(
      user.id,
      2026,
    );

    expect(snapshot.current.items[0]).toMatchObject({
      quantity: "0",
      costBasisCents: 0,
      status: "OK",
    });
    expect(snapshot.comparison[0]).toMatchObject({
      previousQuantity: "3",
      currentQuantity: "0",
    });
  });

  it("preserves fiscal cost across custody transfer and aggregates multiple accounts", async () => {
    const user = await createUser("Custody Owner");
    const { account, secondAccount, asset } = await createContext(
      user.id,
      "MXRF11",
    );

    await createOperationWithFiscalEvent({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      fiscalType: "CUSTODY_TRANSFER_IN",
      quantity: "2100",
      unitPriceCents: 965,
      year: 2025,
      sourceInstitution: "Rico",
      destinationInstitution: "Nubank",
    });
    await prisma.investmentFiscalCostAdjustment.create({
      data: {
        quantityUnits: parseInvestmentQuantity("2100")!,
        costBasisCents: 2_000_000,
        year: 2025,
        month: 1,
        day: 1,
        reason: "Custo herdado da Rico",
        sourceInstitution: "Rico",
        userId: user.id,
        assetId: asset.id,
      },
    });
    await createOperationWithFiscalEvent({
      userId: user.id,
      accountId: secondAccount.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "33",
      unitPriceCents: 910,
      year: 2026,
    });

    const snapshot = await getInvestmentFiscalYearEndSnapshotForUser(
      user.id,
      2026,
    );

    expect(snapshot.previous.items[0]).toMatchObject({
      quantity: "2100",
      costBasisCents: 2_000_000,
    });
    expect(snapshot.current.items[0]).toMatchObject({
      quantity: "2133",
      costBasisCents: 2_030_030,
      status: "OK",
    });
    expect(snapshot.current.items[0]?.institutions).toEqual(
      expect.arrayContaining(["Corretora A", "Corretora B", "Rico", "Nubank"]),
    );
  });

  it("reproduces the same snapshot in a year without operations", async () => {
    const user = await createUser("No Activity Owner");
    const { account, asset } = await createContext(user.id, "HOLD11");

    await createOperationWithFiscalEvent({
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: "BUY",
      quantity: "5",
      unitPriceCents: 2_000,
      year: 2025,
    });

    const snapshot = await getInvestmentFiscalYearEndSnapshotForUser(
      user.id,
      2026,
    );

    expect(snapshot.current.items[0]).toMatchObject({
      quantity: "5",
      costBasisCents: 10_000,
    });
    expect(snapshot.previous.items[0]).toMatchObject({
      quantity: "5",
      costBasisCents: 10_000,
    });
  });

  it("does not leak another user's fiscal positions", async () => {
    const [owner, other] = await Promise.all([
      createUser("Snapshot Owner"),
      createUser("Snapshot Other"),
    ]);
    const ownerContext = await createContext(owner.id, "OWN11");
    const otherContext = await createContext(other.id, "OTHER11");

    await createOperationWithFiscalEvent({
      userId: owner.id,
      accountId: ownerContext.account.id,
      assetId: ownerContext.asset.id,
      type: "BUY",
      quantity: "1",
      unitPriceCents: 1_000,
      year: 2026,
    });
    await createOperationWithFiscalEvent({
      userId: other.id,
      accountId: otherContext.account.id,
      assetId: otherContext.asset.id,
      type: "BUY",
      quantity: "999",
      unitPriceCents: 9_999,
      year: 2026,
    });

    const snapshot = await getInvestmentFiscalYearEndSnapshotForUser(
      owner.id,
      2026,
    );

    expect(snapshot.current.items).toHaveLength(1);
    expect(snapshot.current.items[0]?.symbol).toBe("OWN11");
  });
});
