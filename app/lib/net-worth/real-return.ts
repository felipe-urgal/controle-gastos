import { success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { loadIpcaInflationForPeriod } from "@/app/lib/economic-indicators/ipca";
import { getNetWorthForUser } from "@/app/lib/net-worth/net-worth";
import { buildRealReturnByCurrency } from "@/app/lib/net-worth/real-return-domain";
import { z } from "zod";

const realReturnQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  months: z.coerce.number().int().min(1).max(60).default(12),
});

type RealReturnInput = z.infer<typeof realReturnQuerySchema>;

export async function getNetWorthRealReturnForUser(
  userId: string,
  input: RealReturnInput,
) {
  const netWorth = await getNetWorthForUser(userId, {
    year: input.year,
    month: input.month,
    months: input.months + 1,
  });
  const baseline = netWorth.history[0];
  const current = netWorth.history.at(-1);

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
      months: input.months,
    },
    inflation,
    byCurrency,
    formula: "(1 + retorno nominal) / (1 + inflação) - 1" as const,
    rounding: "Percentuais arredondados para 6 casas decimais" as const,
  };
}

export async function getNetWorthRealReturn(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = parseQuery(request, realReturnQuerySchema, {
      year: null,
      month: null,
      months: undefined,
    });
    return success(await getNetWorthRealReturnForUser(userId, input));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao calcular variação real do patrimônio",
      zodMessage: "Parâmetros inválidos",
    });
  }
}
