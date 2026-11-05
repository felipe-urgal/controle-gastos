import { z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { assertCardPurchaseStatementMutable } from "@/app/lib/cards/credit-card-purchase-guards";
import { getOwnedActiveCategoryOrThrow } from "@/app/lib/categories/category-ownership";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { getOwnedActiveMerchantOrThrow } from "@/app/lib/merchants/merchant-ownership";
import { assertMonthsOpen } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import { syncTransactionSeriesMetadata } from "@/app/lib/transactions/transaction-series-metadata";

export const MAX_BULK_TRANSACTIONS = 100;

export const bulkUpdateTransactionsSchema = z
  .object({
    ids: z.array(z.string().uuid("Transação inválida")).min(1, "Selecione ao menos uma transação").max(MAX_BULK_TRANSACTIONS, `Selecione no máximo ${MAX_BULK_TRANSACTIONS} transações por vez`),
    changes: z
      .object({
        categoryId: z.string().uuid("Categoria inválida").optional(),
        /** `null` remove o estabelecimento. */
        merchantId: z.string().uuid("Estabelecimento inválido").nullable().optional(),
      })
      .strict()
      .refine((value) => Object.keys(value).length > 0, "Informe a categoria ou o estabelecimento"),
  })
  .strict();

export type BulkUpdateTransactionsInput = z.infer<typeof bulkUpdateTransactionsSchema>;

/**
 * Troca a categoria e/ou o estabelecimento de várias transações de uma vez, tudo ou nada: se uma só não puder mudar,
 * nenhuma muda e o erro diz por quê. Segue as travas da edição individual (reconciliada, fatura de cartão paga,
 * mês travado) e acrescenta duas: a categoria nova precisa ter o mesmo tipo (receita/despesa) de cada lançamento, e
 * lançamentos com divisão entre categorias não entram na troca de categoria.
 */
export async function bulkUpdateTransactionsForUser(userId: string, input: BulkUpdateTransactionsInput) {
  const ids = [...new Set(input.ids)];

  return prisma.$transaction(async (tx) => {
    const current = await tx.transaction.findMany({
      where: { id: { in: ids }, userId },
      include: { account: true, _count: { select: { allocations: true } } },
    });
    if (current.length !== ids.length) throw new HttpError("Transação não encontrada", 404);

    for (const item of current) {
      if (item.kind !== "NORMAL") {
        throw new HttpError("Transferências, pagamentos de fatura e saldo inicial não entram na edição em lote", 409, "BULK_NOT_NORMAL");
      }
      if (item.reconciliationStatus === "RECONCILED") {
        throw new HttpError("Há transação reconciliada na seleção; desfaça a reconciliação antes", 409, "BULK_RECONCILED");
      }
    }

    await assertMonthsOpen(tx, userId, current);

    const { categoryId, merchantId } = input.changes;
    if (categoryId !== undefined) {
      const category = await getOwnedActiveCategoryOrThrow(tx, userId, categoryId);
      if (current.some((item) => item.type !== category.type)) {
        throw new HttpError("A categoria precisa ser do mesmo tipo (receita ou despesa) de todas as transações selecionadas", 400, "BULK_CATEGORY_TYPE");
      }
      if (current.some((item) => item._count.allocations > 0)) {
        throw new HttpError("Há transação dividida entre categorias na seleção; edite-a individualmente", 409, "BULK_HAS_ALLOCATIONS");
      }
    }
    if (merchantId) await getOwnedActiveMerchantOrThrow(tx, userId, merchantId);

    for (const item of current) {
      await assertCardPurchaseStatementMutable(tx, userId, item.account, { year: item.year, month: item.month, day: item.day });
    }

    const result = await tx.transaction.updateMany({
      where: { id: { in: ids }, userId, kind: "NORMAL", reconciliationStatus: { not: "RECONCILED" } },
      data: {
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(merchantId !== undefined ? { merchantId } : {}),
      },
    });
    if (result.count !== ids.length) {
      throw new HttpError("A seleção mudou durante a edição; nenhuma alteração foi aplicada", 409);
    }

    for (const seriesId of new Set(current.flatMap((item) => (item.seriesId ? [item.seriesId] : [])))) {
      await syncTransactionSeriesMetadata(tx, userId, seriesId);
    }

    return { updated: result.count };
  });
}

/** `PATCH /api/transactions/bulk` */
export async function bulkUpdateTransactions(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas alterações financeiras em pouco tempo. Tente novamente em instantes",
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
    }

    const input = bulkUpdateTransactionsSchema.parse(await parseJsonBody(request));
    return success(await bulkUpdateTransactionsForUser(userId, input), "Transações atualizadas");
  } catch (error) {
    if (error instanceof z.ZodError) return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    if (isHttpError(error)) return failure(error.message, error.status, error.code);
    return failure("Erro ao atualizar as transações", 500);
  }
}
