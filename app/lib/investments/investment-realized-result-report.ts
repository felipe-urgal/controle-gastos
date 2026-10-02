import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { deriveRealizedInvestmentResults } from "@/app/lib/investments/investment-realized-result-domain";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function getInvestmentRealizedResultReportForUser(
  userId: string,
  year: number,
) {
  const [events, adjustments] = await Promise.all([
    prisma.investmentFiscalEvent.findMany({
      where: { userId, year: { lte: year } },
      include: {
        asset: {
          select: {
            id: true,
            symbol: true,
            type: true,
            currency: true,
          },
        },
        operation: {
          select: {
            unitPriceCents: true,
            feesCents: true,
          },
        },
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.investmentFiscalCostAdjustment.findMany({
      where: { userId, year: { lte: year } },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
        { day: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
  ]);

  const sales = deriveRealizedInvestmentResults({
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      quantityUnits: event.quantityUnits,
      year: event.year,
      month: event.month,
      day: event.day,
      createdAt: event.createdAt,
      assetId: event.asset.id,
      symbol: event.asset.symbol,
      assetType: event.asset.type,
      currency: event.asset.currency,
      operation: event.operation,
    })),
    adjustments: adjustments.map((adjustment) => ({
      id: adjustment.id,
      assetId: adjustment.assetId,
      quantityUnits: adjustment.quantityUnits,
      costBasisCents: adjustment.costBasisCents,
      year: adjustment.year,
      month: adjustment.month,
      day: adjustment.day,
      createdAt: adjustment.createdAt,
    })),
  }).filter((sale) => sale.year === year);

  const groups = new Map<
    string,
    {
      year: number;
      month: number;
      assetType: string;
      currency: string;
      saleCount: number;
      grossProceedsCents: number;
      feesCents: number;
      netProceedsCents: number;
      allocatedCostCents: number;
      realizedResultCents: number;
      status: "OK" | "PENDING";
      sales: typeof sales;
    }
  >();

  for (const sale of sales) {
    const key = [sale.year, sale.month, sale.assetType, sale.currency].join("|");
    const current = groups.get(key) ?? {
      year: sale.year,
      month: sale.month,
      assetType: sale.assetType,
      currency: sale.currency,
      saleCount: 0,
      grossProceedsCents: 0,
      feesCents: 0,
      netProceedsCents: 0,
      allocatedCostCents: 0,
      realizedResultCents: 0,
      status: "OK" as const,
      sales: [],
    };

    current.saleCount += 1;
    current.grossProceedsCents += sale.grossProceedsCents;
    current.feesCents += sale.feesCents;
    current.netProceedsCents += sale.netProceedsCents;
    if (sale.status === "OK") {
      current.allocatedCostCents += sale.allocatedCostCents;
      current.realizedResultCents += sale.realizedResultCents;
    } else {
      current.status = "PENDING";
    }
    current.sales.push(sale);
    groups.set(key, current);
  }

  const monthlyGroups = [...groups.values()].sort((left, right) => {
    if (left.month !== right.month) return left.month - right.month;
    const type = left.assetType.localeCompare(right.assetType);
    if (type !== 0) return type;
    return left.currency.localeCompare(right.currency);
  });

  const pending = sales
    .filter((sale) => sale.status === "PENDING")
    .flatMap((sale) =>
      sale.pending.map((message) => ({
        eventId: sale.eventId,
        assetId: sale.assetId,
        symbol: sale.symbol,
        month: sale.month,
        assetType: sale.assetType,
        currency: sale.currency,
        message,
      })),
    );

  return {
    year,
    saleCount: sales.length,
    groupCount: monthlyGroups.length,
    status: pending.length === 0 ? ("OK" as const) : ("PENDING" as const),
    pending,
    monthlyGroups,
  };
}

export async function getInvestmentRealizedResultReport(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(
      await getInvestmentRealizedResultReportForUser(userId, input.year),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao apurar resultado realizado", 500);
  }
}
