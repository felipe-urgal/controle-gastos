import { z } from "zod";

import { createMerchantAliasSchema } from "@/app/lib/merchants/merchant-alias-schema";

export const previewMerchantAliasSchema = createMerchantAliasSchema.extend({
  aliasId: z.uuid().optional(),
  description: z.string().trim().max(255).optional(),
});
