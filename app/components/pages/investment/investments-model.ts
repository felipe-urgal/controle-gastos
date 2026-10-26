import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { InvestmentAssetType, InvestmentPortfolio, InvestmentPosition } from '@/app/types/investment';

/** Cotação cuja data de referência passou deste limite é tratada como antiga (o cache expira em minutos; isso é o que importa ao usuário). */
export const OLD_QUOTE_DAYS = 7;

export function isOldQuote(referenceAt: string, now: Date = new Date()) {
  return now.getTime() - new Date(referenceAt).getTime() > OLD_QUOTE_DAYS * 86_400_000;
}

const currencyOrder: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

export type RankedPosition = {
  position: InvestmentPosition;
  /** Valor usado para ordenar e pesar: mercado quando há cotação, custo caso contrário. */
  value: number;
  priced: boolean;
  /** Resultado não realizado; `null` sem cotação (desconhecido não vira zero). */
  gain: number | null;
  gainPercent: number | null;
  /** Largura relativa da barra de peso (0–100), em relação à maior posição. */
  weightPercent: number;
  /** Participação da posição no valor estimado da carteira (0–100). */
  sharePercent: number;
};

export type AllocationSlice = { type: InvestmentAssetType; value: number; share: number };

export type CurrencyPortfolioSummary = {
  currency: SupportedCurrency;
  /** Valor de mercado somente das posições com cotação. */
  marketValue: number;
  /** Custo somente das posições com cotação (base do resultado). */
  pricedCost: number;
  costBasis: number;
  /** Mercado nas posições com cotação mais custo nas sem cotação: o valor que a carteira "vale" hoje, sem zerar o que não tem preço. */
  estimatedValue: number;
  /** Parte do valor estimado que está a custo (posições sem cotação). */
  atCostValue: number;
  gain: number;
  gainPercent: number | null;
  positionCount: number;
  pricedCount: number;
  unpricedCount: number;
  staleCount: number;
  /** Posições cuja cotação tem data de referência com mais de `OLD_QUOTE_DAYS` dias. */
  oldQuoteCount: number;
  /** Referência da cotação mais recente entre as posições; `null` sem cotações. */
  latestQuoteAt: string | null;
  allocation: AllocationSlice[];
  ranked: RankedPosition[];
};

/** Moedas com posição ou custo, na ordem BRL, USD, EUR. */
export function portfolioCurrencies(portfolio: Pick<InvestmentPortfolio, 'positions' | 'totalsByCurrency'>): SupportedCurrency[] {
  const present = new Set<SupportedCurrency>([
    ...portfolio.positions.map((position) => position.currency),
    ...(Object.keys(portfolio.totalsByCurrency) as SupportedCurrency[]),
  ]);
  return currencyOrder.filter((currency) => present.has(currency));
}

export function summarizeCurrency(positions: InvestmentPosition[], currency: SupportedCurrency, now: Date = new Date()): CurrencyPortfolioSummary {
  const own = positions.filter((position) => position.currency === currency);
  const priced = own.filter((position) => position.marketValueCents !== null);

  const marketValue = priced.reduce((sum, position) => sum + (position.marketValueCents ?? 0), 0);
  const pricedCost = priced.reduce((sum, position) => sum + position.investedCents, 0);
  const costBasis = own.reduce((sum, position) => sum + position.investedCents, 0);
  const gain = marketValue - pricedCost;

  const valueOf = (position: InvestmentPosition) => position.marketValueCents ?? position.investedCents;
  const total = own.reduce((sum, position) => sum + valueOf(position), 0);
  const largest = Math.max(0, ...own.map(valueOf));

  const byType = new Map<InvestmentAssetType, number>();
  for (const position of own) {
    byType.set(position.assetType, (byType.get(position.assetType) ?? 0) + valueOf(position));
  }
  const allocation = [...byType.entries()]
    .map(([type, value]) => ({ type, value, share: total > 0 ? (value / total) * 100 : 0 }))
    .sort((left, right) => right.value - left.value);

  const ranked = [...own]
    .sort((left, right) => valueOf(right) - valueOf(left))
    .map((position): RankedPosition => {
      const hasQuote = position.marketValueCents !== null;
      const positionGain = hasQuote ? (position.marketValueCents ?? 0) - position.investedCents : null;
      return {
        position,
        value: valueOf(position),
        priced: hasQuote,
        gain: positionGain,
        gainPercent: positionGain !== null && position.investedCents > 0 ? (positionGain / position.investedCents) * 100 : null,
        weightPercent: largest > 0 ? (valueOf(position) / largest) * 100 : 0,
        sharePercent: total > 0 ? (valueOf(position) / total) * 100 : 0,
      };
    });

  return {
    currency,
    marketValue,
    pricedCost,
    costBasis,
    estimatedValue: total,
    atCostValue: own.filter((position) => position.marketValueCents === null).reduce((sum, position) => sum + position.investedCents, 0),
    gain,
    gainPercent: pricedCost > 0 ? (gain / pricedCost) * 100 : null,
    positionCount: own.length,
    pricedCount: priced.length,
    unpricedCount: own.length - priced.length,
    staleCount: own.filter((position) => position.quote?.isStale).length,
    oldQuoteCount: own.filter((position) => position.quote && isOldQuote(position.quote.referenceAt, now)).length,
    latestQuoteAt: own.reduce<string | null>((latest, position) => {
      const at = position.quote?.referenceAt ?? null;
      return at && (!latest || at > latest) ? at : latest;
    }, null),
    allocation,
    ranked,
  };
}
