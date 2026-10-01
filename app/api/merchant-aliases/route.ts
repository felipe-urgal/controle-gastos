import { createMerchantAlias, listMerchantAliases } from "@/app/lib/merchants/merchant-alias-crud";

export const GET = listMerchantAliases;
export const POST = createMerchantAlias;
