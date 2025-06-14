// src/app/services/reports/reportsService.ts

import { apiClient } from '@/app/services/apiClient';
import {
  SummaryReport,
  AccountReport,
  AccountCategoryReport,
  AccountTypeCategoryReport,
  InvestimentReport,
  AnnualByAccount,
  AnnualAccountTypeCategoryReport
} from '@/app/types/reports';

// Define a type for cache keys
type CacheKey = string;

// Create a type-safe cache store
const reportCache = new Map<CacheKey, unknown>();

function getCacheKey(endpoint: string, params: Record<string, unknown>): CacheKey {
  return `${endpoint}:${JSON.stringify(params)}`;
}

interface ReportParams {
  userId: string;
  year: number;
  month: number;
}

export const reportsService = {
  async getSummaryReport(userId: string, year: number, month: number): Promise<SummaryReport> {
    const cacheKey = getCacheKey('/api/reports/summary', { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as SummaryReport;
    }
    
    const data = await apiClient<SummaryReport>('/api/reports/summary', {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  async getAccountReport(userId: string, year: number, month: number): Promise<AccountReport> {
    const cacheKey = getCacheKey('/api/reports/by-account', { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as AccountReport;
    }
    
    const data = await apiClient<AccountReport>('/api/reports/by-account', {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  async getAccountCategoryReport(userId: string, year: number, month: number): Promise<AccountCategoryReport> {
    const cacheKey = getCacheKey('/api/reports/by-account-category', { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as AccountCategoryReport;
    }
    
    const data = await apiClient<AccountCategoryReport>('/api/reports/by-account-category', {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  async getAccountTypeCategoryReport(userId: string, year: number, month: number): Promise<AccountTypeCategoryReport> {
    const cacheKey = getCacheKey('/api/reports/by-account-type-category', { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as AccountTypeCategoryReport;
    }
    
    const data = await apiClient<AccountTypeCategoryReport>('/api/reports/by-account-type-category', {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  async getInvestmentReport(userId: string, year: number, month: number): Promise<InvestimentReport> {
    const cacheKey = getCacheKey('/api/reports/investment', { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as InvestimentReport;
    }
    
    const data = await apiClient<InvestimentReport>('/api/reports/investment', {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  async getAnnualByAccount(userId: string, year: number, month: number): Promise<AnnualByAccount> {
    const cacheKey = getCacheKey('/api/reports/annual-by-account', { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as AnnualByAccount;
    }
    
    const data = await apiClient<AnnualByAccount>('/api/reports/annual-by-account', {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  async getAnnualAccountTypeCategoryReport(userId: string, year: number, month: number): Promise<AnnualAccountTypeCategoryReport> {
    const cacheKey = getCacheKey('/api/reports/annual-by-account-type-category', { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as AnnualAccountTypeCategoryReport;
    }
    
    const data = await apiClient<AnnualAccountTypeCategoryReport>('/api/reports/annual-by-account-type-category', {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  async getCustomReport<T>(endpoint: string, params: ReportParams): Promise<T> {
    const { userId, year, month } = params;
    const cacheKey = getCacheKey(endpoint, { userId, year, month });
    
    if (reportCache.has(cacheKey)) {
      return reportCache.get(cacheKey) as T;
    }
    
    const data = await apiClient<T>(endpoint, {
      queryParams: { userId, year, month }
    });
    
    reportCache.set(cacheKey, data);
    return data;
  },

  // Clear cache when needed (e.g., after adding new transactions)
  clearCache(): void {
    reportCache.clear();
  }
};