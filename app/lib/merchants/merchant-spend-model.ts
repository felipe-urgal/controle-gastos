import type { AccountType } from "@/app/types/account";
import type { MerchantMonthSummary, MerchantSpend } from "@/app/types/merchant";
import type { SupportedCurrency } from "@/app/types/financial-summary";
import type { TransactionType } from "@/app/types/transaction";

import { transactionFinancialImpact } from "@/app/lib/transactions/financial-impact";

export type MerchantSpendRow = {
  merchantId: string | null;
  currency: string;
  accountType: AccountType;
  type: TransactionType;
  year: number;
  month: number;
  count: number;
  total: number;
};

type Month = { year: number; month: number };

export function previousMonth({ year, month }: Month): Month {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

type Cell = { expense: number; previousExpense: number; count: number };

/** Despesa líquida por estabelecimento (ou sem estabelecimento) e moeda, no mês e no mês anterior. */
function buildCells(rows: readonly MerchantSpendRow[], asOf: Month) {
  const previous = previousMonth(asOf);
  const cells = new Map<string, Map<string, Cell>>();

  for (const row of rows) {
    const isCurrent = row.year === asOf.year && row.month === asOf.month;
    const isPrevious = row.year === previous.year && row.month === previous.month;
    if (!isCurrent && !isPrevious) continue;

    const owner = row.merchantId ?? "";
    const perCurrency = cells.get(owner) ?? new Map<string, Cell>();
    const cell = perCurrency.get(row.currency) ?? { expense: 0, previousExpense: 0, count: 0 };
    // Despesa líquida: receita comum não entra; estorno em cartão já vem como despesa negativa.
    const { expense: net } = transactionFinancialImpact(row.accountType, row.type, row.total);

    if (isCurrent) {
      cell.expense += net;
      cell.count += row.count;
    } else {
      cell.previousExpense += net;
    }
    perCurrency.set(row.currency, cell);
    cells.set(owner, perCurrency);
  }

  return cells;
}

/** Gasto do mês de um estabelecimento, uma entrada por moeda (nunca somadas). */
export function merchantSpend(rows: readonly MerchantSpendRow[], merchantId: string, asOf: Month): MerchantSpend[] {
  const perCurrency = buildCells(rows, asOf).get(merchantId);
  if (!perCurrency) return [];

  return [...perCurrency.entries()]
    .filter(([, cell]) => cell.expense !== 0 || cell.previousExpense !== 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, cell]) => ({ currency: currency as SupportedCurrency, ...cell }));
}

export const MERCHANT_SUMMARY_TOP = 3;

/** Resumo do mês por moeda: quanto foi para estabelecimentos, quanto ficou sem e os maiores. */
export function buildMerchantSummary(
  rows: readonly MerchantSpendRow[],
  asOf: Month,
  names: ReadonlyMap<string, string>,
): MerchantMonthSummary {
  const cells = buildCells(rows, asOf);
  const currencies = new Set<string>();
  for (const perCurrency of cells.values()) for (const currency of perCurrency.keys()) currencies.add(currency);

  const entries = [...currencies].map((currency) => {
    const merchants = [...cells.entries()]
      .filter(([owner]) => owner !== "")
      .map(([owner, perCurrency]) => ({ id: owner, name: names.get(owner) ?? "", expense: perCurrency.get(currency)?.expense ?? 0 }))
      .filter((entry) => entry.expense > 0)
      .sort((left, right) => right.expense - left.expense || left.name.localeCompare(right.name, "pt-BR"));
    const assigned = merchants.reduce((sum, entry) => sum + entry.expense, 0);
    const unassigned = Math.max(0, cells.get("")?.get(currency)?.expense ?? 0);

    return {
      currency: currency as SupportedCurrency,
      assigned,
      unassigned,
      top: merchants.slice(0, MERCHANT_SUMMARY_TOP),
    };
  });

  return {
    currencies: entries
      .filter((entry) => entry.assigned > 0 || entry.unassigned > 0)
      .sort((left, right) => right.assigned - left.assigned || left.currency.localeCompare(right.currency)),
  };
}
