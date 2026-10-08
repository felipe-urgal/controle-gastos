import {
  addDaysToLogicalDate,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import type { ExchangeRateModel } from '@/app/types/exchange-rate';
import type { SupportedCurrency } from '@/app/types/financial-summary';

/** Janela máxima (dias corridos) para recuar até a última PTAX publicada. */
export const FISCAL_PTAX_LOOKBACK_DAYS = 10;

export type FiscalPtaxQuoteSide = 'BUY' | 'SELL';

export type FiscalPtaxIndex = Map<string, ExchangeRateModel>;

export type FiscalPtaxResolution = {
  rate: ExchangeRateModel;
  source: 'BCB_PTAX';
  quoteSide: FiscalPtaxQuoteSide;
  effectiveDate: LogicalDate;
  requestedDate: LogicalDate;
  ageDays: number;
};

function dateKey(date: LogicalDate) {
  return date.year * 10_000 + date.month * 100 + date.day;
}

function indexKey(
  currency: SupportedCurrency,
  quoteSide: FiscalPtaxQuoteSide,
  date: LogicalDate,
) {
  return `${currency}|${quoteSide}|${dateKey(date)}`;
}

/**
 * Indexa somente PTAX direta `moeda → BRL` (BUY/SELL). MANUAL, cross rates e
 * qualquer outro par são descartados e nunca satisfazem requisito fiscal.
 */
export function addToFiscalPtaxIndex(
  index: FiscalPtaxIndex,
  rate: ExchangeRateModel,
) {
  if (
    rate.source !== 'BCB_PTAX' ||
    rate.to !== 'BRL' ||
    rate.from === 'BRL' ||
    (rate.quoteSide !== 'BUY' && rate.quoteSide !== 'SELL')
  ) {
    return;
  }
  index.set(indexKey(rate.from, rate.quoteSide, rate.referenceDate), rate);
}

export function buildFiscalPtaxIndex(rates: readonly ExchangeRateModel[]) {
  const index: FiscalPtaxIndex = new Map();
  for (const rate of rates) addToFiscalPtaxIndex(index, rate);
  return index;
}

/**
 * Resolver fiscal estrito: BCB_PTAX, `moeda → BRL`, lado exato e lookback
 * máximo explícito. Ausência retorna `null` (apuração permanece pendente).
 */
export function findPtaxOnOrBefore(args: {
  index: FiscalPtaxIndex;
  currency: SupportedCurrency;
  date: LogicalDate;
  quoteSide: FiscalPtaxQuoteSide;
  maxLookbackDays?: number;
}): FiscalPtaxResolution | null {
  if (args.currency === 'BRL') return null;
  const maxLookback = args.maxLookbackDays ?? FISCAL_PTAX_LOOKBACK_DAYS;

  for (let offset = 0; offset <= maxLookback; offset += 1) {
    const candidate = addDaysToLogicalDate(args.date, -offset);
    const rate = args.index.get(
      indexKey(args.currency, args.quoteSide, candidate),
    );
    if (rate) {
      return {
        rate,
        source: 'BCB_PTAX',
        quoteSide: args.quoteSide,
        effectiveDate: candidate,
        requestedDate: args.date,
        ageDays: offset,
      };
    }
  }

  return null;
}
