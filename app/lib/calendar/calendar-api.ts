import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { getCalendarForUser } from '@/app/lib/calendar/calendar-read-model';
import { calendarQuerySchema } from '@/app/lib/calendar/calendar-schema';

export async function getCalendar(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = parseQuery(request, calendarQuerySchema);
    return success(await getCalendarForUser(userId, input));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar calendário financeiro',
    });
  }
}
