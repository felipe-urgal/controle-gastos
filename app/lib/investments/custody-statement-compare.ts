import { formatInvestmentQuantity, parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import type { CustodyEquityRow } from "@/app/lib/investments/custody-statement-parser";

export type CustodyPortfolioPosition = {
  symbol: string;
  currency: string;
  quantity: string;
  investedCents: number;
  marketValueCents: number | null;
};

export type CustodyComparisonStatus = "MATCH" | "QUANTITY_DIFFERENT" | "ONLY_IN_STATEMENT" | "ONLY_IN_APP";

export type CustodyComparisonRow = {
  symbol: string;
  name: string | null;
  status: CustodyComparisonStatus;
  statementQuantity: string | null;
  appQuantity: string | null;
  /** Diferença app − extrato; `null` quando um dos lados não tem a posição. */
  quantityDifference: string | null;
  statementValueCents: number | null;
  appMarketValueCents: number | null;
  appInvestedCents: number | null;
};

const ZERO = BigInt(0);

/**
 * Compara as posições da Bolsa de Valores do extrato com a carteira do app, por ticker (BRL, somando contas).
 * A comparação é por quantidade, que é exata; valores são mostrados só como referência, pois dependem da cotação do dia.
 */
export function compareCustodyWithPortfolio(
  equities: readonly CustodyEquityRow[],
  positions: readonly CustodyPortfolioPosition[],
): CustodyComparisonRow[] {
  const app = new Map<string, { units: bigint; invested: number; market: number | null }>();
  for (const position of positions) {
    if (position.currency !== "BRL") continue;
    const units = parseInvestmentQuantity(position.quantity);
    if (units === null) continue;
    const current = app.get(position.symbol) ?? { units: ZERO, invested: 0, market: 0 as number | null };
    app.set(position.symbol, {
      units: current.units + units,
      invested: current.invested + position.investedCents,
      // Valor de mercado desconhecido em qualquer conta torna o total desconhecido (nunca vira zero).
      market: current.market === null || position.marketValueCents === null ? null : current.market + position.marketValueCents,
    });
  }

  const rows: CustodyComparisonRow[] = [];
  const seen = new Set<string>();

  for (const equity of equities) {
    if (!equity.symbol) continue;
    seen.add(equity.symbol);
    const statementUnits = parseInvestmentQuantity(equity.quantity);
    const own = app.get(equity.symbol);
    const base = {
      symbol: equity.symbol,
      name: equity.name,
      statementQuantity: equity.quantity,
      statementValueCents: equity.grossCents,
    };
    if (!own) {
      rows.push({ ...base, status: "ONLY_IN_STATEMENT", appQuantity: null, quantityDifference: null, appMarketValueCents: null, appInvestedCents: null });
      continue;
    }
    const difference = statementUnits === null ? null : own.units - statementUnits;
    rows.push({
      ...base,
      status: difference === ZERO ? "MATCH" : "QUANTITY_DIFFERENT",
      appQuantity: formatInvestmentQuantity(own.units),
      quantityDifference: difference === null ? null : formatInvestmentQuantity(difference),
      appMarketValueCents: own.market,
      appInvestedCents: own.invested,
    });
  }

  for (const [symbol, own] of app) {
    if (seen.has(symbol)) continue;
    rows.push({
      symbol,
      name: null,
      status: "ONLY_IN_APP",
      statementQuantity: null,
      appQuantity: formatInvestmentQuantity(own.units),
      quantityDifference: null,
      statementValueCents: null,
      appMarketValueCents: own.market,
      appInvestedCents: own.invested,
    });
  }

  const order: Record<CustodyComparisonStatus, number> = { QUANTITY_DIFFERENT: 0, ONLY_IN_STATEMENT: 1, ONLY_IN_APP: 2, MATCH: 3 };
  return rows.sort((left, right) => order[left.status] - order[right.status] || left.symbol.localeCompare(right.symbol));
}
