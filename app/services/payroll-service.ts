import type {
  AnnualStatementPreview,
  PayrollAnnualReport,
  PayrollImportPreview,
  PayrollPage,
  PayrollAdvanceResolutionItem,
  PayrollSummary,
  PayrollTransactionReconciliationItem,
  StoredAnnualStatement,
  StoredPayrollDocument,
} from '@/app/types/payroll';

type QueryValue = string | number | null | undefined;

function queryString(values: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? '?' + serialized : '';
}

export async function readApiEnvelope<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(
      body.error?.message ?? body.message ?? 'Não foi possível concluir a operação',
    );
  }
  return body.data as T;
}

async function get<T>(path: string) {
  const response = await fetch(path, { cache: 'no-store' });
  return readApiEnvelope<T>(response);
}

async function mutate<T>(
  path: string,
  options: RequestInit,
) {
  const response = await fetch(path, options);
  return readApiEnvelope<T>(response);
}

export const payrollService = {
  listDocuments(filters: { year?: number; page?: number; limit?: number } = {}) {
    return get<PayrollPage<StoredPayrollDocument>>(
      '/api/payroll' + queryString(filters),
    );
  },

  summaries(filters: { year?: number; page?: number; limit?: number } = {}) {
    return get<PayrollPage<PayrollSummary>>(
      '/api/payroll/summary' + queryString(filters),
    );
  },

  transactionReconciliation(
    filters: {
      year?: number;
      status?: string;
      employerCnpj?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return get<PayrollPage<PayrollTransactionReconciliationItem>>(
      '/api/payroll/transaction-reconciliation' + queryString(filters),
    );
  },

  annualStatements(filters: { year?: number; page?: number; limit?: number } = {}) {
    return get<PayrollPage<StoredAnnualStatement>>(
      '/api/payroll/annual' + queryString(filters),
    );
  },

  annualReconciliation(year: number) {
    return get<PayrollAnnualReport>(
      '/api/payroll/annual/reconciliation' + queryString({ year }),
    );
  },

  previewPayroll(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    return mutate<PayrollImportPreview>('/api/payroll/import/preview', {
      method: 'POST',
      body: formData,
    });
  },

  confirmPayroll(payload: unknown) {
    return mutate<{ created: boolean; duplicate: boolean; id: string }>(
      '/api/payroll/import/confirm',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  },

  archivePayroll(id: string) {
    return mutate<{ id: string; archived: boolean }>(
      '/api/payroll/' + id + '/archive',
      { method: 'POST' },
    );
  },

  previewAnnualStatement(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    return mutate<AnnualStatementPreview>('/api/payroll/annual/preview', {
      method: 'POST',
      body: formData,
    });
  },

  confirmAnnualStatement(payload: unknown) {
    return mutate<{ created: boolean; duplicate: boolean; id: string }>(
      '/api/payroll/annual/confirm',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  },

  archiveAnnualStatement(id: string) {
    return mutate<{ id: string; archived: boolean }>(
      '/api/payroll/annual/' + id + '/archive',
      { method: 'POST' },
    );
  },

  advanceResolution() {
    return get<PayrollAdvanceResolutionItem[]>(
      '/api/payroll/advance-reconciliation',
    );
  },

  resolveAdvance(payload: {
    advanceDocumentId: string;
    regularDocumentId: string;
    rubricIndex: number;
    confirmed: true;
  }) {
    return mutate('/api/payroll/advance-reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  undoAdvance(documentId: string) {
    return mutate(
      '/api/payroll/advance-reconciliation/' + documentId,
      { method: 'DELETE' },
    );
  },

  linkTransaction(payload: {
    payrollDocumentId: string;
    transactionId: string;
  }) {
    return mutate('/api/payroll/transaction-reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  unlinkTransaction(documentId: string) {
    return mutate(
      '/api/payroll/transaction-reconciliation/' + documentId,
      { method: 'DELETE' },
    );
  },
};
