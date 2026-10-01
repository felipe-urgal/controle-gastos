import { failure, success } from '@/app/lib/api-response';
import { runPeriodicSummaryCron } from '@/app/lib/periodic-summary/periodic-summary';

export const maxDuration = 60;

export function isPeriodicSummaryCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
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
