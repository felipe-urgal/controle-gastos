import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type {
  NotificationDTO,
  NotificationListData,
  NotificationPreferenceDTO,
} from '@/app/types/notification';

export type NotificationPreferenceInput = Pick<NotificationPreferenceDTO, 'type' | 'inApp' | 'email' | 'push'>;

export const notificationService = {
  async list(
    params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<NotificationListData>> {
    return apiClient<ApiResponse<NotificationListData>>('/api/notifications', {
      method: 'GET',
      queryParams: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        unreadOnly: params.unreadOnly ?? false,
      },
      signal,
    });
  },

  /** Só o contador do sino: uma página de 1 item já traz `unreadCount`. */
  async unreadCount(signal?: AbortSignal): Promise<number> {
    const response = await apiClient<ApiResponse<NotificationListData>>('/api/notifications', {
      method: 'GET',
      queryParams: { page: 1, pageSize: 1 },
      signal,
    });
    return response.data.unreadCount;
  },

  async markRead(id: string): Promise<ApiResponse<NotificationDTO>> {
    return apiClient<ApiResponse<NotificationDTO>>(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllRead(): Promise<ApiResponse<{ updated: number }>> {
    return apiClient<ApiResponse<{ updated: number }>>('/api/notifications/read-all', { method: 'POST' });
  },

  async dismiss(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient<ApiResponse<{ id: string }>>(`/api/notifications/${id}`, { method: 'DELETE' });
  },

  async getPreferences(): Promise<ApiResponse<{ preferences: NotificationPreferenceDTO[] }>> {
    return apiClient<ApiResponse<{ preferences: NotificationPreferenceDTO[] }>>('/api/notification-preferences', {
      method: 'GET',
    });
  },

  async savePreferences(
    preferences: NotificationPreferenceInput[],
  ): Promise<ApiResponse<{ preferences: NotificationPreferenceDTO[] }>> {
    return apiClient<ApiResponse<{ preferences: NotificationPreferenceDTO[] }>>('/api/notification-preferences', {
      method: 'PUT',
      body: { preferences },
    });
  },
};
