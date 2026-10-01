import { createBaseService } from "@/app/services/base-service";
import type { MerchantDTO } from "@/app/types/merchant";

export const merchantService = createBaseService<MerchantDTO>("merchants");
