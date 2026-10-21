'use client';

import { FaRedo } from 'react-icons/fa';

import { Button } from '@/app/components/ui';
import {
  Metric,
  Pagination,
  typeLabel,
} from '@/app/components/pages/payroll/payroll-shared';
import {
  importedDocumentStatusLabel,
  payrollMoney,
  payrollPaymentTypeLabel,
  payrollSummaryMoney,
} from '@/app/lib/payroll/payroll-presentation';
import type {
  PayrollPage,
  PayrollSummary,
  StoredPayrollDocument,
} from '@/app/types/payroll';

export function MonthlySummaryPanel({
  result,
  loading,
  error,
  page,
  showValues,
  onRetry,
  onPrevious,
  onNext,
}: {
  result: PayrollPage<PayrollSummary>;
  loading: boolean;
  error: string;
  page: number;
  showValues: boolean;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <section className="ds-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Consolidação por competência
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Mostra as competências mais recentes primeiro; carregue páginas
            anteriores apenas quando precisar do histórico.
          </p>
        </div>
        <Button
          variant="outline"
          pill
          onClick={onRetry}
          disabled={loading}
          icon={<FaRedo aria-hidden="true" />}
        >
          Atualizar
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" pill onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Carregando consolidação...
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhuma competência encontrada neste ano.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {result.items.map((summary) => (
            <article
              key={
                summary.employerCnpj + '-' + summary.year + '-' + summary.month
              }
              className="rounded-[14px] border border-[var(--border)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="break-words text-sm text-[var(--foreground)]">
                    {summary.employerName}
                  </strong>
                  <p className="text-xs text-[var(--text-muted)]">
                    {String(summary.month).padStart(2, '0')}/{summary.year} ·{' '}
                    {summary.employerCnpj}
                  </p>
                </div>
                {summary.reviewRequired ? (
                  <span className="rounded-full bg-[var(--warning-subtle)] px-2 py-1 text-xs font-semibold text-[var(--warning)]">
                    Revisar competência
                  </span>
                ) : summary.matchedAdvances > 0 ? (
                  <span className="rounded-full bg-[var(--success-subtle)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
                    Adiantamento vinculado
                  </span>
                ) : (
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
                    Sem pendências
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric
                  label="Renda bruta"
                  value={payrollSummaryMoney(
                    summary.grossIncomeCents,
                    summary.grossIncomeComplete,
                    showValues,
                  )}
                />
                <Metric
                  label="Adiantamento líquido"
                  value={payrollSummaryMoney(
                    summary.advanceNetPaidCents,
                    summary.advanceNetPaidComplete,
                    showValues,
                  )}
                />
                <Metric
                  label="Folha líquida"
                  value={payrollSummaryMoney(
                    summary.regularNetPaidCents,
                    summary.regularNetPaidComplete,
                    showValues,
                  )}
                />
                <Metric
                  label="Total líquido pago"
                  value={payrollSummaryMoney(
                    summary.netPaidCents,
                    summary.netPaidComplete,
                    showValues,
                  )}
                />
              </div>

              <p className="mt-3 text-xs text-[var(--text-muted)]">
                IRRF retido:{' '}
                <strong className="text-[var(--foreground)]">
                  {payrollSummaryMoney(
                    summary.irrfCents,
                    summary.irrfComplete,
                    showValues,
                  )}
                </strong>
              </p>

              {summary.reviewReason && (
                <p className="mt-3 rounded-[12px] bg-[var(--warning-subtle)] p-3 text-xs leading-relaxed text-[var(--warning)]">
                  {summary.reviewReason}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {!loading && (page > 1 || result.pageInfo.hasMore) && (
        <Pagination
          page={page}
          hasMore={result.pageInfo.hasMore}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      )}
    </section>
  );
}

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
    <section className="ds-panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Documentos importados
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Histórico paginado; cada versão continua separada e auditável.
          </p>
        </div>
        <Button
          variant="outline"
          pill
          onClick={onRetry}
          disabled={loading}
          icon={<FaRedo aria-hidden="true" />}
        >
          Atualizar
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" pill onClick={onRetry}>
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
                    pill
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

      {!loading && (page > 1 || result.pageInfo.hasMore) && (
        <div className="p-4">
          <Pagination
            page={page}
            hasMore={result.pageInfo.hasMore}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </div>
      )}
    </section>
  );
}
