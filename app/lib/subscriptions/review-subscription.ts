import { z, ZodError } from 'zod';

import { failure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { parseJsonBody } from '@/app/lib/api/request-json';
import { prisma } from '@/app/lib/prisma';
import { getDetectedSubscriptionsForUser } from '@/app/lib/subscriptions/subscriptions';

const reviewSubscriptionSchema = z.object({
  status: z.enum(['CONFIRMED', 'REJECTED', 'IGNORED']),
});

export async function reviewSubscription(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    const input = reviewSubscriptionSchema.parse(await parseJsonBody(request));

    const detected = await getDetectedSubscriptionsForUser(userId);
    if (!detected.some((item) => item.id === id)) {
      return failure('Assinatura não encontrada', 404);
    }

    const review = await prisma.subscriptionReview.upsert({
      where: {
        userId_patternId: {
          userId,
          patternId: id,
        },
      },
      create: {
        userId,
        patternId: id,
        status: input.status,
      },
      update: {
        status: input.status,
      },
      select: {
        patternId: true,
        status: true,
      },
    });

    return success(review, 'Classificação de assinatura atualizada');
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? 'Dados inválidos', 400);
    }
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    return failure('Não foi possível atualizar a assinatura', 500);
  }
}
