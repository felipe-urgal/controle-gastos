import {
  deriveInvestmentPositions,
  type InvestmentOperationForPosition,
} from "@/app/lib/investments/investment-domain";
import {
  logicalDateFromUtcInstant,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { prisma } from "@/app/lib/prisma";

export type InvestmentAccountValueSource = "MARKET" | "COST" | "MIXED";

export const INVESTMENT_QUOTE_STALE_AFTER_DAYS = 7;

export type InvestmentAccountValue = {
  accountId: string;
  valueCents: number;
  source: InvestmentAccountValueSource;
  positionCount: number;
  marketPositionCount: number;
  costPositionCount: number;
  staleMarketPositionCount: number;
  quoteCoveragePercentage: number;
  oldestQuoteReferenceAt: string | null;
  latestQuoteReferenceAt: string | null;
  valuationAsOf: LogicalDate;
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

function onOrBeforeLogicalDate(date: LogicalDate) {
  return {
    OR: [
      { year: { lt: date.year } },
      {
        year: date.year,
        OR: [
          { month: { lt: date.month } },
          {
            month: date.month,
            day: { lte: date.day },
          },
        ],
      },
    ],
  };
}

function staleQuote(referenceAt: Date, now: Date, staleAfterDays: number) {
  const ageMs = now.getTime() - referenceAt.getTime();
  return ageMs > staleAfterDays * 24 * 60 * 60 * 1000;
}

export async function getInvestmentAccountValuesForUser(
  userId: string,
  accountIds?: string[],
  options: {
    asOf?: LogicalDate;
    now?: Date;
    staleAfterDays?: number;
  } = {},
) {
  if (accountIds && accountIds.length === 0) {
    return new Map<string, InvestmentAccountValue>();
  }

  const now = options.now ?? new Date();
  const asOf = options.asOf ?? logicalDateFromUtcInstant(now);
  const staleAfterDays =
    options.staleAfterDays ?? INVESTMENT_QUOTE_STALE_AFTER_DAYS;

  const operations = await prisma.investmentOperation.findMany({
    where: {
      userId,
      ...(accountIds ? { accountId: { in: accountIds } } : {}),
      ...onOrBeforeLogicalDate(asOf),
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
            select: {
              priceCents: true,
              currency: true,
              referenceAt: true,
              source: true,
            },
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
    operations.map((operation) => {
      const quote = operation.asset.quote;
      const usable =
        quote &&
        quote.currency === operation.asset.currency &&
        quote.referenceAt.getTime() <= now.getTime();

      return [
        operation.asset.id,
        usable
          ? {
              priceCents: quote.priceCents,
              referenceAt: quote.referenceAt,
              source: quote.source,
            }
          : null,
      ] as const;
    }),
  );

  const state = new Map<
    string,
    {
      valueCents: number;
      marketCount: number;
      costCount: number;
      staleMarketCount: number;
      positionCount: number;
      quoteDates: Date[];
    }
  >();

  for (const position of positions) {
    const current = state.get(position.accountId) ?? {
      valueCents: 0,
      marketCount: 0,
      costCount: 0,
      staleMarketCount: 0,
      positionCount: 0,
      quoteDates: [],
    };
    const quote = quoteByAsset.get(position.assetId) ?? null;

    current.valueCents +=
      quote === null
        ? position.investedCents
        : roundedPositionValue(position.quantity, quote.priceCents);
    current.positionCount += 1;

    if (quote === null) {
      current.costCount += 1;
    } else {
      current.marketCount += 1;
      current.quoteDates.push(quote.referenceAt);
      if (staleQuote(quote.referenceAt, now, staleAfterDays)) {
        current.staleMarketCount += 1;
      }
    }

    state.set(position.accountId, current);
  }

  return new Map(
    [...state.entries()].map(([accountId, value]) => {
      const sortedQuoteDates = [...value.quoteDates].sort(
        (left, right) => left.getTime() - right.getTime(),
      );

      return [
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
          marketPositionCount: value.marketCount,
          costPositionCount: value.costCount,
          staleMarketPositionCount: value.staleMarketCount,
          quoteCoveragePercentage:
            value.positionCount === 0
              ? 0
              : Math.round((value.marketCount / value.positionCount) * 10_000) /
                100,
          oldestQuoteReferenceAt:
            sortedQuoteDates[0]?.toISOString() ?? null,
          latestQuoteReferenceAt:
            sortedQuoteDates.at(-1)?.toISOString() ?? null,
          valuationAsOf: asOf,
        } satisfies InvestmentAccountValue,
      ];
    }),
  );
}
