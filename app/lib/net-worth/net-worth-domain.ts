import type { SupportedCurrency } from "@/app/types/financial-summary";

export type NetWorthAccount = {
  id: string;
  name: string;
  type: "CREDIT_DEBIT" | "INVESTMENT";
  currency: SupportedCurrency;
  isActive: boolean;
  color: string | null;
  icon: string | null;
  cashBalance?: number;
  valuationSource?: "MARKET" | "COST" | "MIXED";
  positionCount?: number;
};

export type NetWorthBalanceRow = {
  accountId: string;
  type: "INCOME" | "EXPENSE";
  _sum: { amount: number | null };
};

export type NetWorthMovementRow = NetWorthBalanceRow & {
  year: number;
  month: number;
};

export function periodKey(year: number, month: number) {
  return year * 100 + month;
}

export function shiftPeriod(
  period: { year: number; month: number },
  offset: number,
) {
  const absolute = period.year * 12 + (period.month - 1) + offset;
  const year = Math.floor(absolute / 12);
  const month = ((absolute % 12) + 12) % 12 + 1;
  return { year, month };
}

export function buildMonthlyPeriods(
  end: { year: number; month: number },
  months: number,
) {
  return Array.from({ length: months }, (_, index) =>
    shiftPeriod(end, index - months + 1),
  );
}

export function applyMovement(balance: number, row: NetWorthBalanceRow) {
  const amount = row._sum.amount ?? 0;
  return row.type === "INCOME" ? balance + amount : balance - amount;
}

export function buildNetWorthHistory(args: {
  accounts: readonly NetWorthAccount[];
  openingRows: readonly NetWorthBalanceRow[];
  rows: readonly NetWorthMovementRow[];
  periods: readonly { year: number; month: number }[];
}) {
  const accountById = new Map(args.accounts.map((account) => [account.id, account]));
  const balances = new Map(args.accounts.map((account) => [account.id, 0]));

  for (const row of args.openingRows) {
    if (!accountById.has(row.accountId)) continue;
    balances.set(row.accountId, applyMovement(balances.get(row.accountId) ?? 0, row));
  }

  const rowsByPeriod = new Map<number, NetWorthMovementRow[]>();
  for (const row of args.rows) {
    const key = periodKey(row.year, row.month);
    const list = rowsByPeriod.get(key) ?? [];
    list.push(row);
    rowsByPeriod.set(key, list);
  }

  return args.periods.map((period) => {
    const key = periodKey(period.year, period.month);
    for (const row of rowsByPeriod.get(key) ?? []) {
      balances.set(row.accountId, applyMovement(balances.get(row.accountId) ?? 0, row));
    }

    const totals = new Map<SupportedCurrency, number>();
    for (const account of args.accounts) {
      totals.set(
        account.currency,
        (totals.get(account.currency) ?? 0) + (balances.get(account.id) ?? 0),
      );
    }

    return {
      year: period.year,
      month: period.month,
      totals: Object.fromEntries(totals) as Partial<Record<SupportedCurrency, number>>,
    };
  });
}

export function buildNetWorthDistribution(args: {
  accounts: readonly NetWorthAccount[];
  rows: readonly NetWorthMovementRow[];
}) {
  const balances = new Map(args.accounts.map((account) => [account.id, 0]));

  for (const row of args.rows) {
    if (!balances.has(row.accountId)) continue;
    balances.set(row.accountId, applyMovement(balances.get(row.accountId) ?? 0, row));
  }

  return args.accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? 0,
  }));
}
