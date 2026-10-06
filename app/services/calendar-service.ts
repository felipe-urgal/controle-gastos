import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { CalendarReadModel } from '@/app/types/calendar';

export const calendarService = {
  get(
    input: { year: number; month: number; accountId?: string },
    signal?: AbortSignal,
  ) {
    const queryParams: Record<string, string | number | boolean> = {
      year: input.year,
      month: input.month,
    };
    if (input.accountId) {
      queryParams.accountId = input.accountId;
    }

    return apiClient<ApiResponse<CalendarReadModel>>('/api/calendar', {
      queryParams,
      signal,
    });
  },
};
