import { z, ZodError } from 'zod';

import { parseJsonBody } from '@/app/lib/api/request-json';
import { failure, rateLimitFailure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { assertCardPurchaseStatementMutable } from '@/app/lib/cards/credit-card-purchase-guards';
import { HttpError, isHttpError } from '@/app/lib/http-error';
import { prisma } from '@/app/lib/prisma';
import { consumeTransactionMutationRateLimit } from '@/app/lib/security/application-rate-limit';

export const updateRecurrenceSeriesSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, 'Descrição deve ter pelo menos 2 caracteres')
    .max(100, 'Descrição não pode exceder 100 caracteres'),
  amount: z
    .number()
    .int('Valor deve usar centavos inteiros')
    .positive('Valor deve ser maior que zero')
    .max(1_000_000_000, 'Valor não pode exceder 1.000.000.000'),
});

export async function updateRecurrenceSeriesForUser(
  userId: string,
  id: string,
  input: z.infer<typeof updateRecurrenceSeriesSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const series = await tx.transactionSeries.findFirst({
      where: { id, userId, type: 'RECURRING' },
      select: { id: true },
    });
    if (!series) throw new HttpError('Recorrência não encontrada', 404);

    const pending = await tx.transaction.findMany({
      where: {
        seriesId: id,
        userId,
        status: 'PENDING',
        kind: 'NORMAL',
      },
      select: {
        id: true,
        year: true,
        month: true,
        day: true,
        account: {
          select: {
            id: true,
            type: true,
            statementClosingDay: true,
            statementDueDay: true,
          },
        },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }, { day: 'asc' }],
    });

    if (pending.length === 0) {
      throw new HttpError('Recorrência não possui ocorrências pendentes', 409);
    }

    for (const transaction of pending) {
      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        transaction.account,
        {
          year: transaction.year,
          month: transaction.month,
          day: transaction.day,
        },
      );
    }

    await tx.transactionSeries.update({
      where: { id },
      data: { description: input.description },
    });

    const updated = await tx.transaction.updateMany({
      where: {
        seriesId: id,
        userId,
        status: 'PENDING',
        kind: 'NORMAL',
      },
      data: {
        description: input.description,
        amount: input.amount,
      },
    });

    return {
      id,
      description: input.description,
      amount: input.amount,
      updatedPendingCount: updated.count,
    };
  });
}

export async function updateRecurrenceSeries(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        'Muitas alterações financeiras em pouco tempo. Tente novamente em instantes',
        limit.retryAfterSeconds,
        'TRANSACTION_RATE_LIMITED',
      );
    }

    const { id } = await context.params;
    const input = updateRecurrenceSeriesSchema.parse(await parseJsonBody(request));
    const result = await updateRecurrenceSeriesForUser(userId, id, input);
    return success(result, 'Recorrência atualizada com sucesso');
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return failure('Não autenticado', 401);
    }
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? 'Dados inválidos', 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure('Não foi possível atualizar a recorrência', 500);
  }
}
