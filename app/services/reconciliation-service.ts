import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  ReconciliationConfirmation,
  ReconciliationInput,
  ReconciliationPreview,
  ReconciliationStatus,
  ReconciliationUndoResult,
} from "@/app/types/reconciliation";

export const reconciliationService = {
  async preview(
    accountId: string,
    input: ReconciliationInput,
  ): Promise<ApiResponse<ReconciliationPreview>> {
    return apiClient<ApiResponse<ReconciliationPreview>>(
      `/api/accounts/${accountId}/reconciliation`,
      {
        method: "GET",
        queryParams: input,
      },
    );
  },

  async confirm(
    accountId: string,
    input: ReconciliationInput,
  ): Promise<ApiResponse<ReconciliationConfirmation>> {
    return apiClient<ApiResponse<ReconciliationConfirmation>, ReconciliationInput>(
      `/api/accounts/${accountId}/reconciliation`,
      {
        method: "POST",
        body: input,
      },
    );
  },

  async updateTransaction(
    transactionId: string,
    status: Extract<ReconciliationStatus, "UNCLEARED" | "CLEARED">,
  ): Promise<ApiResponse<{ id: string; reconciliationStatus: ReconciliationStatus; reconciledAt: null }>> {
    return apiClient<
      ApiResponse<{ id: string; reconciliationStatus: ReconciliationStatus; reconciledAt: null }>,
      { status: Extract<ReconciliationStatus, "UNCLEARED" | "CLEARED"> }
    >(`/api/transactions/${transactionId}/reconciliation`, {
      method: "PATCH",
      body: { status },
    });
  },

  async undo(
    accountId: string,
    reconciledAt: string,
  ): Promise<ApiResponse<ReconciliationUndoResult>> {
    return apiClient<ApiResponse<ReconciliationUndoResult>, { reconciledAt: string }>(
      `/api/accounts/${accountId}/reconciliation/undo`,
      {
        method: "POST",
        body: { reconciledAt },
      },
    );
  },
};
