import type { InvestmentIncome } from "@/app/types/investment";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type InvestmentIncomeAssetSummary = {
  assetId: string;
  symbol: string;
  currency: SupportedCurrency;
  amountCents: number;
  count: number;
};

export function groupInvestmentIncomesByAsset(
  incomes: readonly Pick<
    InvestmentIncome,
    "netAmountCents" | "asset"
  >[],
): InvestmentIncomeAssetSummary[] {
  const byAsset = new Map<string, InvestmentIncomeAssetSummary>();

  for (const income of incomes) {
    const current = byAsset.get(income.asset.id) ?? {
      assetId: income.asset.id,
      symbol: income.asset.symbol,
      currency: income.asset.currency,
      amountCents: 0,
      count: 0,
    };

    if (current.currency !== income.asset.currency) {
      throw new Error(
        `Ativo ${income.asset.symbol} possui proventos com moedas incompatíveis.`,
      );
    }

    current.amountCents += income.netAmountCents;
    current.count += 1;
    byAsset.set(income.asset.id, current);
  }

  return [...byAsset.values()].sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  );
}
