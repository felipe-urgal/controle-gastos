import { apiClient } from "@/app/services/api-client";
import { createBaseService } from "@/app/services/base-service";
import type { ImportRuleRelationship } from "@/app/lib/import-rules/import-rule-guards";
import type {
  ImportRuleInput,
  ImportRuleListResponse,
  ImportRuleModel,
} from "@/app/types/import-rule";

const baseImportRuleService = createBaseService<
  ImportRuleModel,
  ImportRuleListResponse
>("import-rules");

export const importRuleService = {
  ...baseImportRuleService,
  async impact(input: ImportRuleInput, excludeRuleId?: string) {
    return apiClient<{
      success: boolean;
      data: { relationships: ImportRuleRelationship[] };
      message?: string;
    }, ImportRuleInput>("/api/import-rules/impact", {
      method: "POST",
      queryParams: excludeRuleId ? { excludeRuleId } : undefined,
      body: input,
    });
  },
  async renumber() {
    return apiClient<{
      success: boolean;
      data: { updated: number; nextPriority: number };
      message?: string;
    }>("/api/import-rules/renumber", { method: "POST" });
  },
};
