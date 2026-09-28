import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { RecurrencesData } from '@/app/types/recurrence';

export const recurrenceService = {
  async get(): Promise<ApiResponse<RecurrencesData>> {
    return apiClient('/api/recurrences', { method: 'GET' });
  },
};
