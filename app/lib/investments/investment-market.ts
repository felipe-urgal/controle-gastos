import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  fetchBrapiQuote,
  type BrapiQuote,
} from "@/app/lib/investments/brapi-client";
import {
  calculateInvestmentGrossCents,
  parseInvestmentQuantity,
} from "@/app/lib/investments/investment-domain";
import { listInvestmentPortfolioForUser } from "@/app/lib/investments/investments";
import { prisma } from "@/app/lib/prisma";

export const INVESTMENT_QUOTE_TTL_MS = 30 * 60 * 1_000;

type FetchQuote = (symbol: string) => Promise<BrapiQuote>;

type StoredQuote = {
  assetId: string;
  priceCents: number;
  currency: string;
  referenceAt: Date;
  source: string;
  fetchedAt: Date;
};

function isFresh(quote: StoredQuote, now: Date) {
  return now.getTime() - quote.fetchedAt.getTime() < INVESTMENT_QUOTE_TTL_MS;
}

async function quoteForAsset(
  asset: { id: string; symbol: string; currency: string },
  cached: StoredQuote | undefined,
  now: Date,
  fetchQuote: FetchQuote,
) {
  if (cached && isFresh(cached, now)) return { quote: cached, stale: false };

  let remote: BrapiQuote;
  try {
    remote = await fetchQuote(asset.symbol);
    if (remote.currency !== asset.currency) {
      throw new Error("Moeda da cotação não corresponde ao ativo");
    }
  } catch {
    return cached ? { quote: cached, stale: true } : null;
  }

  const stored = await prisma.assetQuote.upsert({
    where: { assetId: asset.id },
    create: {
      assetId: asset.id,
      priceCents: remote.priceCents,
      currency: remote.currency,
      referenceAt: remote.referenceAt,
      source: remote.source,
      fetchedAt: now,
    },
    update: {
      priceCents: remote.priceCents,
      currency: remote.currency,
      referenceAt: remote.referenceAt,
      source: remote.source,
      fetchedAt: now,
    },
  });

  return { quote: stored, stale: false };
}

export async function listInvestmentMarketDataForUser(
  userId: string,
  options: { now?: Date; fetchQuote?: FetchQuote } = {},
) {
  const now = options.now ?? new Date();
  const fetchQuote = options.fetchQuote ?? fetchBrapiQuote;
  const portfolio = await listInvestmentPortfolioForUser(userId);
  const positionAssetIds = new Set(portfolio.positions.map((position) => position.assetId));
  const eligibleAssets = portfolio.assets.filter(
    (asset) =>
      positionAssetIds.has(asset.id) &&
      asset.currency === "BRL" &&
      (asset.type === "STOCK" || asset.type === "FII" || asset.type === "ETF"),
  );

  if (eligibleAssets.length === 0) return { positions: [] };

  const cachedRows = await prisma.assetQuote.findMany({
    where: { assetId: { in: eligibleAssets.map((asset) => asset.id) } },
  });
  const cachedByAsset = new Map(cachedRows.map((quote) => [quote.assetId, quote]));
  const marketByAsset = new Map<string, { quote: StoredQuote; stale: boolean }>();

  for (const asset of eligibleAssets) {
    const resolved = await quoteForAsset(
      asset,
      cachedByAsset.get(asset.id),
      now,
      fetchQuote,
    );
    if (resolved) marketByAsset.set(asset.id, resolved);
  }

  const positions = portfolio.positions.flatMap((position) => {
    const market = marketByAsset.get(position.assetId);
    if (!market) return [];
    const quantityUnits = parseInvestmentQuantity(position.quantity);
    if (!quantityUnits) return [];

    return [{
      accountId: position.accountId,
      assetId: position.assetId,
      symbol: position.symbol,
      currency: position.currency,
      priceCents: market.quote.priceCents,
      marketValueCents: calculateInvestmentGrossCents(
        quantityUnits,
        market.quote.priceCents,
      ),
      referenceAt: market.quote.referenceAt,
      fetchedAt: market.quote.fetchedAt,
      source: "BRAPI" as const,
      stale: market.stale,
    }];
  });

  return { positions };
}

export async function getInvestmentMarketData() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await listInvestmentMarketDataForUser(userId));
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Erro ao carregar cotações de investimentos", 500);
  }
}
