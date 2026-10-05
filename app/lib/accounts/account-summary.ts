import type { AccountType } from "@/app/types/account";

export type AccountPortfolioSummaryInput = {
  type: AccountType;
  currency: string;
  isActive: boolean;
  balance: number;
  investmentValueCents?: number | null;
};

function add(
  target: Map<string, number>,
  currency: string,
  amount: number,
) {
  target.set(currency, (target.get(currency) ?? 0) + amount);
}

function entries(target: Map<string, number>) {
  return [...target.entries()].map(([currency, value]) => ({ currency, value }));
}

export function buildAccountPortfolioSummary(
  accounts: AccountPortfolioSummaryInput[],
) {
  const all = new Map<string, number>();
  const bank = new Map<string, number>();
  const investment = new Map<string, number>();
  let negativeCount = 0;

  for (const account of accounts) {
    if (account.type === "CREDIT_CARD") continue;

    const value =
      account.type === "INVESTMENT"
        ? account.investmentValueCents ?? account.balance
        : account.balance;

    add(all, account.currency, value);
    if (account.type === "INVESTMENT") add(investment, account.currency, value);
    else add(bank, account.currency, value);
    if (value < 0) negativeCount += 1;
  }

  return {
    balancesByCurrency: entries(all),
    bankBalancesByCurrency: entries(bank),
    investmentBalancesByCurrency: entries(investment),
    activeCount: accounts.filter((account) => account.isActive).length,
    negativeCount,
    totalCount: accounts.length,
    typeCounts: {
      CREDIT_DEBIT: accounts.filter((account) => account.type === "CREDIT_DEBIT").length,
      INVESTMENT: accounts.filter((account) => account.type === "INVESTMENT").length,
      CREDIT_CARD: accounts.filter((account) => account.type === "CREDIT_CARD").length,
    },
  };
}
