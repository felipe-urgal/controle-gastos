import type { Merchant } from "@prisma/client";

import type { MerchantActivity, MerchantSpend } from "@/app/types/merchant";

type MerchantWithCount = Merchant & {
  _count?: { transactions: number; aliases: number };
  monthSpend?: MerchantSpend[];
  activity?: MerchantActivity;
};

export function toMerchantDTO(merchant: MerchantWithCount) {
  return {
    id: merchant.id,
    name: merchant.name,
    isActive: merchant.isActive,
    transactionsCount: merchant._count?.transactions ?? 0,
    aliasesCount: merchant._count?.aliases ?? 0,
    monthSpend: merchant.monthSpend,
    activity: merchant.activity ?? null,
    createdAt: merchant.createdAt.toISOString(),
    updatedAt: merchant.updatedAt.toISOString(),
  };
}
