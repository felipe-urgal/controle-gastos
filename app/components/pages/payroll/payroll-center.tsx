'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaFileImport, FaRedo } from 'react-icons/fa';

import { PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { AnnualIncomeStatementSection } from '@/app/components/pages/payroll/annual-income-statement-section';
import { PayrollAnnualReconciliationSection } from '@/app/components/pages/payroll/payroll-annual-reconciliation-section';
import { PayrollTransactionReconciliationSection } from '@/app/components/pages/payroll/payroll-transaction-reconciliation-section';
import { formatCurrency } from '@/app/lib/currency/format-currency';

type Rubric = {
  code: string | null;
  description: string;
  reference: string | null;
  earningsCents: number | null;
  deductionsCents: number | null;
};

type PayrollDocument = {
  documentType: 'PAYROLL_ADVANCE' | 'MONTHLY_PAYSLIP';
  paymentType: 'ADVANCE' | 'REGULAR';
  employerName: string;
  employerCnpj: string;
  employeeName: string | null;
  year: number;
  month: number;
  salaryBaseCents: number | null;
  grossIncomeCents: number | null;
  totalEarningsCents: number | null;
  totalDeductionsCents: number | null;
  netPaidCents: number | null;
  inssCents: number | null;
  irrfCents: number | null;
  irrfBaseCents: number | null;
  fgtsBaseCents: number | null;
  fgtsAmountCents: number | null;
  earnings: Rubric[];
  deductions: Rubric[];
  bankMetadata: Record<string, string> | null;
  warnings: string[];
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
};

type Preview = {
  fileName: string;
  requiresOcr: boolean;
  pageCount?: number;
  detectedType: PayrollDocument['documentType'] | null;
  previewToken: string | null;
  document: PayrollDocument | null;
  warnings: string[];
};

type PayrollSummary = {
  employerName: string;
  employerCnpj: string;
  year: number;
  month: number;
  grossIncomeCents: number;
  netPaidCents: number;
  irrfCents: number;
  advanceNetPaidCents: number;
  regularNetPaidCents: number;
  matchedAdvances: number;
  pendingAdvances: number;
  documentCount: number;
};

type StoredDocument = {
  id: string;
  documentType: PayrollDocument['documentType'];
  paymentType: PayrollDocument['paymentType'];
  employerName: string;
  employerCnpj: string;
  employeeName: string | null;
  year: number;
  month: number;
  grossIncomeCents: number | null;
  totalEarningsCents: number | null;
  totalDeductionsCents: number | null;
  netPaidCents: number | null;
  inssCents: number | null;
  irrfCents: number | null;
  earnings: unknown;
  deductions: unknown;
  warnings: unknown;
  createdAt: string;
};

function money(value: number | null) {
  return value === null ? 'Não informado' : formatCurrency(value, 'BRL');
}

function typeLabel(type: PayrollDocument['documentType']) {
  return type === 'PAYROLL_ADVANCE' ? 'Adiantamento salarial' : 'Folha mensal';
}

async function readEnvelope<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? 'Não foi possível concluir a operação');
  }
  return body.data as T;
}

export default function PayrollCenter() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [summaries, setSummaries] = useState<PayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/payroll', { cache: 'no-store' }).then((response) => readEnvelope<StoredDocument[]>(response)),
      fetch('/api/payroll/summary', { cache: 'no-store' }).then((response) => readEnvelope<PayrollSummary[]>(response)),
    ])
      .then(([items, summaryItems]) => {
        if (!cancelled) {
          setDocuments(items);
          setSummaries(summaryItems);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os documentos de folha.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rubrics = useMemo(() => {
    if (!preview?.document) return [];
    return [...preview.document.earnings, ...preview.document.deductions];
  }, [preview]);

  async function generatePreview() {
    if (!file) return;
    setWorking(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('file', file);
      const response = await fetch('/api/payroll/import/preview', {
        method: 'POST',
        body: formData,
      });
      setPreview(await readEnvelope<Preview>(response));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível analisar o PDF.');
    } finally {
      setWorking(false);
    }
  }

  async function confirmImport() {
    if (!preview?.document || !preview.previewToken) return;
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/payroll/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewToken: preview.previewToken,
          selected: true,
          document: preview.document,
        }),
      });
      await readEnvelope(response);
      const [listResponse, summaryResponse] = await Promise.all([
        fetch('/api/payroll', { cache: 'no-store' }),
        fetch('/api/payroll/summary', { cache: 'no-store' }),
      ]);
      setDocuments(await readEnvelope<StoredDocument[]>(listResponse));
      setSummaries(await readEnvelope<PayrollSummary[]>(summaryResponse));
      setPreview(null);
      setFile(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível importar o documento.');
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <PageLoading type="list" />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <section className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">Rendimentos do trabalho</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Importe holerites e adiantamentos sem criar transações bancárias automaticamente.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
            {error}
          </div>
        )}

        {summaries.length > 0 && (
          <section className="ds-panel p-5">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Consolidação por competência</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Renda bruta sem dupla contagem do adiantamento; pagamentos líquidos continuam separados e somados.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {summaries.map((summary) => (
                <article key={`${summary.employerCnpj}-${summary.year}-${summary.month}`} className="rounded-[14px] border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong className="text-sm text-[var(--foreground)]">{summary.employerName}</strong>
                      <p className="text-xs text-[var(--text-muted)]">
                        {String(summary.month).padStart(2, '0')}/{summary.year} · {summary.employerCnpj}
                      </p>
                    </div>
                    {summary.pendingAdvances > 0 ? (
                      <span className="rounded-full bg-[var(--warning-subtle)] px-2 py-1 text-xs font-semibold text-[var(--warning)]">
                        Revisão necessária
                      </span>
                    ) : summary.matchedAdvances > 0 ? (
                      <span className="rounded-full bg-[var(--success-subtle)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
                        Adiantamento vinculado
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="Renda bruta" value={money(summary.grossIncomeCents)} />
                    <Metric label="Adiantamento líquido" value={money(summary.advanceNetPaidCents)} />
                    <Metric label="Folha líquida" value={money(summary.regularNetPaidCents)} />
                    <Metric label="Total líquido pago" value={money(summary.netPaidCents)} />
                  </div>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    IRRF retido na competência: <strong className="text-[var(--foreground)]">{money(summary.irrfCents)}</strong>
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <PayrollTransactionReconciliationSection
          refreshKey={documents.map((document) => document.id).join('|')}
        />

        <AnnualIncomeStatementSection />

        <PayrollAnnualReconciliationSection />

                <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="ds-panel p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Importar documento</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              O PDF precisa conter texto extraível. Dados ausentes permanecem ausentes; inconsistências bloqueiam a confirmação.
            </p>

            {!preview ? (
              <div className="mt-5 space-y-4">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={working}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="ds-control min-h-11 w-full px-3 py-2"
                />
                <button
                  type="button"
                  disabled={!file || working}
                  onClick={generatePreview}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 font-extrabold text-white disabled:opacity-40"
                >
                  <FaFileImport aria-hidden="true" />
                  {working ? 'Analisando...' : 'Analisar PDF'}
                </button>
              </div>
            ) : preview.requiresOcr ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-4 text-sm text-[var(--foreground)]">
                  <strong>OCR/revisão necessária</strong>
                  <p className="mt-1 text-[var(--text-muted)]">{preview.warnings[0]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] font-bold"
                >
                  <FaRedo aria-hidden="true" /> Escolher outro PDF
                </button>
              </div>
            ) : preview.document ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--orbit-primary)]">Documento detectado</span>
                  <strong className="mt-1 block text-[var(--foreground)]">{typeLabel(preview.document.documentType)}</strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {String(preview.document.month).padStart(2, '0')}/{preview.document.year} · {preview.document.employerName} · {preview.document.employerCnpj || 'CNPJ não reconhecido'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Vencimentos" value={money(preview.document.totalEarningsCents)} />
                  <Metric label="Descontos" value={money(preview.document.totalDeductionsCents)} />
                  <Metric label="Líquido" value={money(preview.document.netPaidCents)} />
                  <Metric label="IRRF" value={money(preview.document.irrfCents)} />
                  <Metric label="INSS" value={money(preview.document.inssCents)} />
                  <Metric label="Rubricas" value={String(rubrics.length)} />
                </div>

                {preview.document.errors.length > 0 && (
                  <div className="rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
                    {preview.document.errors.map((item) => <p key={item}>{item}</p>)}
                  </div>
                )}

                {(preview.warnings.length > 0 || preview.document.warnings.length > 0) && (
                  <div className="rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-xs text-[var(--text-muted)]">
                    {[...new Set([...preview.warnings, ...preview.document.warnings])].map((item) => <p key={item}>{item}</p>)}
                  </div>
                )}

                {preview.document.duplicate && (
                  <div className="rounded-[14px] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
                    Este documento já foi importado.
                  </div>
                )}

                {rubrics.length > 0 && (
                  <div className="max-h-72 overflow-auto rounded-[14px] border border-[var(--border)]">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="sticky top-0 bg-[var(--surface-raised)] text-[var(--text-muted)]">
                        <tr>
                          <th className="px-3 py-2">Código</th>
                          <th className="px-3 py-2">Rubrica</th>
                          <th className="px-3 py-2">Referência</th>
                          <th className="px-3 py-2 text-right">Vencimento</th>
                          <th className="px-3 py-2 text-right">Desconto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {rubrics.map((rubric, index) => (
                          <tr key={`${rubric.code ?? 'rubric'}-${index}`}>
                            <td className="px-3 py-2">{rubric.code ?? '—'}</td>
                            <td className="px-3 py-2 text-[var(--foreground)]">{rubric.description}</td>
                            <td className="px-3 py-2">{rubric.reference ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{money(rubric.earningsCents)}</td>
                            <td className="px-3 py-2 text-right">{money(rubric.deductionsCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => setPreview(null)}
                    className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={working || preview.document.duplicate || preview.document.errors.length > 0}
                    onClick={confirmImport}
                    className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-40"
                  >
                    {working ? 'Importando...' : 'Confirmar importação'}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="ds-panel overflow-hidden">
            <div className="border-b border-[var(--border)] p-5">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Documentos importados</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Cada documento permanece separado e auditável por competência.</p>
            </div>

            {documents.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-muted)]">Nenhum holerite ou adiantamento importado.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {documents.map((document) => (
                  <article key={document.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-[var(--foreground)]">{typeLabel(document.documentType)}</strong>
                        <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs text-[var(--text-muted)]">
                          {String(document.month).padStart(2, '0')}/{document.year}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{document.employerName} · {document.employerCnpj}</p>
                      <p className="mt-1 text-xs text-[var(--text-subtle)]">
                        INSS {money(document.inssCents)} · IRRF {money(document.irrfCents)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="block text-xs text-[var(--text-muted)]">Líquido</span>
                      <strong className="text-sm text-[var(--foreground)]">{money(document.netPaidCents)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </ProtectedRoute>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">{value}</strong>
    </div>
  );
}
