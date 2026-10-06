import { loadIpcaInflationForPeriod } from "@/app/lib/economic-indicators/ipca";
import { buildRealReturnByCurrency } from "@/app/lib/net-worth/real-return-domain";
import type {
  NetWorthHistoryPoint,
  NetWorthRealReturnData,
} from "@/app/types/net-worth";

export async function buildNetWorthRealEvolutionFromHistory(
  history: NetWorthHistoryPoint[],
  months: number,
): Promise<NetWorthRealReturnData> {
  const baseline = history[0];
  const current = history.at(-1);

  if (!baseline || !current) {
    throw new Error("Histórico patrimonial insuficiente para o período");
  }

  const inflation = await loadIpcaInflationForPeriod(baseline, current);
  const byCurrency = buildRealReturnByCurrency({
    baselineTotals: baseline.totals,
    currentTotals: current.totals,
    inflationPercentage: inflation.percentage,
    inflationComplete: inflation.complete,
  });

  return {
    period: {
      start: { year: baseline.year, month: baseline.month },
      end: { year: current.year, month: current.month },
      months,
    },
    inflation,
    byCurrency,
    formula: "(1 + retorno nominal) / (1 + inflação) - 1",
    rounding: "Percentuais arredondados para 6 casas decimais",
    semantic: "EVOLUCAO_PATRIMONIAL",
  };
}
