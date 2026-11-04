import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';

export const pushService = {
  async getConfig(): Promise<ApiResponse<{ configured: boolean; publicKey: string | null }>> {
    return apiClient<ApiResponse<{ configured: boolean; publicKey: string | null }>>('/api/push/public-key', {
      method: 'GET',
    });
  },

  async subscribe(subscription: PushSubscriptionJSON): Promise<ApiResponse<{ subscribed: boolean }>> {
    return apiClient<ApiResponse<{ subscribed: boolean }>>('/api/push/subscribe', {
      method: 'POST',
      body: { endpoint: subscription.endpoint, keys: subscription.keys },
    });
  },

  async unsubscribe(endpoint: string): Promise<ApiResponse<{ subscribed: boolean }>> {
    return apiClient<ApiResponse<{ subscribed: boolean }>>('/api/push/subscribe', {
      method: 'DELETE',
      body: { endpoint },
    });
  },
};
