import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { getFinancialCommitmentsForUser } from '@/app/lib/commitments/financial-commitments';
import { HttpError } from '@/app/lib/http-error';
import { isSupportedCurrency } from '@/app/types/financial-summary';

const ALLOWED_DAYS = new Set([7, 30, 60, 90]);

export async function getFinancialCommitments(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const params = new URL(request.url).searchParams;
    const currency = params.get('currency') ?? 'BRL';
    const days = Number(params.get('days') ?? '30');

    if (!isSupportedCurrency(currency)) {
      throw new HttpError('Moeda inválida', 400, 'INVALID_CURRENCY');
    }
    if (!ALLOWED_DAYS.has(days)) {
      throw new HttpError('Horizonte inválido', 400, 'INVALID_COMMITMENT_HORIZON');
    }

    return success(
      await getFinancialCommitmentsForUser(
        userId,
        { currency, days: days as 7 | 30 | 60 | 90 },
      ),
    );
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar compromissos financeiros',
    });
  }
}
