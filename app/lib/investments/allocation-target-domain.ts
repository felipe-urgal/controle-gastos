/**
 * Alocação alvo e rebalanceamento da carteira. Puro: centavos inteiros, uma moeda por vez.
 * Só descreve o que falta para chegar à meta; nenhuma ordem de compra ou venda é criada.
 */

export type AllocationAssetType = "STOCK" | "FII" | "ETF" | "FIXED_INCOME" | "CRYPTO" | "FUND" | "OTHER";

export type AllocationTarget = { assetType: AllocationAssetType; percent: number };

export type AllocationHolding = { assetType: AllocationAssetType; value: number };

export type RebalanceRow = {
  assetType: AllocationAssetType;
  currentValue: number;
  /** Participação atual no total, em % com uma casa. */
  currentShare: number;
  targetPercent: number;
  /** Valor que a classe teria no total atual se estivesse na meta. */
  targetValue: number;
  /** Alvo menos atual: positivo = falta chegar, negativo = passou da meta. */
  difference: number;
};

export type RebalancePlan = {
  total: number;
  rows: RebalanceRow[];
  /** Valor em classes sem meta (a meta não cobre). */
  untargetedValue: number;
  /**
   * Menor aporte total que leva todas as classes à meta (ou abaixo dela) sem vender nada, repartido pelas classes
   * abaixo da meta. `null` quando há valor em classes sem meta, pois aportar não resolve.
   */
  contributionToBalance: number | null;
};

export function validateAllocationTargets(targets: readonly AllocationTarget[]): string | null {
  const seen = new Set<string>();
  let sum = 0;
  for (const target of targets) {
    if (!Number.isInteger(target.percent) || target.percent < 1 || target.percent > 100) {
      return "Cada percentual deve ser inteiro, de 1 a 100";
    }
    if (seen.has(target.assetType)) return "Cada classe de ativo só pode aparecer uma vez";
    seen.add(target.assetType);
    sum += target.percent;
  }
  if (targets.length > 0 && sum !== 100) return `Os percentuais devem somar 100% (somam ${sum}%)`;
  return null;
}

export function rebalancePlan(args: {
  holdings: readonly AllocationHolding[];
  targets: readonly AllocationTarget[];
}): RebalancePlan {
  const current = new Map<AllocationAssetType, number>();
  for (const holding of args.holdings) {
    current.set(holding.assetType, (current.get(holding.assetType) ?? 0) + holding.value);
  }
  const total = [...current.values()].reduce((sum, value) => sum + value, 0);
  const targetByType = new Map(args.targets.map((target) => [target.assetType, target.percent]));

  const types = new Set<AllocationAssetType>([...current.keys(), ...targetByType.keys()]);
  const rows: RebalanceRow[] = [...types]
    .map((assetType) => {
      const currentValue = current.get(assetType) ?? 0;
      const targetPercent = targetByType.get(assetType) ?? 0;
      const targetValue = Math.round((total * targetPercent) / 100);
      return {
        assetType,
        currentValue,
        currentShare: total > 0 ? Math.round((currentValue / total) * 1000) / 10 : 0,
        targetPercent,
        targetValue,
        difference: targetValue - currentValue,
      };
    })
    .sort((left, right) => right.targetPercent - left.targetPercent || right.currentValue - left.currentValue);

  const untargetedValue = rows.filter((row) => row.targetPercent === 0).reduce((sum, row) => sum + row.currentValue, 0);

  let contributionToBalance: number | null = null;
  if (args.targets.length > 0 && untargetedValue === 0) {
    const required = Math.max(
      total,
      ...rows.filter((row) => row.targetPercent > 0).map((row) => Math.ceil((row.currentValue * 100) / row.targetPercent)),
    );
    contributionToBalance = required - total;
  }

  return { total, rows, untargetedValue, contributionToBalance };
}

/** Quanto aportar em cada classe abaixo da meta para equilibrar sem vender (soma = `contributionToBalance`). */
export function contributionByClass(plan: RebalancePlan): Array<{ assetType: AllocationAssetType; amount: number }> {
  if (plan.contributionToBalance === null) return [];
  const newTotal = plan.total + plan.contributionToBalance;
  return plan.rows
    .filter((row) => row.targetPercent > 0)
    .map((row) => ({ assetType: row.assetType, amount: Math.max(0, Math.round((newTotal * row.targetPercent) / 100) - row.currentValue) }))
    .filter((item) => item.amount > 0);
}
