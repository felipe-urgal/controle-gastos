import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { logicalDateFromInstant } from "@/app/lib/date/logical-date";
import {
  projectIncomes,
  type IncomeProjection,
} from "@/app/lib/investments/income-projection-domain";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
});

export type InvestmentIncomeProjectionDTO = IncomeProjection & {
  currency: "BRL" | "USD" | "EUR";
  /** Ativos com posição aberta cujos proventos entram na referência. */
  openAssetCount: number;
};

export async function getIncomeProjectionForUser(
  userId: string,
  currency: "BRL" | "USD" | "EUR",
  now: Date = new Date(),
): Promise<InvestmentIncomeProjectionDTO> {
  const today = logicalDateFromInstant(now);
  const assets = await prisma.investmentAsset.findMany({
    where: { userId, currency },
    select: { id: true },
  });
  const assetIds = assets.map((asset) => asset.id);

  const operationRows = assetIds.length
    ? await prisma.investmentOperation.groupBy({
        by: ["assetId", "type"],
        where: { userId, assetId: { in: assetIds } },
        _sum: { quantityUnits: true },
      })
    : [];
  const quantity = new Map<string, bigint>();
  for (const row of operationRows) {
    const units = row._sum.quantityUnits ?? BigInt(0);
    quantity.set(row.assetId, (quantity.get(row.assetId) ?? BigInt(0)) + (row.type === "BUY" ? units : -units));
  }
  const openAssetIds = new Set([...quantity].filter(([, units]) => units > BigInt(0)).map(([id]) => id));

  // Referência: os 12 meses até o atual (o mês seguinte espelha o mesmo mês de um ano antes).
  const referenceMonths = Array.from({ length: 12 }, (_, offset) => {
    const index = today.year * 12 + (today.month - 1) - offset;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  });
  const incomes = openAssetIds.size
    ? await prisma.investmentIncome.findMany({
        where: { userId, assetId: { in: [...openAssetIds] }, OR: referenceMonths },
        select: { assetId: true, year: true, month: true, netAmountCents: true },
      })
    : [];

  return {
    currency,
    openAssetCount: openAssetIds.size,
    ...projectIncomes({ incomes, openAssetIds, asOf: { year: today.year, month: today.month } }),
  };
}

/** `GET /api/investments/income-projection?currency=BRL` — proventos projetados dos próximos 12 meses. */
export async function getIncomeProjection(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { currency } = parseQuery(request, querySchema, { currency: undefined });
    return success(await getIncomeProjectionForUser(userId, currency));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao projetar os proventos",
      zodMessage: "Moeda inválida",
    });
  }
}
