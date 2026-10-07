import { apiClient } from "@/app/services/api-client";
import { createBaseService } from "@/app/services/base-service";
import type {
  ImportRuleListResponse,
  ImportRuleModel,
} from "@/app/types/import-rule";

const baseImportRuleService = createBaseService<
  ImportRuleModel,
  ImportRuleListResponse
>("import-rules");

export const importRuleService = {
  ...baseImportRuleService,
  async renumber() {
    return apiClient<{
      success: boolean;
      data: { updated: number; nextPriority: number };
      message?: string;
    }>("/api/import-rules/renumber", { method: "POST" });
  },
};
