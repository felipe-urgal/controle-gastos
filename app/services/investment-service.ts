import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentAnnualIncomeReport,
  InvestmentAnnualTaxSupportReport,
  InvestmentFiscalCostAdjustment,
  InvestmentFiscalPendingCenter,
  InvestmentFiscalEventType,
  InvestmentFiscalYearEndSnapshot,
  InvestmentOperation,
  InvestmentRealizedResultReport,
  InvestmentTaxControlReport,
  InvestmentTaxLossReport,
  InvestmentTaxPayment,
  InvestmentTaxWithholding,
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
      source: "CSV" | "XLSX" | "PDF";
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
      brokerageNote?: {
        broker: string;
        brokerCnpj: string | null;
        noteNumber: string;
        tradeDate: string;
        businessIndex: number;
        market: string;
        grossAmountCents: number;
        allocatedFeesCents: number;
        irrfCents: number;
      };
    }
  | {
      index: number;
      source: "CSV" | "XLSX" | "PDF";
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
  detectedSource?: "B3" | "NUBANK_BROKERAGE_NOTE";
  brokerageNotes?: Array<{
    noteNumber: string;
    tradeDate: string;
    broker: string;
    brokerCnpj: string | null;
    businesses: number;
    feesCents: number;
    irrfCents: number;
  }>;
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
  async getAnnualTaxSupportReport(
    year: number,
  ): Promise<ApiResponse<InvestmentAnnualTaxSupportReport>> {
    return apiClient(`/api/investments/annual-tax-support?year=${year}`, {
      method: "GET",
    });
  },
  async getFiscalPendingCenter(
    year: number,
  ): Promise<ApiResponse<InvestmentFiscalPendingCenter>> {
    return apiClient(`/api/investments/fiscal-pendencies?year=${year}`, {
      method: "GET",
    });
  },
  async justifyFiscalPending(input: {
    year: number;
    fingerprint: string;
    justification: string;
  }): Promise<
    ApiResponse<{
      id: string;
      pendingKey: string;
      fingerprint: string;
      justification: string;
      createdAt: string;
    }>
  > {
    return apiClient("/api/investments/fiscal-pendencies/justify", {
      method: "POST",
      body: input,
    });
  },
  async getTaxControlReport(
    year: number,
  ): Promise<ApiResponse<InvestmentTaxControlReport>> {
    return apiClient(`/api/investments/taxes?year=${year}`, {
      method: "GET",
    });
  },
  async createTaxWithholding(input: {
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    amountCents: number;
    year: number;
    month: number;
    day: number;
    assetId?: string | null;
    operationId?: string | null;
    note?: string | null;
  }): Promise<ApiResponse<InvestmentTaxWithholding>> {
    return apiClient("/api/investments/taxes/withholdings", {
      method: "POST",
      body: input,
    });
  },
  async createTaxPayment(input: {
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    amountCents: number;
    competenceYear: number;
    competenceMonth: number;
    code: string;
    paidYear: number;
    paidMonth: number;
    paidDay: number;
    note?: string | null;
    receiptReference?: string | null;
  }): Promise<ApiResponse<InvestmentTaxPayment>> {
    return apiClient("/api/investments/taxes/payments", {
      method: "POST",
      body: input,
    });
  },
  async getTaxLossReport(
    year: number,
  ): Promise<ApiResponse<InvestmentTaxLossReport>> {
    return apiClient(`/api/investments/tax-losses?year=${year}`, {
      method: "GET",
    });
  },
  async createTaxLossAdjustment(input: {
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    amountCents: number;
    year: number;
    month: number;
    reason: string;
  }): Promise<ApiResponse<InvestmentTaxLossReport["adjustments"][number]>> {
    return apiClient("/api/investments/tax-losses", {
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
