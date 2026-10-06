import { apiClient } from "@/app/services/api-client";
import type {
  MerchantAliasDTO,
  MerchantAliasOperator,
} from "@/app/types/merchant-alias";

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

type AliasInput = {
  merchantId: string;
  operator: MerchantAliasOperator;
  pattern: string;
  priority?: number;
};

export const merchantAliasService = {
  getAll(params?: { merchantId?: string }) {
    return apiClient<ApiEnvelope<{ items: MerchantAliasDTO[] }>>(
      "/api/merchant-aliases",
      {
        queryParams: params?.merchantId
          ? { merchantId: params.merchantId }
          : undefined,
      },
    );
  },
  create(input: AliasInput) {
    return apiClient<ApiEnvelope<MerchantAliasDTO>, AliasInput>(
      "/api/merchant-aliases",
      {
        method: "POST",
        body: input,
      },
    );
  },
  reassign(input: AliasInput) {
    return apiClient<
      ApiEnvelope<{
        alias: MerchantAliasDTO;
        reclassified: boolean;
        mergedCount: number;
      }>,
      AliasInput
    >("/api/merchant-aliases/reassign", {
      method: "PUT",
      body: input,
    });
  },
  remove(id: string) {
    return apiClient<ApiEnvelope<{ id: string }>>(
      `/api/merchant-aliases/${id}`,
      {
        method: "DELETE",
      },
    );
  },
  match(description: string) {
    return apiClient<
      ApiEnvelope<{
        matchedAliasId: string | null;
        merchantId: string | null;
        merchantName: string | null;
        conflict: boolean;
      }>,
      { description: string }
    >("/api/merchant-aliases/match", {
      method: "POST",
      body: { description },
    });
  },
  test(input: {
    operator: MerchantAliasOperator;
    pattern: string;
    description: string;
  }) {
    return apiClient<
      ApiEnvelope<{
        matches: boolean;
        normalizedPattern: string;
        normalizedDescription: string;
      }>,
      typeof input
    >("/api/merchant-aliases/test", {
      method: "POST",
      body: input,
    });
  },
};
