import type { NetWorthAccount, NetWorthValuationQuality } from '@/app/types/net-worth';

export type NetWorthVariation = {
  /** Diferença em centavos entre o último e o primeiro ponto da série. */
  amount: number;
  /** Variação percentual; `null` quando o ponto inicial não é positivo (a razão não tem significado). */
  percent: number | null;
};

export function summarizeVariation(values: number[]): NetWorthVariation | null {
  if (values.length < 2) return null;
  const first = values[0];
  const amount = values[values.length - 1] - first;
  return { amount, percent: first > 0 ? (amount / first) * 100 : null };
}

/** Parcela dos ativos comprometida com dívidas, limitada a 0–100; `null` sem ativos positivos. */
export function liabilityShare(assetsTotal: number, liabilitiesTotal: number): number | null {
  if (assetsTotal <= 0) return null;
  return Math.min(100, Math.max(0, (liabilitiesTotal / assetsTotal) * 100));
}

export type RankedAccount = { account: NetWorthAccount; share: number; barPercent: number };

/** Contas do maior para o menor valor absoluto, com a fatia de cada uma e a largura relativa da barra. */
export function rankAccounts(accounts: NetWorthAccount[]): RankedAccount[] {
  const total = accounts.reduce((sum, account) => sum + Math.abs(account.balance), 0);
  const largest = Math.max(0, ...accounts.map((account) => Math.abs(account.balance)));
  return [...accounts]
    .sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance))
    .map((account) => ({
      account,
      share: total === 0 ? 0 : Math.round((Math.abs(account.balance) / total) * 1000) / 10,
      barPercent: largest === 0 ? 0 : (Math.abs(account.balance) / largest) * 100,
    }));
}

export type QualityTone = 'ok' | 'warning';

/** Resumo de uma linha da qualidade dos valores; os detalhes continuam disponíveis ao expandir. */
export function summarizeQuality(valuation: NetWorthValuationQuality): { tone: QualityTone; headline: string } {
  const stale = valuation.staleMarketPositionCount;
  const unreconciled = valuation.compositionStatus === 'UNRECONCILED_TRANSACTION_BALANCE';
  if (stale > 0) {
    return { tone: 'warning', headline: stale === 1 ? '1 cotação desatualizada' : `${stale} cotações desatualizadas` };
  }
  if (unreconciled) return { tone: 'warning', headline: 'Composição não conciliada' };
  if (valuation.positionCount > 0 && valuation.costPositionCount > 0) {
    return { tone: 'ok', headline: 'Parte das posições está a custo' };
  }
  return { tone: 'ok', headline: 'Valores atualizados' };
}
