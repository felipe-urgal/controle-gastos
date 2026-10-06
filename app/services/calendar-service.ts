import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { CalendarReadModel } from '@/app/types/calendar';

export const calendarService = {
  get(
    input: { year: number; month: number; accountId?: string },
    signal?: AbortSignal,
  ) {
    return apiClient<ApiResponse<CalendarReadModel>>('/api/calendar', {
      queryParams: input,
      signal,
    });
  },
};
