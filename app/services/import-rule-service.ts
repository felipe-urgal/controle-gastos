import { createBaseService } from "@/app/services/base-service";
import type {
  ImportRuleListResponse,
  ImportRuleModel,
} from "@/app/types/import-rule";

export const importRuleService = createBaseService<
  ImportRuleModel,
  ImportRuleListResponse
>("import-rules");
