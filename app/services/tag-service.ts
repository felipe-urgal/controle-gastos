import { apiClient } from "@/app/services/api-client";
import { ApiResponse, createBaseService } from "@/app/services/base-service";
import type { TagDTO, TagReport } from "@/app/types/tag";

const baseTagService = createBaseService<TagDTO>("tags");

export const tagService = {
  ...baseTagService,

  async report(id: string): Promise<ApiResponse<TagReport>> {
    return apiClient<ApiResponse<TagReport>>(`/api/tags/${id}/report`, { method: "GET" });
  },
};
