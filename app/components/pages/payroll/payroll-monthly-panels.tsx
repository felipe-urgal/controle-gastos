'use client';

import { FaChevronDown, FaRedo } from 'react-icons/fa';

import { Button } from '@/app/components/ui';
import {
  Pagination,
  typeLabel,
} from '@/app/components/pages/payroll/payroll-shared';
import {
  importedDocumentStatusLabel,
  payrollMoney,
  payrollPaymentTypeLabel,
} from '@/app/lib/payroll/payroll-presentation';
import type {
  PayrollPage,
  StoredPayrollDocument,
} from '@/app/types/payroll';

export function DocumentHistoryPanel({
  result,
  loading,
  error,
  page,
  working,
  showValues,
  onRetry,
  onArchive,
  onPrevious,
  onNext,
}: {
  result: PayrollPage<StoredPayrollDocument>;
  loading: boolean;
  error: string;
  page: number;
  working: boolean;
  showValues: boolean;
  onRetry: () => void;
  onArchive: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <details className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]">
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-lg font-bold text-[var(--foreground)]">Documentos importados</span>
          <span className="block text-xs text-[var(--text-muted)]">
            Histórico de cada holerite importado; cada versão continua separada e auditável.
          </span>
        </span>
        <span className="flex items-center gap-3">
          {!loading && !result.pageInfo.hasMore && (
            <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--text-muted)]">
              {result.items.length}
            </span>
          )}
          <FaChevronDown className="text-xs text-[var(--text-muted)] transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="flex justify-end border-t border-[var(--border)] px-4 py-2 sm:px-5">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={loading} icon={<FaRedo aria-hidden="true" />}>
          Atualizar
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {loading ? (
        <p className="p-5 text-sm text-[var(--text-muted)]">
          Carregando documentos...
        </p>
      ) : result.items.length === 0 ? (
        <p className="p-5 text-sm text-[var(--text-muted)]">
          Nenhum documento importado neste ano.
        </p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {result.items.map((document) => (
            <article
              key={document.id}
              className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-[var(--foreground)]">
                    {typeLabel(document.documentType)}
                  </strong>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--foreground)]">
                    {payrollPaymentTypeLabel(document.paymentType)}
                  </span>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs text-[var(--text-muted)]">
                    {String(document.month).padStart(2, '0')}/{document.year}
                  </span>
                  <span
                    className={
                      document.lifecycleStatus === 'ACTIVE'
                        ? 'rounded-full bg-[var(--success-subtle)] px-2 py-1 text-xs font-semibold text-[var(--success)]'
                        : document.lifecycleStatus === 'SUPERSEDED'
                          ? 'rounded-full bg-[var(--warning-subtle)] px-2 py-1 text-xs font-semibold text-[var(--warning)]'
                          : 'rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]'
                    }
                  >
                    {importedDocumentStatusLabel(document.lifecycleStatus)}
                  </span>
                </div>
                <p className="mt-1 break-words text-sm text-[var(--text-muted)]">
                  {document.employerName} · {document.employerCnpj}
                </p>
                <p className="mt-1 break-words text-xs text-[var(--text-subtle)]">
                  INSS {payrollMoney(document.inssCents, showValues)} · IRRF{' '}
                  {payrollMoney(document.irrfCents, showValues)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <div className="text-left sm:text-right">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Líquido
                  </span>
                  <strong className="text-sm text-[var(--foreground)]">
                    {payrollMoney(document.netPaidCents, showValues)}
                  </strong>
                </div>
                {document.lifecycleStatus === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={working}
                    onClick={() => onArchive(document.id)}
                  >
                    Arquivar
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !result.pageInfo.hasMore && (page > 1 || result.pageInfo.hasMore) && (
        <div className="p-4">
          <Pagination
            page={page}
            hasMore={result.pageInfo.hasMore}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </div>
      )}
    </details>
  );
}
