import { failure, success } from '@/app/lib/api-response';
import { isCronAuthorized } from '@/app/lib/security/cron-auth';
import { runPeriodicSummaryCron } from '@/app/lib/periodic-summary/periodic-summary';

export const maxDuration = 60;

export function isPeriodicSummaryCronAuthorized(request: Request) {
  return isCronAuthorized(request);
}

export async function GET(request: Request) {
  if (!isPeriodicSummaryCronAuthorized(request)) {
    return failure('Não autorizado', 401, 'UNAUTHORIZED');
  }

  try {
    return success(await runPeriodicSummaryCron());
  } catch {
    return failure('Erro ao executar resumo financeiro periódico', 500);
  }
}
