import { deriveInvestmentPositions, type InvestmentOperationForPosition } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

export type InvestmentAccountValueSource = "MARKET" | "COST" | "MIXED";

export type InvestmentAccountValue = {
  accountId: string;
  valueCents: number;
  source: InvestmentAccountValueSource;
  positionCount: number;
};

function roundedPositionValue(quantity: string, priceCents: number) {
  const [wholeRaw, fractionRaw = ""] = quantity.split(".");
  const scale = BigInt(100_000_000);
  const units =
    BigInt(wholeRaw) * scale +
    BigInt(fractionRaw.padEnd(8, "0").slice(0, 8) || "0");
  const rounded = (units * BigInt(priceCents) + scale / BigInt(2)) / scale;
  return Number(rounded);
}

export async function getInvestmentAccountValuesForUser(
  userId: string,
  accountIds?: string[],
) {
  if (accountIds && accountIds.length === 0) {
    return new Map<string, InvestmentAccountValue>();
  }

  const operations = await prisma.investmentOperation.findMany({
    where: {
      userId,
      ...(accountIds ? { accountId: { in: accountIds } } : {}),
    },
    include: {
      account: {
        select: { id: true, name: true, currency: true },
      },
      asset: {
        select: {
          id: true,
          symbol: true,
          name: true,
          type: true,
          currency: true,
          quote: {
            select: { priceCents: true, currency: true },
          },
        },
      },
    },
    orderBy: [
      { year: "asc" },
      { month: "asc" },
      { day: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  if (operations.length === 0) return new Map<string, InvestmentAccountValue>();

  const positionOperations: InvestmentOperationForPosition[] = operations.map(
    (operation) => ({
      id: operation.id,
      type: operation.type,
      quantityUnits: operation.quantityUnits,
      unitPriceCents: operation.unitPriceCents,
      feesCents: operation.feesCents,
      year: operation.year,
      month: operation.month,
      day: operation.day,
      createdAt: operation.createdAt,
      accountId: operation.account.id,
      accountName: operation.account.name,
      assetId: operation.asset.id,
      assetSymbol: operation.asset.symbol,
      assetName: operation.asset.name,
      assetType: operation.asset.type,
      currency: operation.asset.currency,
    }),
  );
  const positions = deriveInvestmentPositions(positionOperations);
  const quoteByAsset = new Map(
    operations.map((operation) => [
      operation.asset.id,
      operation.asset.quote?.currency === operation.asset.currency
        ? operation.asset.quote.priceCents
        : null,
    ]),
  );

  const state = new Map<
    string,
    {
      valueCents: number;
      marketCount: number;
      costCount: number;
      positionCount: number;
    }
  >();

  for (const position of positions) {
    const current = state.get(position.accountId) ?? {
      valueCents: 0,
      marketCount: 0,
      costCount: 0,
      positionCount: 0,
    };
    const quote = quoteByAsset.get(position.assetId) ?? null;
    current.valueCents +=
      quote === null
        ? position.investedCents
        : roundedPositionValue(position.quantity, quote);
    current.positionCount += 1;
    if (quote === null) current.costCount += 1;
    else current.marketCount += 1;
    state.set(position.accountId, current);
  }

  return new Map(
    [...state.entries()].map(([accountId, value]) => [
      accountId,
      {
        accountId,
        valueCents: value.valueCents,
        source:
          value.marketCount > 0 && value.costCount > 0
            ? "MIXED"
            : value.marketCount > 0
              ? "MARKET"
              : "COST",
        positionCount: value.positionCount,
      } satisfies InvestmentAccountValue,
    ]),
  );
}
