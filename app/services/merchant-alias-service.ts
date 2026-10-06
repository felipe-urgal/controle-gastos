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

type AliasListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  merchantId?: string;
  merchantSearch?: string;
};

type AliasListData = {
  items: MerchantAliasDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const merchantAliasService = {
  getAll(params: AliasListParams = {}) {
    const queryParams: Record<string, string | number> = {};
    if (params.page !== undefined) queryParams.page = params.page;
    if (params.pageSize !== undefined) queryParams.pageSize = params.pageSize;
    if (params.search) queryParams.search = params.search;
    if (params.merchantId) queryParams.merchantId = params.merchantId;
    if (params.merchantSearch) {
      queryParams.merchantSearch = params.merchantSearch;
    }

    return apiClient<ApiEnvelope<AliasListData>>("/api/merchant-aliases", {
      queryParams,
    });
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
  update(id: string, input: AliasInput) {
    return apiClient<ApiEnvelope<MerchantAliasDTO>, AliasInput>(
      `/api/merchant-aliases/${id}`,
      {
        method: "PUT",
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
