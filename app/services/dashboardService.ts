import { apiClient } from "./apiClient";
import { DashboardResponse, GetDashboardParams } from '@/app/types/dashboard'

export const dashboardService = {
  async getDashboards(userId: string, { month = "", year = "" }: GetDashboardParams = {}): Promise<DashboardResponse> {
    return apiClient<DashboardResponse>(`/api/dashboard`, { method: "GET", queryParams: { userId, month, year }});
  },
};