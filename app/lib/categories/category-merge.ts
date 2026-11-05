import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError } from "@/app/lib/http-error";
import { assertMonthsOpen } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";

const mergeCategoryBodySchema = z.object({
  targetId: z.string().uuid("Categoria de destino inválida"),
});

export type CategoryMergeResult = {
  targetId: string;
  movedTransactions: number;
  movedAllocations: number;
  movedTemplates: number;
  movedImportRules: number;
  movedLimits: number;
  discardedLimits: number;
};

/**
 * Move tudo da categoria de origem para a de destino e apaga a origem.
 * - Mesmo dono e mesmo tipo (receita/despesa); o destino precisa estar ativo.
 * - Mês travado bloqueia (as transações movidas mudam de categoria).
 * - Divisão da mesma transação nas duas categorias vira uma só, somando os valores.
 * - Limite mensal em conflito: vale o do destino; o da origem é descartado.
 */
export async function mergeCategoriesForUser(
  userId: string,
  sourceId: string,
  targetId: string,
): Promise<CategoryMergeResult> {
  if (sourceId === targetId) {
    throw new HttpError("Escolha uma categoria diferente para mesclar", 400);
  }

  return prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({
      where: { userId, id: { in: [sourceId, targetId] } },
      select: { id: true, type: true, isActive: true },
    });
    const source = categories.find((item) => item.id === sourceId);
    const target = categories.find((item) => item.id === targetId);
    if (!source || !target) throw new HttpError("Categoria não encontrada", 404);
    if (source.type !== target.type) {
      throw new HttpError("Só é possível mesclar categorias do mesmo tipo", 400);
    }
    if (!target.isActive) {
      throw new HttpError("A categoria de destino precisa estar ativa", 400);
    }

    const allocations = await tx.transactionAllocation.findMany({
      where: { userId, categoryId: sourceId },
      select: { id: true, transactionId: true, amount: true },
    });
    const allocatedTransactions = await tx.transaction.findMany({
      where: { userId, id: { in: allocations.map((item) => item.transactionId) } },
      select: { year: true, month: true },
      distinct: ["year", "month"],
    });
    const directTransactions = await tx.transaction.findMany({
      where: { userId, categoryId: sourceId },
      select: { year: true, month: true },
      distinct: ["year", "month"],
    });
    await assertMonthsOpen(tx, userId, [...directTransactions, ...allocatedTransactions]);

    const movedTransactions = (
      await tx.transaction.updateMany({
        where: { userId, categoryId: sourceId },
        data: { categoryId: targetId },
      })
    ).count;

    // Divisões: se a transação já tem divisão no destino, soma na dela e remove a da origem.
    const existingOnTarget = await tx.transactionAllocation.findMany({
      where: {
        userId,
        categoryId: targetId,
        transactionId: { in: allocations.map((item) => item.transactionId) },
      },
      select: { id: true, transactionId: true },
    });
    const targetByTransaction = new Map(existingOnTarget.map((item) => [item.transactionId, item.id]));
    for (const allocation of allocations) {
      const targetAllocationId = targetByTransaction.get(allocation.transactionId);
      if (targetAllocationId) {
        await tx.transactionAllocation.update({
          where: { id: targetAllocationId },
          data: { amount: { increment: allocation.amount } },
        });
        await tx.transactionAllocation.delete({ where: { id: allocation.id } });
      } else {
        await tx.transactionAllocation.update({
          where: { id: allocation.id },
          data: { categoryId: targetId },
        });
      }
    }

    const movedTemplates = (
      await tx.transactionTemplate.updateMany({
        where: { userId, categoryId: sourceId },
        data: { categoryId: targetId },
      })
    ).count;
    const movedImportRules = (
      await tx.transactionImportRule.updateMany({
        where: { userId, categoryId: sourceId },
        data: { categoryId: targetId },
      })
    ).count;

    const sourceLimits = await tx.categoryMonthlyLimit.findMany({
      where: { userId, categoryId: sourceId },
      select: { id: true, year: true, month: true, currency: true },
    });
    const targetLimits = await tx.categoryMonthlyLimit.findMany({
      where: { userId, categoryId: targetId },
      select: { year: true, month: true, currency: true },
    });
    const taken = new Set(targetLimits.map((item) => `${item.year}-${item.month}-${item.currency}`));
    const conflicting = sourceLimits.filter((item) => taken.has(`${item.year}-${item.month}-${item.currency}`));
    const movable = sourceLimits.filter((item) => !taken.has(`${item.year}-${item.month}-${item.currency}`));
    if (conflicting.length > 0) {
      await tx.categoryMonthlyLimit.deleteMany({
        where: { userId, id: { in: conflicting.map((item) => item.id) } },
      });
    }
    if (movable.length > 0) {
      await tx.categoryMonthlyLimit.updateMany({
        where: { userId, id: { in: movable.map((item) => item.id) } },
        data: { categoryId: targetId },
      });
    }

    await tx.category.delete({ where: { id: sourceId } });

    return {
      targetId,
      movedTransactions,
      movedAllocations: allocations.length,
      movedTemplates,
      movedImportRules,
      movedLimits: movable.length,
      discardedLimits: conflicting.length,
    };
  });
}

export async function mergeCategory(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) throw new HttpError("Categoria não encontrada", 404);
    const { id } = await context.params;
    const { targetId } = mergeCategoryBodySchema.parse(await parseJsonBody(request));
    return success(await mergeCategoriesForUser(userId, id, targetId), "Categorias mescladas");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao mesclar categorias",
      zodMessage: "Dados inválidos",
    });
  }
}
