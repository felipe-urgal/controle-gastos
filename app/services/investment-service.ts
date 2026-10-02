import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentAnnualIncomeReport,
  InvestmentFiscalCostAdjustment,
  InvestmentFiscalEventType,
  InvestmentFiscalYearEndSnapshot,
  InvestmentOperation,
  InvestmentRealizedResultReport,
  InvestmentOperationType,
  InvestmentPortfolio,
  InvestmentQuoteRefreshResult,
} from "@/app/types/investment";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type InvestmentAssetInput = {
  symbol: string;
  name?: string | null;
  type: InvestmentAssetType;
  currency: SupportedCurrency;
  market?: string | null;
};

export type InvestmentImportItem =
  | {
      index: number;
      source: "CSV" | "XLSX";
      kind: "OPERATIONS";
      date: string;
      symbol: string;
      assetName: string | null;
      assetType: InvestmentAssetType;
      institution: string;
      quantity: string;
      errors: string[];
      fingerprint: string;
      duplicate: boolean;
      assetExists: boolean;
      operationType: "BUY" | "SELL";
      movement: string;
      unitPriceCents: number;
      feesCents: number;
      amountCents: number;
      rawUnitPrice: string;
    }
  | {
      index: number;
      source: "CSV" | "XLSX";
      kind: "INCOMES";
      date: string;
      symbol: string;
      assetName: string | null;
      assetType: InvestmentAssetType;
      institution: string;
      quantity: string;
      errors: string[];
      fingerprint: string;
      duplicate: boolean;
      assetExists: boolean;
      incomeType: "INCOME" | "DIVIDEND" | "INTEREST" | "OTHER";
      eventType: string;
      unitValueCents: number;
      netAmountCents: number;
    };

export type InvestmentImportPreview = {
  accountId: string;
  fileName: string;
  kind: "OPERATIONS" | "INCOMES" | null;
  previewToken: string;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    newAssets: number;
  };
  items: InvestmentImportItem[];
};

export type InvestmentOperationInput = {
  type: InvestmentOperationType;
  accountId: string;
  assetId: string;
  quantity: string;
  unitPriceCents: number;
  feesCents?: number;
  date: string;
  note?: string | null;
};

export const investmentService = {
  async getPortfolio(): Promise<ApiResponse<InvestmentPortfolio>> {
    return apiClient("/api/investments", { method: "GET" });
  },
  async createAsset(
    input: InvestmentAssetInput,
  ): Promise<ApiResponse<InvestmentAsset>> {
    return apiClient("/api/investments/assets", {
      method: "POST",
      body: input,
    });
  },
  async removeAsset(id: string): Promise<ApiResponse<null>> {
    return apiClient(`/api/investments/assets/${id}`, {
      method: "DELETE",
    });
  },
  async createOperation(
    input: InvestmentOperationInput,
  ): Promise<ApiResponse<InvestmentOperation>> {
    return apiClient("/api/investments/operations", {
      method: "POST",
      body: input,
    });
  },
  async updateOperationFiscalEvent(
    id: string,
    input: {
      type: InvestmentFiscalEventType;
      sourceInstitution?: string | null;
      destinationInstitution?: string | null;
      reclassificationNote?: string | null;
    },
  ): Promise<ApiResponse<InvestmentOperation>> {
    return apiClient(`/api/investments/operations/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  async createFiscalCostAdjustment(input: {
    assetId: string;
    quantity: string;
    costBasisCents: number;
    date: string;
    reason: string;
    sourceInstitution?: string | null;
  }): Promise<ApiResponse<InvestmentFiscalCostAdjustment>> {
    return apiClient("/api/investments/fiscal-cost-adjustments", {
      method: "POST",
      body: input,
    });
  },
  async removeOperation(id: string): Promise<ApiResponse<null>> {
    return apiClient(`/api/investments/operations/${id}`, {
      method: "DELETE",
    });
  },
  async previewImport(
    file: File,
    accountId: string,
  ): Promise<ApiResponse<InvestmentImportPreview>> {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("accountId", accountId);
    return apiClient("/api/investments/import/preview", {
      method: "POST",
      body: formData,
    });
  },
  async confirmImport(input: {
    accountId: string;
    previewToken: string;
    items: Array<InvestmentImportItem & { selected: boolean }>;
  }): Promise<
    ApiResponse<{
      selected: number;
      created: number;
      operations: number;
      incomes: number;
      duplicates: number;
      assets: number;
    }>
  > {
    return apiClient("/api/investments/import/confirm", {
      method: "POST",
      body: input,
    });
  },
  async getRealizedResultReport(
    year: number,
  ): Promise<ApiResponse<InvestmentRealizedResultReport>> {
    return apiClient(`/api/investments/realized-results?year=${year}`, {
      method: "GET",
    });
  },
  async getAnnualIncomeReport(
    year: number,
  ): Promise<ApiResponse<InvestmentAnnualIncomeReport>> {
    return apiClient(`/api/investments/income-report?year=${year}`, {
      method: "GET",
    });
  },
  async getFiscalYearEndSnapshot(
    year: number,
  ): Promise<ApiResponse<InvestmentFiscalYearEndSnapshot>> {
    return apiClient(`/api/investments/fiscal-snapshots?year=${year}`, {
      method: "GET",
    });
  },
  async refreshQuotes(): Promise<ApiResponse<InvestmentQuoteRefreshResult>> {
    return apiClient("/api/investments/quotes/refresh", { method: "POST" });
  },
};
