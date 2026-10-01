import type { ForecastResult } from "@/app/lib/forecast/forecast-engine";

export type SafeToSpendAccountType = "CREDIT_DEBIT" | "INVESTMENT";

export type SafeToSpendAccount = {
  id: string;
  name: string;
  realizedBalance: number;
  pendingExpenses: number;
  transferNet: number;
  safeToSpend: number;
};

export type SafeToSpendResult = {
  realizedBalance: number;
  pendingExpenses: number;
  cardCommitments: number;
  transferNet: number;
  safeToSpend: number;
  accounts: SafeToSpendAccount[];
};

function signedAmount(type: "INCOME" | "EXPENSE", amount: number) {
  return type === "INCOME" ? amount : -amount;
}

export function buildSafeToSpend(args: {
  forecast: ForecastResult;
  accountTypes: ReadonlyMap<string, SafeToSpendAccountType>;
  cardCommitments: readonly { amount: number }[];
}): SafeToSpendResult {
  const accounts = args.forecast.accounts
    .filter((account) => args.accountTypes.get(account.id) === "CREDIT_DEBIT")
    .map((account): SafeToSpendAccount => ({
      id: account.id,
      name: account.name,
      realizedBalance: account.realizedBalance,
      pendingExpenses: 0,
      transferNet: 0,
      safeToSpend: account.realizedBalance,
    }));

  const byAccount = new Map(accounts.map((account) => [account.id, account]));
  const pendingItems = [...args.forecast.overdue, ...args.forecast.upcoming];

  for (const item of pendingItems) {
    if (item.status !== "PENDING") continue;

    const account = byAccount.get(item.accountId);
    if (!account) continue;

    const kind = item.kind ?? "NORMAL";
    if (kind === "NORMAL" && item.type === "EXPENSE") {
      account.pendingExpenses += item.amount;
      continue;
    }

    if (kind === "TRANSFER") {
      account.transferNet += signedAmount(item.type, item.amount);
    }
  }

  for (const account of accounts) {
    account.safeToSpend =
      account.realizedBalance - account.pendingExpenses + account.transferNet;
  }

  const realizedBalance = accounts.reduce(
    (sum, account) => sum + account.realizedBalance,
    0,
  );
  const pendingExpenses = accounts.reduce(
    (sum, account) => sum + account.pendingExpenses,
    0,
  );
  const transferNet = accounts.reduce(
    (sum, account) => sum + account.transferNet,
    0,
  );
  const cardCommitments = args.cardCommitments.reduce(
    (sum, commitment) => sum + commitment.amount,
    0,
  );

  return {
    realizedBalance,
    pendingExpenses,
    cardCommitments,
    transferNet,
    safeToSpend:
      realizedBalance - pendingExpenses - cardCommitments + transferNet,
    accounts,
  };
}
