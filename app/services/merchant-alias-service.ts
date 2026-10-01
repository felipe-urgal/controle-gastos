import { apiClient } from "@/app/services/api-client";
import type { MerchantAliasDTO, MerchantAliasOperator } from "@/app/types/merchant-alias";

export const merchantAliasService = {
  getAll(params?: { merchantId?: string }) {
    return apiClient.get<{ items: MerchantAliasDTO[] }>("/merchant-aliases", { params });
  },
  create(input: { merchantId: string; operator: MerchantAliasOperator; pattern: string; priority?: number }) {
    return apiClient.post<MerchantAliasDTO>("/merchant-aliases", input);
  },
  remove(id: string) {
    return apiClient.delete<{ id: string }>(`/merchant-aliases/${id}`);
  },
  test(input: { operator: MerchantAliasOperator; pattern: string; description: string }) {
    return apiClient.post<{ matches: boolean; normalizedPattern: string; normalizedDescription: string }>(
      "/merchant-aliases/test",
      input,
    );
  },
};
