import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { GlobalSearchData } from '@/app/types/global-search';

export const globalSearchService = {
  async search(query: string, signal?: AbortSignal): Promise<ApiResponse<GlobalSearchData>> {
    return apiClient('/api/search', {
      method: 'GET',
      queryParams: { q: query },
      signal,
    });
  },
};
