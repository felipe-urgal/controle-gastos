import type { AccountType } from "@/app/types/account";
import type { SupportedCurrency } from "@/app/types/financial-summary";
import type { TagReportCurrency, TagReportHistory, TagReportPeriod } from "@/app/types/tag";
import type { TransactionType } from "@/app/types/transaction";

import { transactionFinancialImpact } from "@/app/lib/transactions/financial-impact";

export const TAG_REPORT_HISTORY_MONTHS = 6;

export type TagReportRow = {
  currency: string;
  accountType: AccountType;
  type: TransactionType;
  year: number;
  month: number;
  count: number;
  total: number;
};

type Month = { year: number; month: number };

export function parseTagReportPeriod(value: string | null): TagReportPeriod {
  return value === "month" || value === "year" ? value : "all";
}

function monthIndex({ year, month }: Month) {
  return year * 12 + (month - 1);
}

/** Os `count` meses terminando em `asOf`, do mais antigo para o atual. */
export function tagHistoryWindow(asOf: Month, count = TAG_REPORT_HISTORY_MONTHS): Month[] {
  return Array.from({ length: count }, (_, index) => {
    const absolute = monthIndex(asOf) - (count - 1 - index);
    return { year: Math.floor(absolute / 12), month: (absolute % 12) + 1 };
  });
}

function inPeriod(row: Month, period: TagReportPeriod, asOf: Month) {
  if (period === "month") return row.year === asOf.year && row.month === asOf.month;
  if (period === "year") return row.year === asOf.year;
  return true;
}

/** Totais por moeda no período; cada moeda fica separada e nunca é somada às outras. */
export function aggregateTagCurrencies(
  rows: readonly TagReportRow[],
  period: TagReportPeriod,
  asOf: Month,
): TagReportCurrency[] {
  const currencies = new Map<string, TagReportCurrency>();

  for (const row of rows) {
    if (!inPeriod(row, period, asOf)) continue;

    const current = currencies.get(row.currency) ?? {
      currency: row.currency as SupportedCurrency,
      transactionCount: 0,
      income: 0,
      expense: 0,
      balance: 0,
    };
    current.transactionCount += row.count;

    const impact = transactionFinancialImpact(row.accountType, row.type, row.total);
    current.income += impact.income;
    current.expense += impact.expense;
    current.balance = current.income - current.expense;
    currencies.set(row.currency, current);
  }

  return [...currencies.values()].sort((left, right) => left.currency.localeCompare(right.currency));
}

/** Despesa e receita dos últimos meses por moeda, preenchendo meses vazios com zero. */
export function aggregateTagHistory(rows: readonly TagReportRow[], asOf: Month): TagReportHistory[] {
  const window = tagHistoryWindow(asOf);
  const first = monthIndex(window[0]);
  const last = monthIndex(window[window.length - 1]);
  const byCurrency = new Map<string, TagReportRow[]>();

  for (const row of rows) {
    const index = monthIndex(row);
    if (index < first || index > last) continue;
    byCurrency.set(row.currency, [...(byCurrency.get(row.currency) ?? []), row]);
  }

  return [...byCurrency.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, currencyRows]) => ({
      currency: currency as SupportedCurrency,
      points: window.map(({ year, month }) => {
        const totals = aggregateTagCurrencies(
          currencyRows.filter((row) => row.year === year && row.month === month),
          "all",
          asOf,
        )[0];
        return { year, month, income: totals?.income ?? 0, expense: totals?.expense ?? 0 };
      }),
    }));
}
