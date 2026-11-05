import { apiClient } from "@/app/services/api-client";
import { ApiResponse, createBaseService } from "@/app/services/base-service";
import {
  CreateFlexibleRecurringTransactionInput,
  CreateFlexibleRecurringTransactionResponse,
  CreateInstallmentTransactionInput,
  CreateInstallmentTransactionResponse,
  CreateMonthlyRecurringTransactionInput,
  CreateMonthlyRecurringTransactionResponse,
  TransactionDTO,
} from "@/app/types/transaction";
import type { CurrencyFinancialSummary } from "@/app/types/financial-summary";
import type { QuickEntrySuggestion } from "@/app/lib/transactions/quick-entry-suggestion";

export type TransactionListResponse = {
  items: TransactionDTO[];
  summary: CurrencyFinancialSummary[];
};

export type TransactionStatusValue = "COMPLETED" | "PENDING" | "CANCELLED";

export type TransactionCompletionResponse = {
  id: string;
  status: "COMPLETED";
};

const baseTransactionService = createBaseService<TransactionDTO, TransactionListResponse>("transactions");

export type ClearPeriodPreview = {
  deletable: number;
  breakdown: { normal: number; transfers: number; cardPayments: number; reconciled: number };
  kept: { openingBalance: number };
};

export type ClearPeriodResult = {
  deleted: number;
  breakdown: ClearPeriodPreview["breakdown"];
  kept: ClearPeriodPreview["kept"];
};

export type BackupRestoreSummary = {
  period: { from: string; to: string };
  transactions: { toRestore: number; alreadyPresent: number };
  transfers: { toRestore: number; alreadyPresent: number };
  cardPayments: { toRestore: number; alreadyPresent: number };
  openingBalanceSkipped: number;
  willCreate: { accounts: string[]; categories: string[]; merchants: number; tags: number };
  renamedAccounts: Array<{ from: string; to: string }>;
  problems: string[];
};

export type TransactionAttachmentMeta = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type TransactionAttachmentList = {
  items: TransactionAttachmentMeta[];
  limits: { maxBytes: number; maxPerTransaction: number };
};

export const transactionService = {
  ...baseTransactionService,

  async createIdempotent<TBody>(
    data: TBody,
    idempotencyKey: string,
  ): Promise<ApiResponse<TransactionDTO>> {
    return apiClient<ApiResponse<TransactionDTO>, TBody>("/api/transactions", {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
    });
  },

  /** Conta, categoria e estabelecimento sugeridos para uma frase de lançamento rápido (só leitura). */
  async quickEntrySuggestion(
    description: string,
    type: "EXPENSE" | "INCOME",
  ): Promise<ApiResponse<QuickEntrySuggestion>> {
    return apiClient<ApiResponse<QuickEntrySuggestion>>("/api/transactions/quick-entry", {
      method: "GET",
      queryParams: { description, type },
    });
  },

  /** Comprovantes de um lançamento (só metadados). */
  async listAttachments(id: string): Promise<ApiResponse<TransactionAttachmentList>> {
    return apiClient<ApiResponse<TransactionAttachmentList>>(`/api/transactions/${id}/attachments`, { method: "GET" });
  },

  async uploadAttachment(id: string, file: File): Promise<ApiResponse<TransactionAttachmentMeta>> {
    const form = new FormData();
    form.set("file", file);
    return apiClient<ApiResponse<TransactionAttachmentMeta>, FormData>(`/api/transactions/${id}/attachments`, {
      method: "POST",
      body: form,
    });
  },

  async deleteAttachment(id: string, attachmentId: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient<ApiResponse<{ id: string }>>(`/api/transactions/${id}/attachments/${attachmentId}`, { method: "DELETE" });
  },

  /** Troca categoria e/ou estabelecimento (`null` remove) de várias transações; tudo ou nada. */
  async bulkUpdate(
    ids: string[],
    changes: { categoryId?: string; merchantId?: string | null },
  ): Promise<ApiResponse<{ updated: number }>> {
    return apiClient<ApiResponse<{ updated: number }>, { ids: string[]; changes: typeof changes }>(
      "/api/transactions/bulk",
      { method: "PATCH", body: { ids, changes } },
    );
  },

  /** Troca só o status (concluída, pendente ou cancelada) de um lançamento normal. */
  async updateStatus(
    id: string,
    status: TransactionStatusValue,
  ): Promise<ApiResponse<{ id: string; status: TransactionStatusValue }>> {
    return apiClient<ApiResponse<{ id: string; status: TransactionStatusValue }>, { status: TransactionStatusValue }>(
      `/api/transactions/${id}/status`,
      { method: "PATCH", body: { status } },
    );
  },

  async complete(id: string): Promise<ApiResponse<TransactionCompletionResponse>> {
    return apiClient<ApiResponse<TransactionCompletionResponse>>(`/api/transactions/${id}/complete`, {
      method: "POST",
    });
  },

  async createMonthlyRecurring(
    data: CreateMonthlyRecurringTransactionInput
  ): Promise<ApiResponse<CreateMonthlyRecurringTransactionResponse>> {
    return apiClient<
      ApiResponse<CreateMonthlyRecurringTransactionResponse>,
      CreateMonthlyRecurringTransactionInput
    >("/api/transactions/recurring", {
      method: "POST",
      body: data,
    });
  },

  async createFlexibleRecurring(
    data: CreateFlexibleRecurringTransactionInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<CreateFlexibleRecurringTransactionResponse>> {
    return apiClient<
      ApiResponse<CreateFlexibleRecurringTransactionResponse>,
      CreateFlexibleRecurringTransactionInput
    >("/api/transactions/recurring/flexible", {
      method: "POST",
      body: data,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  },

  async createInstallments(
    data: CreateInstallmentTransactionInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<CreateInstallmentTransactionResponse>> {
    return apiClient<
      ApiResponse<CreateInstallmentTransactionResponse>,
      CreateInstallmentTransactionInput
    >("/api/transactions/installments", {
      method: "POST",
      body: data,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  },

  async previewClearPeriod(query: {
    from: string;
    to: string;
    accountId?: string;
  }): Promise<ApiResponse<ClearPeriodPreview>> {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.accountId) params.set("accountId", query.accountId);
    return apiClient<ApiResponse<ClearPeriodPreview>>(`/api/transactions/period?${params}`, {
      method: "GET",
    });
  },

  async clearPeriod(data: {
    from: string;
    to: string;
    accountId?: string;
    expectedCount: number;
  }): Promise<ApiResponse<ClearPeriodResult>> {
    return apiClient<ApiResponse<ClearPeriodResult>, typeof data>("/api/transactions/period", {
      method: "DELETE",
      body: data,
    });
  },

  /** Baixa o ZIP do período com o backup JSON (restaurável) e o CSV (planilha). */
  async downloadBackup(query: { from: string; to: string; accountId?: string }): Promise<void> {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.accountId) params.set("accountId", query.accountId);

    const response = await fetch(`/api/transactions/backup?${params}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      let message = "Não foi possível exportar o backup.";
      try {
        message = (await response.json())?.error?.message ?? message;
      } catch {
        // mantém a mensagem genérica quando a resposta não é JSON
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `backup-transacoes-${query.from}_a_${query.to}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  },

  async previewBackup(backup: unknown): Promise<ApiResponse<BackupRestoreSummary>> {
    return apiClient<ApiResponse<BackupRestoreSummary>, unknown>("/api/transactions/backup/preview", {
      method: "POST",
      body: backup,
    });
  },

  async restoreBackup(backup: unknown): Promise<ApiResponse<BackupRestoreSummary>> {
    return apiClient<ApiResponse<BackupRestoreSummary>, unknown>("/api/transactions/backup/restore", {
      method: "POST",
      body: backup,
    });
  },
};
