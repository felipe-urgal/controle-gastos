'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaFileImport, FaRedo } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { AnnualIncomeStatementSection } from '@/app/components/pages/payroll/annual-income-statement-section';
import { PayrollAdvanceReconciliationSection } from '@/app/components/pages/payroll/payroll-advance-reconciliation-section';
import { PayrollAnnualReconciliationSection } from '@/app/components/pages/payroll/payroll-annual-reconciliation-section';
import { PayrollTransactionReconciliationSection } from '@/app/components/pages/payroll/payroll-transaction-reconciliation-section';
import { useAuth } from '@/app/context/auth-context';
import { logicalDateParts } from '@/app/lib/payroll/payroll-date';
import {
  importedDocumentStatusLabel,
  payrollMoney,
  payrollPaymentTypeLabel,
  payrollSummaryMoney,
} from '@/app/lib/payroll/payroll-presentation';
import { payrollService } from '@/app/services/payroll-service';
import type {
  PayrollImportPreview,
  PayrollPage,
  PayrollPaymentType,
  PayrollSummary,
  StoredPayrollDocument,
} from '@/app/types/payroll';

type PayrollTab = 'MONTHLY' | 'BANK' | 'ANNUAL';

const monthlyPaymentTypes: PayrollPaymentType[] = [
  'REGULAR',
  'THIRTEENTH',
  'VACATION',
  'PLR',
  'OTHER',
];

function typeLabel(type: 'PAYROLL_ADVANCE' | 'MONTHLY_PAYSLIP') {
  return type === 'PAYROLL_ADVANCE'
    ? 'Adiantamento salarial'
    : 'Folha / pagamento';
}

const emptyDocuments: PayrollPage<StoredPayrollDocument> = {
  items: [],
  pageInfo: { page: 1, limit: 8, hasMore: false },
};

const emptySummaries: PayrollPage<PayrollSummary> = {
  items: [],
  pageInfo: { page: 1, limit: 6, hasMore: false },
};

export default function PayrollCenter() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const currentYear = logicalDateParts().year;

  const [activeTab, setActiveTab] = useState<PayrollTab>('MONTHLY');
  const [monthlyYear, setMonthlyYear] = useState(currentYear);
  const [documentPage, setDocumentPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [documents, setDocuments] =
    useState<PayrollPage<StoredPayrollDocument>>(emptyDocuments);
  const [summaries, setSummaries] =
    useState<PayrollPage<PayrollSummary>>(emptySummaries);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [summariesError, setSummariesError] = useState('');

  const [working, setWorking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PayrollImportPreview | null>(null);
  const [paymentType, setPaymentType] =
    useState<PayrollPaymentType>('REGULAR');
  const [supersedesId, setSupersedesId] = useState('');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reconciliationRefreshKey, setReconciliationRefreshKey] = useState(0);

  const years = Array.from({ length: 8 }, (_, index) => currentYear - index);

  const rubrics = useMemo(() => {
    if (!preview?.document) return [];
    return [...preview.document.earnings, ...preview.document.deductions];
  }, [preview]);

  async function loadDocuments() {
    const result = await payrollService.listDocuments({
      year: monthlyYear,
      page: documentPage,
      limit: 8,
    });
    setDocuments(result);
  }

  async function loadSummaries() {
    const result = await payrollService.summaries({
      year: monthlyYear,
      page: summaryPage,
      limit: 6,
    });
    setSummaries(result);
  }

  useEffect(() => {
    let cancelled = false;

    payrollService
      .listDocuments({
        year: monthlyYear,
        page: documentPage,
        limit: 8,
      })
      .then((result) => {
        if (!cancelled) {
          setDocumentsError('');
          setDocuments(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocumentsError(
            'Não foi possível carregar o histórico de documentos.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentPage, monthlyYear]);

  useEffect(() => {
    let cancelled = false;

    payrollService
      .summaries({
        year: monthlyYear,
        page: summaryPage,
        limit: 6,
      })
      .then((result) => {
        if (!cancelled) {
          setSummariesError('');
          setSummaries(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummariesError(
            'Não foi possível carregar a consolidação mensal.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSummariesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [monthlyYear, summaryPage]);

  async function retryDocuments() {
    setDocumentsLoading(true);
    setDocumentsError('');
    try {
      await loadDocuments();
    } catch {
      setDocumentsError('Não foi possível carregar o histórico de documentos.');
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function retrySummaries() {
    setSummariesLoading(true);
    setSummariesError('');
    try {
      await loadSummaries();
    } catch {
      setSummariesError('Não foi possível carregar a consolidação mensal.');
    } finally {
      setSummariesLoading(false);
    }
  }

  async function refreshMonthlyReadsAfterMutation() {
    const [documentsResult, summariesResult] = await Promise.allSettled([
      loadDocuments(),
      loadSummaries(),
    ]);

    if (documentsResult.status === 'rejected') {
      setDocumentsError(
        'A alteração foi concluída, mas não foi possível atualizar o histórico.',
      );
    } else {
      setDocumentsError('');
    }

    if (summariesResult.status === 'rejected') {
      setSummariesError(
        'A alteração foi concluída, mas não foi possível atualizar a consolidação.',
      );
    } else {
      setSummariesError('');
    }

    setReconciliationRefreshKey((current) => current + 1);
  }

  async function refreshReconciliationReadModels() {
    try {
      await loadSummaries();
      setSummariesError('');
    } catch {
      setSummariesError(
        'A conciliação foi atualizada, mas não foi possível recarregar o resumo.',
      );
    }
    setReconciliationRefreshKey((current) => current + 1);
  }

  async function generatePreview() {
    if (!file) return;
    setWorking(true);
    setActionError('');
    setFeedback('');
    try {
      const nextPreview = await payrollService.previewPayroll(file);
      setPreview(nextPreview);
      setPaymentType(nextPreview.document?.paymentType ?? 'REGULAR');
      setSupersedesId('');
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível analisar o PDF.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function archiveDocument(id: string) {
    if (
      !window.confirm(
        'Arquivar esta versão? Ela deixará de participar dos cálculos e conciliações, mas continuará no histórico.',
      )
    ) {
      return;
    }

    setWorking(true);
    setActionError('');
    setFeedback('');

    try {
      await payrollService.archivePayroll(id);
      setFeedback('Documento arquivado.');
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível arquivar o documento.',
      );
      setWorking(false);
      return;
    }

    setWorking(false);
    await refreshMonthlyReadsAfterMutation();
  }

  async function confirmImport() {
    if (!preview?.document || !preview.previewToken) return;

    setWorking(true);
    setActionError('');
    setFeedback('');

    try {
      await payrollService.confirmPayroll({
        previewToken: preview.previewToken,
        selected: true,
        document: preview.document,
        paymentType,
        supersedesId: supersedesId || null,
      });

      setFeedback('Documento importado.');
      setPreview(null);
      setPaymentType('REGULAR');
      setSupersedesId('');
      setFile(null);
      setDocumentPage(1);
      setSummaryPage(1);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível importar o documento.',
      );
      setWorking(false);
      return;
    }

    setWorking(false);
    await refreshMonthlyReadsAfterMutation();
  }

  function changeMonthlyYear(year: number) {
    setMonthlyYear(year);
    setDocumentPage(1);
    setSummaryPage(1);
    setDocumentsLoading(true);
    setSummariesLoading(true);
  }

  return (
    <ProtectedRoute>
      <section className="mx-auto w-full max-w-6xl space-y-5 overflow-x-hidden p-3 sm:p-6">
        <header>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">
            Rendimentos do trabalho
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Folha é fonte documental: importar ou conciliar nunca cria receita
            bancária automaticamente.
          </p>
        </header>

        <nav
          aria-label="Áreas de rendimentos do trabalho"
          className="grid grid-cols-1 gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-2 sm:grid-cols-3"
        >
          <TabButton
            active={activeTab === 'MONTHLY'}
            onClick={() => setActiveTab('MONTHLY')}
          >
            Mensal
          </TabButton>
          <TabButton
            active={activeTab === 'BANK'}
            onClick={() => setActiveTab('BANK')}
          >
            Conciliação bancária
          </TabButton>
          <TabButton
            active={activeTab === 'ANNUAL'}
            onClick={() => setActiveTab('ANNUAL')}
          >
            Anual / IR
          </TabButton>
        </nav>

        {activeTab === 'MONTHLY' && (
          <div className="space-y-5">
            <section className="ds-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">
                    Importar documento mensal
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                    Importe folha regular, adiantamento, 13º, férias, PLR ou
                    outro rendimento reconhecido. Dados ausentes permanecem
                    ausentes.
                  </p>
                </div>
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Ano exibido
                  <select
                    aria-label="Ano dos rendimentos mensais"
                    value={monthlyYear}
                    onChange={(event) =>
                      changeMonthlyYear(Number(event.target.value))
                    }
                    className="ds-control mt-1 min-h-11 px-3"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {feedback && (
                <div
                  role="status"
                  className="mt-4 rounded-[14px] bg-[var(--success-subtle)] p-3 text-sm font-semibold text-[var(--success)]"
                >
                  {feedback}
                </div>
              )}

              {actionError && (
                <div
                  role="alert"
                  className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
                >
                  {actionError}
                </div>
              )}

              {!preview ? (
                <div className="mt-5 space-y-4">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={working}
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                    className="ds-control min-h-11 w-full px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled={!file || working}
                    onClick={() => void generatePreview()}
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
                    <p className="mt-1 text-[var(--text-muted)]">
                      {preview.warnings[0]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setSupersedesId('');
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] font-bold"
                  >
                    <FaRedo aria-hidden="true" /> Escolher outro PDF
                  </button>
                </div>
              ) : preview.document ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--orbit-primary)]">
                      Documento detectado
                    </span>
                    <strong className="mt-1 block text-[var(--foreground)]">
                      {typeLabel(preview.document.documentType)}
                    </strong>
                    <span className="mt-1 block break-words text-xs text-[var(--text-muted)]">
                      {String(preview.document.month).padStart(2, '0')}/
                      {preview.document.year} · {preview.document.employerName} ·{' '}
                      {preview.document.employerCnpj ||
                        'CNPJ não reconhecido'}
                    </span>
                  </div>

                  <div className="rounded-[14px] border border-[var(--border)] p-4">
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                      htmlFor="payroll-payment-type"
                    >
                      Classificação do pagamento
                    </label>
                    <select
                      id="payroll-payment-type"
                      value={paymentType}
                      onChange={(event) =>
                        setPaymentType(
                          event.target.value as PayrollPaymentType,
                        )
                      }
                      disabled={
                        preview.document.documentType === 'PAYROLL_ADVANCE'
                      }
                      className="ds-control mt-2 min-h-11 w-full px-3 disabled:opacity-60"
                    >
                      {(preview.document.documentType === 'PAYROLL_ADVANCE'
                        ? (['ADVANCE'] as PayrollPaymentType[])
                        : monthlyPaymentTypes
                      ).map((type) => (
                        <option key={type} value={type}>
                          {payrollPaymentTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Detectado como{' '}
                      <strong>
                        {payrollPaymentTypeLabel(
                          preview.document.paymentType,
                        )}
                      </strong>
                      . Confirme ou corrija antes de importar.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Metric
                      label="Vencimentos"
                      value={payrollMoney(
                        preview.document.totalEarningsCents,
                        showValues,
                      )}
                    />
                    <Metric
                      label="Descontos"
                      value={payrollMoney(
                        preview.document.totalDeductionsCents,
                        showValues,
                      )}
                    />
                    <Metric
                      label="Líquido"
                      value={payrollMoney(
                        preview.document.netPaidCents,
                        showValues,
                      )}
                    />
                    <Metric
                      label="IRRF"
                      value={payrollMoney(
                        preview.document.irrfCents,
                        showValues,
                      )}
                    />
                    <Metric
                      label="INSS"
                      value={payrollMoney(
                        preview.document.inssCents,
                        showValues,
                      )}
                    />
                    <Metric label="Rubricas" value={String(rubrics.length)} />
                  </div>

                  {preview.document.errors.length > 0 && (
                    <div className="rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
                      {preview.document.errors.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  )}

                  {(preview.warnings.length > 0 ||
                    preview.document.warnings.length > 0) && (
                    <div className="rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-xs text-[var(--text-muted)]">
                      {[
                        ...new Set([
                          ...preview.warnings,
                          ...preview.document.warnings,
                        ]),
                      ].map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  )}

                  {preview.replacementCandidates.length > 0 &&
                    !(
                      preview.document.duplicate &&
                      paymentType === preview.document.paymentType
                    ) && (
                      <div className="rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm text-[var(--foreground)]">
                        <strong>Retificação / substituição</strong>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Escolha explicitamente a versão ativa substituída. A
                          anterior continua no histórico.
                        </p>
                        <select
                          value={supersedesId}
                          onChange={(event) =>
                            setSupersedesId(event.target.value)
                          }
                          className="ds-control mt-3 min-h-11 w-full px-3"
                        >
                          <option value="">
                            Importar como documento adicional
                          </option>
                          {preview.replacementCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {payrollPaymentTypeLabel(candidate.paymentType)} ·
                              versão de{' '}
                              {new Date(
                                candidate.createdAt,
                              ).toLocaleDateString('pt-BR')}{' '}
                              · líquido{' '}
                              {payrollMoney(
                                candidate.netPaidCents,
                                showValues,
                              )}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  {preview.document.duplicate &&
                    paymentType === preview.document.paymentType && (
                      <div className="rounded-[14px] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
                        Este documento com esta classificação já foi importado.
                      </div>
                    )}

                  {rubrics.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-[var(--foreground)]">
                        Rubricas
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {rubrics.map((rubric, index) => (
                          <article
                            key={(rubric.code ?? 'rubric') + '-' + index}
                            className="min-w-0 rounded-[12px] border border-[var(--border)] p-3 text-xs"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <strong className="break-words text-[var(--foreground)]">
                                {rubric.description}
                              </strong>
                              <span className="text-[var(--text-muted)]">
                                {rubric.code ?? 'Sem código'}
                              </span>
                            </div>
                            {rubric.reference && (
                              <p className="mt-1 break-words text-[var(--text-muted)]">
                                Referência: {rubric.reference}
                              </p>
                            )}
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <Metric
                                label="Vencimento"
                                value={payrollMoney(
                                  rubric.earningsCents,
                                  showValues,
                                )}
                              />
                              <Metric
                                label="Desconto"
                                value={payrollMoney(
                                  rubric.deductionsCents,
                                  showValues,
                                )}
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        setPreview(null);
                        setPaymentType('REGULAR');
                        setSupersedesId('');
                      }}
                      className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={
                        working ||
                        (preview.document.duplicate &&
                          paymentType === preview.document.paymentType) ||
                        preview.document.errors.length > 0
                      }
                      onClick={() => void confirmImport()}
                      className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-40"
                    >
                      {working ? 'Importando...' : 'Confirmar importação'}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <MonthlySummaryPanel
              result={summaries}
              loading={summariesLoading}
              error={summariesError}
              page={summaryPage}
              showValues={showValues}
              onRetry={() => void retrySummaries()}
              onPrevious={() => {
                setSummariesLoading(true);
                setSummaryPage((current) => Math.max(1, current - 1));
              }}
              onNext={() => {
                setSummariesLoading(true);
                setSummaryPage((current) => current + 1);
              }}
            />

            <PayrollAdvanceReconciliationSection
              refreshKey={
                monthlyYear + ':' + reconciliationRefreshKey
              }
              onChanged={refreshReconciliationReadModels}
            />

            <DocumentHistoryPanel
              result={documents}
              loading={documentsLoading}
              error={documentsError}
              page={documentPage}
              working={working}
              showValues={showValues}
              onRetry={() => void retryDocuments()}
              onArchive={(id) => void archiveDocument(id)}
              onPrevious={() => {
                setDocumentsLoading(true);
                setDocumentPage((current) => Math.max(1, current - 1));
              }}
              onNext={() => {
                setDocumentsLoading(true);
                setDocumentPage((current) => current + 1);
              }}
            />
          </div>
        )}

        {activeTab === 'BANK' && (
          <PayrollTransactionReconciliationSection
            refreshKey={String(reconciliationRefreshKey)}
          />
        )}

        {activeTab === 'ANNUAL' && (
          <div className="space-y-5">
            <AnnualIncomeStatementSection
              onChanged={() => {
                setReconciliationRefreshKey((current) => current + 1);
              }}
            />
            <PayrollAnnualReconciliationSection
              refreshKey={reconciliationRefreshKey}
            />
          </div>
        )}
      </section>
    </ProtectedRoute>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={
        'min-h-11 rounded-[10px] px-4 text-sm font-bold transition-colors ' +
        (active
          ? 'bg-[var(--foreground)] text-[var(--background)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]')
      }
    >
      {children}
    </button>
  );
}

function MonthlySummaryPanel({
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
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
        >
          <FaRedo aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-full border border-current px-3 font-bold"
          >
            Tentar novamente
          </button>
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

function DocumentHistoryPanel({
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
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
        >
          <FaRedo aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-full border border-current px-3 font-bold"
          >
            Tentar novamente
          </button>
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
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => onArchive(document.id)}
                    className="min-h-11 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold disabled:opacity-40"
                  >
                    Arquivar
                  </button>
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

function Pagination({
  page,
  hasMore,
  onPrevious,
  onNext,
}: {
  page: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={onPrevious}
        className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-xs text-[var(--text-muted)]">Página {page}</span>
      <button
        type="button"
        disabled={!hasMore}
        onClick={onNext}
        className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block break-words text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
