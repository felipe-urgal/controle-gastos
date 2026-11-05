import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError } from "@/app/lib/http-error";
import { assertMonthsOpen } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";

const mergeMerchantBodySchema = z.object({
  targetId: z.string().uuid("Estabelecimento de destino inválido"),
});

export type MerchantMergeResult = {
  targetId: string;
  movedTransactions: number;
  movedAliases: number;
  discardedAliases: number;
};

/**
 * Move lançamentos e aliases do estabelecimento de origem para o de destino e apaga a origem.
 * - Mesmo dono; o destino precisa estar ativo.
 * - Mês travado bloqueia (os lançamentos movidos mudam de estabelecimento).
 * - Alias da origem que o destino já tem (mesmo operador e padrão) é descartado; os demais passam para o destino
 *   e cada movimento fica registrado em `MerchantAliasEvent`.
 */
export async function mergeMerchantsForUser(
  userId: string,
  sourceId: string,
  targetId: string,
): Promise<MerchantMergeResult> {
  if (sourceId === targetId) {
    throw new HttpError("Escolha um estabelecimento diferente para mesclar", 400);
  }

  return prisma.$transaction(async (tx) => {
    const merchants = await tx.merchant.findMany({
      where: { userId, id: { in: [sourceId, targetId] } },
      select: { id: true, isActive: true },
    });
    const source = merchants.find((item) => item.id === sourceId);
    const target = merchants.find((item) => item.id === targetId);
    if (!source || !target) throw new HttpError("Estabelecimento não encontrado", 404);
    if (!target.isActive) {
      throw new HttpError("O estabelecimento de destino precisa estar ativo", 400);
    }

    const months = await tx.transaction.findMany({
      where: { userId, merchantId: sourceId },
      select: { year: true, month: true },
      distinct: ["year", "month"],
    });
    await assertMonthsOpen(tx, userId, months);

    const movedTransactions = (
      await tx.transaction.updateMany({
        where: { userId, merchantId: sourceId },
        data: { merchantId: targetId },
      })
    ).count;

    const [sourceAliases, targetAliases] = await Promise.all([
      tx.merchantAlias.findMany({ where: { userId, merchantId: sourceId } }),
      tx.merchantAlias.findMany({
        where: { userId, merchantId: targetId },
        select: { operator: true, normalizedPattern: true },
      }),
    ]);
    const taken = new Set(targetAliases.map((alias) => `${alias.operator}:${alias.normalizedPattern}`));
    const movable = sourceAliases.filter((alias) => !taken.has(`${alias.operator}:${alias.normalizedPattern}`));

    if (movable.length > 0) {
      await tx.merchantAlias.updateMany({
        where: { userId, id: { in: movable.map((alias) => alias.id) } },
        data: { merchantId: targetId },
      });
      await tx.merchantAliasEvent.createMany({
        data: movable.map((alias) => ({
          action: "REASSIGNED",
          aliasId: alias.id,
          sourceMerchantId: sourceId,
          targetMerchantId: targetId,
          operator: alias.operator,
          pattern: alias.pattern,
          normalizedPattern: alias.normalizedPattern,
          userId,
        })),
      });
    }

    // Os aliases descartados saem junto com a origem (cascata); os movidos já estão no destino.
    await tx.merchant.delete({ where: { id: sourceId } });

    return {
      targetId,
      movedTransactions,
      movedAliases: movable.length,
      discardedAliases: sourceAliases.length - movable.length,
    };
  });
}

export async function mergeMerchant(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) throw new HttpError("Estabelecimento não encontrado", 404);
    const { id } = await context.params;
    const { targetId } = mergeMerchantBodySchema.parse(await parseJsonBody(request));
    return success(await mergeMerchantsForUser(userId, id, targetId), "Estabelecimentos mesclados");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao mesclar estabelecimentos",
      zodMessage: "Dados inválidos",
    });
  }
}
