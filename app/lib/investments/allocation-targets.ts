import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError } from "@/app/lib/http-error";
import {
  validateAllocationTargets,
  type AllocationAssetType,
} from "@/app/lib/investments/allocation-target-domain";
import { prisma } from "@/app/lib/prisma";

const assetTypeSchema = z.enum(["STOCK", "FII", "ETF", "FIXED_INCOME", "CRYPTO", "FUND", "OTHER"]);

const putSchema = z.object({
  currency: z.enum(["BRL", "USD", "EUR"]),
  targets: z.array(z.object({ assetType: assetTypeSchema, percent: z.number() })).max(7),
});

export type AllocationTargetDTO = { currency: "BRL" | "USD" | "EUR"; assetType: AllocationAssetType; percent: number };

export async function getAllocationTargets() {
  try {
    const userId = await getAuthenticatedUserId();
    const rows = await prisma.investmentAllocationTarget.findMany({
      where: { userId },
      select: { currency: true, assetType: true, percent: true },
      orderBy: [{ currency: "asc" }, { percent: "desc" }, { assetType: "asc" }],
    });
    return success(rows as AllocationTargetDTO[]);
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar a alocação alvo" });
  }
}

/** Substitui a alocação alvo de uma moeda. Lista vazia remove a meta; senão os percentuais devem somar 100%. */
export async function putAllocationTargets(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = putSchema.parse(await parseJsonBody(request));
    const message = validateAllocationTargets(input.targets);
    if (message) throw new HttpError(message, 400, "INVALID_ALLOCATION_TARGETS");

    await prisma.$transaction(async (tx) => {
      await tx.investmentAllocationTarget.deleteMany({ where: { userId, currency: input.currency } });
      if (input.targets.length > 0) {
        await tx.investmentAllocationTarget.createMany({
          data: input.targets.map((target) => ({ userId, currency: input.currency, ...target })),
        });
      }
    });

    return success(
      input.targets.map((target) => ({ currency: input.currency, ...target })),
      input.targets.length > 0 ? "Alocação alvo salva" : "Alocação alvo removida",
    );
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao salvar a alocação alvo",
      zodMessage: "Dados inválidos",
    });
  }
}
