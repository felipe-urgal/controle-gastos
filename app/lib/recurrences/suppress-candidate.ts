import { failure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { findDetectedRecurrenceCandidateForUser } from '@/app/lib/recurrences/detected-candidates';
import { prisma } from '@/app/lib/prisma';

export async function suppressRecurrenceCandidate(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    const candidate = await findDetectedRecurrenceCandidateForUser(userId, id);

    if (!candidate) {
      return failure('Candidato não encontrado', 404);
    }

    const review = await prisma.recurrencePatternReview.upsert({
      where: {
        userId_patternId: {
          userId,
          patternId: candidate.id,
        },
      },
      create: {
        userId,
        patternId: candidate.id,
        signature: candidate.signature,
        status: 'SUPPRESSED',
      },
      update: {
        signature: candidate.signature,
        status: 'SUPPRESSED',
        seriesId: null,
      },
      select: {
        patternId: true,
        status: true,
      },
    });

    return success(review, 'Padrão removido das sugestões');
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    return failure('Não foi possível ocultar o padrão', 500);
  }
}
