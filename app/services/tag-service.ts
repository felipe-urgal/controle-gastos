import { apiClient } from "@/app/services/api-client";
import { ApiResponse, createBaseService } from "@/app/services/base-service";
import type { TagDTO, TagReport } from "@/app/types/tag";

export type TagListResponse = {
  items: TagDTO[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

const baseTagService = createBaseService<TagDTO, TagListResponse>("tags");

export const tagService = {
  ...baseTagService,

  async getActiveOptions(search?: string, limit = 20) {
    return baseTagService.getAll({
      isActive: "true",
      search: search?.trim() || undefined,
      limit,
    });
  },

  async report(id: string): Promise<ApiResponse<TagReport>> {
    return apiClient<ApiResponse<TagReport>>(`/api/tags/${id}/report`, { method: "GET" });
  },
};
