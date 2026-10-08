import {
  exchangeRateProvenance,
} from '@/app/lib/currency/exchange-rate-domain';
import {
  compareLogicalDates,
  daysBetweenLogicalDates,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import type {
  ExchangeRate,
  ExchangeRateModel,
  ExchangeRateResolution,
} from '@/app/types/exchange-rate';
import type { SupportedCurrency } from '@/app/types/financial-summary';

/**
 * Taxa de até 7 dias corridos cobre fins de semana e feriados prolongados.
 * Acima disso a consolidação continua possível, mas é marcada como defasada.
 */
export const PATRIMONY_RATE_FRESH_DAYS = 7;

export type PatrimonyRateQuoteSide = 'BUY' | 'SELL';

export type PatrimonyRateResolution = {
  /** Taxa orientada `from → to` (invertida quando derivada). */
  rate: ExchangeRate;
  resolution: ExchangeRateResolution;
};

type Candidate = {
  model: ExchangeRateModel;
  inverse: boolean;
};

function invert(rate: ExchangeRateModel): ExchangeRate {
  return {
    from: rate.to,
    to: rate.from,
    numerator: rate.denominator,
    denominator: rate.numerator,
    source: rate.source,
    quoteSide: rate.quoteSide,
    referenceDate: rate.referenceDate,
  };
}

function strip(rate: ExchangeRateModel): ExchangeRate {
  return {
    from: rate.from,
    to: rate.to,
    numerator: rate.numerator,
    denominator: rate.denominator,
    source: rate.source,
    quoteSide: rate.quoteSide,
    referenceDate: rate.referenceDate,
  };
}

/**
 * Resolver do Patrimônio (consolidação indicativa e opcional).
 *
 * - Nunca usa taxa posterior a `asOf`.
 * - Aceita MANUAL (GENERIC) e BCB_PTAX do lado pedido (SELL por padrão).
 * - Deriva a inversa (B→A = d/n) sem persistir segunda linha.
 * - Na mesma data prefere direta sobre inversa e MANUAL sobre PTAX; quando
 *   MANUAL vence existindo PTAX na data, `overridesPtax` torna isso explícito.
 * - Informa idade e frescor; nunca substitui taxa ausente por zero.
 * - Não faz triangulação além do par (ou da inversa).
 */
export function resolvePatrimonyRate(args: {
  rates: readonly ExchangeRateModel[];
  from: SupportedCurrency;
  to: SupportedCurrency;
  asOf: LogicalDate;
  quoteSide?: PatrimonyRateQuoteSide;
}): PatrimonyRateResolution | null {
  const quoteSide = args.quoteSide ?? 'SELL';
  const candidates: Candidate[] = [];

  for (const model of args.rates) {
    if (model.quoteSide !== 'GENERIC' && model.quoteSide !== quoteSide) continue;
    if (compareLogicalDates(model.referenceDate, args.asOf) > 0) continue;
    if (model.from === args.from && model.to === args.to) {
      candidates.push({ model, inverse: false });
    } else if (model.from === args.to && model.to === args.from) {
      candidates.push({ model, inverse: true });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((left, right) => {
    const dateDifference = compareLogicalDates(
      right.model.referenceDate,
      left.model.referenceDate,
    );
    if (dateDifference !== 0) return dateDifference;
    if (left.inverse !== right.inverse) return left.inverse ? 1 : -1;
    if (left.model.source !== right.model.source) {
      return left.model.source === 'MANUAL' ? -1 : 1;
    }
    return left.model.id.localeCompare(right.model.id);
  });

  const chosen = candidates[0]!;
  const ageDays = daysBetweenLogicalDates(
    chosen.model.referenceDate,
    args.asOf,
  );
  const overridesPtax =
    chosen.model.source === 'MANUAL' &&
    candidates.some(
      (candidate) =>
        candidate.model.source === 'BCB_PTAX' &&
        compareLogicalDates(
          candidate.model.referenceDate,
          chosen.model.referenceDate,
        ) === 0,
    );

  return {
    rate: chosen.inverse ? invert(chosen.model) : strip(chosen.model),
    resolution: {
      rateId: chosen.model.id,
      provenance: exchangeRateProvenance(chosen.model),
      ageDays,
      freshness: ageDays <= PATRIMONY_RATE_FRESH_DAYS ? 'CURRENT' : 'STALE',
      derivedFromInverse: chosen.inverse,
      overridesPtax,
    },
  };
}
