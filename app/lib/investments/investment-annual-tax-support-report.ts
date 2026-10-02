import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getInvestmentAnnualIncomeReportForUser } from "@/app/lib/investments/investment-annual-income-report";
import { getFiscalPendingCenterForUser } from "@/app/lib/investments/investment-fiscal-pending-center";
import { getInvestmentFiscalYearEndSnapshotForUser } from "@/app/lib/investments/investment-fiscal-snapshot";
import { getInvestmentRealizedResultReportForUser } from "@/app/lib/investments/investment-realized-result-report";
import { getInvestmentTaxControlReportForUser } from "@/app/lib/investments/investment-tax-control";
import { getInvestmentTaxLossReportForUser } from "@/app/lib/investments/investment-tax-loss-report";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function getAnnualTaxSupportReportForUser(
  userId: string,
  year: number,
) {
  const [
    snapshot,
    incomes,
    realized,
    losses,
    taxes,
    pendencies,
    fiscalCostAdjustments,
  ] = await Promise.all([
      getInvestmentFiscalYearEndSnapshotForUser(userId, year),
      getInvestmentAnnualIncomeReportForUser(userId, year),
      getInvestmentRealizedResultReportForUser(userId, year),
      getInvestmentTaxLossReportForUser(userId, year),
      getInvestmentTaxControlReportForUser(userId, year),
      getFiscalPendingCenterForUser(userId, year),
      prisma.investmentFiscalCostAdjustment.findMany({
        where: { userId, year: { lte: year } },
        include: {
          asset: { select: { symbol: true } },
        },
        orderBy: [
          { year: "asc" },
          { month: "asc" },
          { day: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
      }),
    ]);

  const notes: Array<{
    type: "JUSTIFICATION" | "MANUAL_ADJUSTMENT" | "RULE_DEPENDENCY";
    title: string;
    detail: string;
  }> = [];

  for (const item of pendencies.items) {
    if (item.resolution) {
      notes.push({
        type: "JUSTIFICATION",
        title: item.title,
        detail: item.resolution.justification,
      });
    }
  }

  for (const adjustment of losses.adjustments) {
    notes.push({
      type: "MANUAL_ADJUSTMENT",
      title: `Prejuízo fiscal · ${adjustment.assetType} · ${String(
        adjustment.month,
      ).padStart(2, "0")}/${adjustment.year}`,
      detail: adjustment.reason,
    });
  }

  for (const adjustment of fiscalCostAdjustments) {
    notes.push({
      type: "MANUAL_ADJUSTMENT",
      title: `Custo fiscal · ${adjustment.asset.symbol} · ${String(
        adjustment.day,
      ).padStart(2, "0")}/${String(adjustment.month).padStart(2, "0")}/${
        adjustment.year
      }`,
      detail: adjustment.reason,
    });
  }

  if (taxes.rows.some((row) => row.status === "WAITING_RULES")) {
    notes.push({
      type: "RULE_DEPENDENCY",
      title: "Imposto devido ainda depende de regras fiscais versionadas",
      detail:
        "O relatório inclui resultado após prejuízos, IRRF e DARFs, mas não calcula imposto devido/saldo em aberto enquanto a regra fiscal do ano não estiver versionada.",
    });
  }

  return {
    year,
    generatedAt: new Date().toISOString(),
    officialReturn: false as const,
    disclaimer:
      "Documento de apoio para conferência e preenchimento manual. Não substitui nem transmite a declaração oficial à Receita Federal.",
    status: pendencies.status,
    summary: {
      pendingActive: pendencies.summary.active,
      pendingJustified: pendencies.summary.justified,
      assetCount: snapshot.current.items.length,
      incomeEventCount: incomes.eventCount,
      saleCount: realized.saleCount,
    },
    patrimony: {
      previous: snapshot.previous,
      current: snapshot.current,
      comparison: snapshot.comparison,
    },
    incomes,
    realized,
    taxLosses: losses,
    taxes,
    pendencies,
    notes,
  };
}

export async function getAnnualTaxSupportReport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(await getAnnualTaxSupportReportForUser(userId, input.year));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao gerar relatório anual de apoio ao IR", 500);
  }
}
