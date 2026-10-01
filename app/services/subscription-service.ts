import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type {
  ReviewSubscriptionInput,
  SubscriptionReviewStatus,
  SubscriptionsData,
} from '@/app/types/subscription';

export const subscriptionService = {
  async get(): Promise<ApiResponse<SubscriptionsData>> {
    return apiClient('/api/subscriptions', { method: 'GET' });
  },

  async review(
    id: string,
    data: ReviewSubscriptionInput,
  ): Promise<ApiResponse<{ patternId: string; status: SubscriptionReviewStatus }>> {
    return apiClient<
      ApiResponse<{ patternId: string; status: SubscriptionReviewStatus }>,
      ReviewSubscriptionInput
    >(`/api/subscriptions/${id}/review`, { method: 'PATCH', body: data });
  },

  async createRecurrence(
    id: string,
  ): Promise<ApiResponse<{ seriesId: string; occurrenceCount: number }>> {
    return apiClient(`/api/subscriptions/${id}/recurrence`, { method: 'POST' });
  },
};
