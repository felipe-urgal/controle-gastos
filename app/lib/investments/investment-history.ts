import { z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { formatInvestmentQuantity } from "@/app/lib/investments/investment-domain";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  assetId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

function dateFromParts(value: { year: number; month: number; day: number }) {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export async function getInvestmentOperationsHistory(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({
      assetId: url.searchParams.get("assetId") ?? undefined,
      page: url.searchParams.get("page") ?? 1,
      limit: url.searchParams.get("limit") ?? 30,
    });
    const where = {
      userId,
      ...(input.assetId ? { assetId: input.assetId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.investmentOperation.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              symbol: true,
              name: true,
              type: true,
              currency: true,
              taxLocation: true,
            },
          },
          account: {
            select: { id: true, name: true, currency: true, type: true },
          },
          fiscalEvent: {
            select: {
              id: true,
              type: true,
              originalType: true,
              classificationSource: true,
              sourceInstitution: true,
              destinationInstitution: true,
              reclassificationNote: true,
              updatedAt: true,
            },
          },
        },
        orderBy: [
          { year: "desc" },
          { month: "desc" },
          { day: "desc" },
          { sequence: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      prisma.investmentOperation.count({ where }),
    ]);

    return success({
      page: input.page,
      limit: input.limit,
      total,
      hasMore: input.page * input.limit < total,
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        quantity: formatInvestmentQuantity(item.quantityUnits),
        unitPriceCents: item.unitPriceCents,
        feesCents: item.feesCents,
        date: dateFromParts(item),
        note: item.note,
        fiscalEvent: item.fiscalEvent,
        account: item.account,
        asset: item.asset,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Consulta inválida", 400);
    }
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Erro ao carregar histórico de operações", 500);
  }
}

export async function getInvestmentIncomesHistory(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({
      assetId: url.searchParams.get("assetId") ?? undefined,
      page: url.searchParams.get("page") ?? 1,
      limit: url.searchParams.get("limit") ?? 30,
    });
    const where = {
      userId,
      ...(input.assetId ? { assetId: input.assetId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.investmentIncome.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              symbol: true,
              name: true,
              type: true,
              currency: true,
              taxLocation: true,
            },
          },
          account: {
            select: { id: true, name: true, currency: true },
          },
        },
        orderBy: [
          { year: "desc" },
          { month: "desc" },
          { day: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      prisma.investmentIncome.count({ where }),
    ]);

    return success({
      page: input.page,
      limit: input.limit,
      total,
      hasMore: input.page * input.limit < total,
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        quantity: formatInvestmentQuantity(item.quantityUnits),
        unitValueCents: item.unitValueCents,
        netAmountCents: item.netAmountCents,
        date: dateFromParts(item),
        note: item.note,
        account: item.account,
        asset: item.asset,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(error.issues[0]?.message ?? "Consulta inválida", 400);
    }
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Erro ao carregar histórico de proventos", 500);
  }
}
