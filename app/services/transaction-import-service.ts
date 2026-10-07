import {
  ApiClientError,
  apiClient,
} from "@/app/services/api-client";
import type {
  TransactionImportApiEnvelope,
  TransactionImportConfirmData,
  TransactionImportConfirmInput,
  TransactionImportPreviewData,
} from "@/app/types/transaction-import";

function withRetryAfter(error: unknown, fallback: string) {
  if (!(error instanceof ApiClientError)) {
    return error instanceof Error ? error : new Error(fallback);
  }

  const suffix = error.retryAfterSeconds
    ? `. Tente novamente em ${error.retryAfterSeconds}s.`
    : "";

  return new ApiClientError(
    `${error.message}${suffix}`,
    error.status,
    error.code,
    error.retryAfterSeconds,
  );
}

export const transactionImportService = {
  async preview(formData: FormData) {
    try {
      return await apiClient<
        TransactionImportApiEnvelope<TransactionImportPreviewData>,
        FormData
      >("/api/transactions/import/preview", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      throw withRetryAfter(error, "Falha ao gerar preview.");
    }
  },

  async confirm(input: TransactionImportConfirmInput) {
    try {
      return await apiClient<
        TransactionImportApiEnvelope<TransactionImportConfirmData>,
        TransactionImportConfirmInput
      >("/api/transactions/import/confirm", {
        method: "POST",
        body: input,
      });
    } catch (error) {
      throw withRetryAfter(error, "Falha ao confirmar importação.");
    }
  },
};
