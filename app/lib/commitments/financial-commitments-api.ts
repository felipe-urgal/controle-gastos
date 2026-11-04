import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { commitmentsToIcs } from '@/app/lib/commitments/commitments-ics';
import { getFinancialCommitmentsForUser } from '@/app/lib/commitments/financial-commitments';
import { HttpError } from '@/app/lib/http-error';
import { isSupportedCurrency } from '@/app/types/financial-summary';

const ALLOWED_DAYS = new Set([7, 30, 60, 90]);

function parseCommitmentQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const currency = params.get('currency') ?? 'BRL';
  const days = Number(params.get('days') ?? '30');

  if (!isSupportedCurrency(currency)) {
    throw new HttpError('Moeda inválida', 400, 'INVALID_CURRENCY');
  }
  if (!ALLOWED_DAYS.has(days)) {
    throw new HttpError('Horizonte inválido', 400, 'INVALID_COMMITMENT_HORIZON');
  }

  return { params, input: { currency, days: days as 7 | 30 | 60 | 90 } };
}

export async function getFinancialCommitments(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { input } = parseCommitmentQuery(request);

    return success(await getFinancialCommitmentsForUser(userId, input));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar compromissos financeiros',
    });
  }
}

/** Compromissos do horizonte como arquivo .ics (eventos de dia inteiro) para importar na agenda. */
export async function exportFinancialCommitmentsIcs(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { params, input } = parseCommitmentQuery(request);
    const data = await getFinancialCommitmentsForUser(userId, input);
    const body = commitmentsToIcs(data, { showValues: params.get('values') !== '0' });

    return new Response(body, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="compromissos-${input.days}-dias.ics"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao exportar compromissos',
    });
  }
}
