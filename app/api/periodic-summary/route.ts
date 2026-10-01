import { failure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { getPeriodicSummaryStateForUser } from '@/app/lib/periodic-summary/periodic-summary';
import { isSupportedCurrency } from '@/app/types/financial-summary';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const currency = new URL(request.url).searchParams.get('currency') ?? 'BRL';

    if (!isSupportedCurrency(currency)) {
      return failure('Moeda inválida', 400, 'INVALID_CURRENCY');
    }

    return success(await getPeriodicSummaryStateForUser(userId, currency));
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401, 'UNAUTHORIZED');
    }
    return failure('Erro ao carregar resumo financeiro periódico', 500);
  }
}
