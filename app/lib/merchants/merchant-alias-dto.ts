import type { MerchantAlias } from "@prisma/client";

export function toMerchantAliasDTO(
  alias: MerchantAlias & { merchant: { id: string; name: string; isActive: boolean } },
) {
  return {
    id: alias.id,
    pattern: alias.pattern,
    operator: alias.operator,
    priority: alias.priority,
    merchant: alias.merchant,
    createdAt: alias.createdAt.toISOString(),
    updatedAt: alias.updatedAt.toISOString(),
  };
}
