import type { Merchant } from "@prisma/client";

type MerchantWithCount = Merchant & {
  _count?: { transactions: number; aliases: number };
};

export function toMerchantDTO(merchant: MerchantWithCount) {
  return {
    id: merchant.id,
    name: merchant.name,
    isActive: merchant.isActive,
    transactionsCount: merchant._count?.transactions ?? 0,
    aliasesCount: merchant._count?.aliases ?? 0,
    createdAt: merchant.createdAt.toISOString(),
    updatedAt: merchant.updatedAt.toISOString(),
  };
}
