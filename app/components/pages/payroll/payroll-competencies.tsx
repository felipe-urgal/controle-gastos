'use client';

import { FaChevronDown, FaRedo } from 'react-icons/fa';

import { recentFirst, reviewQueue } from '@/app/components/pages/payroll/payroll-year-model';
import { Button } from '@/app/components/ui';
import { payrollSummaryMoney } from '@/app/lib/payroll/payroll-presentation';
import type { PayrollSummary } from '@/app/types/payroll';

const competence = (summary: PayrollSummary) => `${String(summary.month).padStart(2, '0')}/${summary.year}`;

export function PayrollReviewQueue({ items }: { items: PayrollSummary[] }) {
  const queue = reviewQueue(items);
  if (queue.length === 0) return null;

  return (
    <section aria-labelledby="payroll-review-title" className="grid gap-2.5 rounded-[var(--radius-lg)] border border-[var(--warning)]/45 bg-[var(--warning-subtle)] p-4">
      <h2 id="payroll-review-title" className="text-[15px] font-bold">Para revisar</h2>
      <ul className="grid gap-2">
        {queue.map((summary) => (
          <li key={`${summary.employerCnpj}-${summary.year}-${summary.month}`} className="rounded-[var(--radius-md)] bg-[var(--surface)] px-3.5 py-2.5">
            <strong className="block break-words text-sm">{competence(summary)} · {summary.employerName}</strong>
            <span className="block text-xs leading-relaxed text-[var(--text-muted)]">{summary.reviewReason ?? 'Competência precisa de revisão.'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ summary }: { summary: PayrollSummary }) {
  if (summary.reviewRequired) {
    return <span className="rounded-full bg-[var(--warning-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--warning)]">Revisar competência</span>;
  }
  if (summary.matchedAdvances > 0) {
    return <span className="rounded-full bg-[var(--success-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--success)]">Adiantamento vinculado</span>;
  }
  return <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--text-muted)]">Sem pendências</span>;
}

export function PayrollCompetencies({
  items,
  loading,
  error,
  showValues,
  onRetry,
}: {
  items: PayrollSummary[];
  loading: boolean;
  error: string;
  showValues: boolean;
  onRetry: () => void;
}) {
  const sorted = recentFirst(items);

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Competências</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Mais recentes primeiro. Toque numa competência para ver o detalhe.</p>
        </div>
        <Button variant="outline" pill onClick={onRetry} disabled={loading} icon={<FaRedo aria-hidden="true" />}>
          Atualizar
        </Button>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]">
          <span>{error}</span>
          <Button variant="outline" size="sm" pill onClick={onRetry}>Tentar novamente</Button>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Carregando competências...</p>
      ) : sorted.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma competência encontrada neste ano.</p>
      ) : (
        <ul className="mt-2">
          {sorted.map((summary) => (
            <li key={`${summary.employerCnpj}-${summary.year}-${summary.month}`} className="border-t border-[var(--border)] first:border-t-0">
              <details className="group">
                <summary className="grid min-h-14 cursor-pointer list-none grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] sm:gap-x-4 [&::-webkit-details-marker]:hidden">
                  <span className="money text-sm font-bold">{String(summary.month).padStart(2, '0')}/{String(summary.year).slice(2)}</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{summary.employerName}</strong>
                    <span className="block text-xs text-[var(--text-muted)]">
                      Bruta <span className="money">{payrollSummaryMoney(summary.grossIncomeCents, summary.grossIncomeComplete, showValues)}</span>
                    </span>
                  </span>
                  <span className="text-right">
                    <strong className="money block text-sm">{payrollSummaryMoney(summary.netPaidCents, summary.netPaidComplete, showValues)}</strong>
                    <span className="block text-xs text-[var(--text-muted)]">líquido total</span>
                  </span>
                  <span className="col-span-full flex items-center justify-between gap-2 sm:col-span-1">
                    <StatusPill summary={summary} />
                    <FaChevronDown className="text-xs text-[var(--text-muted)] transition-transform group-open:rotate-180" aria-hidden="true" />
                  </span>
                </summary>
                <div className="grid gap-2 pb-4 sm:grid-cols-3">
                  <Detail label="Adiantamento líquido" value={payrollSummaryMoney(summary.advanceNetPaidCents, summary.advanceNetPaidComplete, showValues)} />
                  <Detail label="Folha líquida" value={payrollSummaryMoney(summary.regularNetPaidCents, summary.regularNetPaidComplete, showValues)} />
                  <Detail label="IRRF retido" value={payrollSummaryMoney(summary.irrfCents, summary.irrfComplete, showValues)} />
                  <p className="text-xs text-[var(--text-muted)] sm:col-span-3">CNPJ {summary.employerCnpj} · {summary.documentCount} {summary.documentCount === 1 ? 'documento' : 'documentos'}</p>
                  {summary.reviewReason && (
                    <p className="rounded-[var(--radius-md)] bg-[var(--warning-subtle)] p-3 text-xs leading-relaxed text-[var(--warning)] sm:col-span-3">{summary.reviewReason}</p>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-2.5">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="money mt-0.5 block break-words text-sm">{value}</strong>
    </div>
  );
}
