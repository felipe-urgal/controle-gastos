import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type {
  RecurrencesData,
  UpdateRecurrenceSeriesInput,
  UpdateRecurrenceSeriesResponse,
} from '@/app/types/recurrence';

export const recurrenceService = {
  async get(): Promise<ApiResponse<RecurrencesData>> {
    return apiClient('/api/recurrences', { method: 'GET' });
  },

  async confirmCandidate(id: string): Promise<ApiResponse<{ seriesId: string; occurrenceCount: number }>> {
    return apiClient(`/api/recurrences/candidates/${id}/confirm`, { method: 'POST' });
  },

  async updateSeries(
    id: string,
    data: UpdateRecurrenceSeriesInput,
  ): Promise<ApiResponse<UpdateRecurrenceSeriesResponse>> {
    return apiClient<ApiResponse<UpdateRecurrenceSeriesResponse>, UpdateRecurrenceSeriesInput>(
      `/api/recurrences/${id}`,
      { method: 'PATCH', body: data },
    );
  },
};
