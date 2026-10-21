'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { useEffect, useMemo, useState } from 'react';
import { FaChevronRight, FaFileImport, FaRedo } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { Button, Select } from '@/app/components/ui';
import { usePayrollConfirmation } from '@/app/components/pages/payroll/use-payroll-confirmation';
import {
  DocumentHistoryPanel,
  MonthlySummaryPanel,
} from '@/app/components/pages/payroll/payroll-monthly-panels';
import {
  Metric,
  TabButton,
  typeLabel,
} from '@/app/components/pages/payroll/payroll-shared';
import { AnnualIncomeStatementSection } from '@/app/components/pages/payroll/annual-income-statement-section';
import { PayrollAdvanceReconciliationSection } from '@/app/components/pages/payroll/payroll-advance-reconciliation-section';
import { PayrollAnnualReconciliationSection } from '@/app/components/pages/payroll/payroll-annual-reconciliation-section';
import { PayrollTransactionReconciliationSection } from '@/app/components/pages/payroll/payroll-transaction-reconciliation-section';
import { useAuth } from '@/app/context/auth-context';
import { logicalDateParts } from '@/app/lib/payroll/payroll-date';
import {
  payrollMoney,
  payrollPaymentTypeLabel,
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
  const { confirm: askConfirmation, modal: confirmationModal } =
    usePayrollConfirmation();
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

  function archiveDocument(id: string) {
    askConfirmation({
      title: 'Arquivar versão',
      message:
        'Arquivar esta versão? Ela deixará de participar dos cálculos e conciliações, mas continuará no histórico.',
      confirmText: 'Arquivar',
      onConfirm: () => runArchiveDocument(id),
    });
  }

  async function runArchiveDocument(id: string) {
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
      <PageContainer as="section">
        <PageTitle
          title="Rendimentos do trabalho"
          description="Folha é fonte documental: importar ou conciliar nunca cria receita bancária automaticamente."
        />
        <div className="mt-5 space-y-5">

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
                  <div className="min-w-28">
                    <span className="ds-label mb-2 block">Ano exibido</span>
                    <Select
                      ariaLabel="Ano dos rendimentos mensais"
                      value={monthlyYear}
                      onChange={(value) => changeMonthlyYear(Number(value))}
                      options={years.map((year) => ({
                        value: year,
                        label: String(year),
                      }))}
                    />
                  </div>
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
                    <Button
                      size="lg"
                      pill
                      fullWidth
                      disabled={!file || working}
                      onClick={() => void generatePreview()}
                      icon={<FaFileImport aria-hidden="true" />}
                    >
                      {working ? 'Analisando...' : 'Analisar PDF'}
                    </Button>
                  </div>
                ) : preview.requiresOcr ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-4 text-sm text-[var(--foreground)]">
                      <strong>OCR/revisão necessária</strong>
                      <p className="mt-1 text-[var(--text-muted)]">
                        {preview.warnings[0]}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      pill
                      fullWidth
                      onClick={() => {
                        setPreview(null);
                        setSupersedesId('');
                      }}
                      icon={<FaRedo aria-hidden="true" />}
                    >
                      Escolher outro PDF
                    </Button>
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
                      <Select
                        id="payroll-payment-type"
                        label="Classificação do pagamento"
                        value={paymentType}
                        onChange={(value) =>
                          setPaymentType(String(value) as PayrollPaymentType)
                        }
                        disabled={
                          preview.document.documentType === 'PAYROLL_ADVANCE'
                        }
                        options={(preview.document.documentType ===
                        'PAYROLL_ADVANCE'
                          ? (['ADVANCE'] as PayrollPaymentType[])
                          : monthlyPaymentTypes
                        ).map((type) => ({
                          value: type,
                          label: payrollPaymentTypeLabel(type),
                        }))}
                      />
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
                          <div className="mt-3">
                            <Select
                              ariaLabel="Versão substituída"
                              value={supersedesId}
                              onChange={(value) => setSupersedesId(String(value))}
                              placeholder="Importar como documento adicional"
                              options={preview.replacementCandidates.map(
                                (candidate) => ({
                                  value: candidate.id,
                                  label: `${payrollPaymentTypeLabel(
                                    candidate.paymentType,
                                  )} · versão de ${new Date(
                                    candidate.createdAt,
                                  ).toLocaleDateString('pt-BR')} · líquido ${payrollMoney(
                                    candidate.netPaidCents,
                                    showValues,
                                  )}`,
                                }),
                              )}
                            />
                          </div>
                        </div>
                      )}

                    {preview.document.duplicate &&
                      paymentType === preview.document.paymentType && (
                        <div className="rounded-[14px] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
                          Este documento com esta classificação já foi importado.
                        </div>
                      )}

                    {rubrics.length > 0 && (
                      <details className="group rounded-[14px] border border-[var(--border)]">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] px-4 text-sm font-bold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
                          <span>Rubricas ({rubrics.length})</span>
                          <FaChevronRight
                            className="shrink-0 text-xs text-[var(--text-muted)] transition-transform group-open:rotate-90"
                            aria-hidden="true"
                          />
                        </summary>
                        <div className="space-y-2 p-3 pt-0">
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
                      </details>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        pill
                        disabled={working}
                        onClick={() => {
                          setPreview(null);
                          setPaymentType('REGULAR');
                          setSupersedesId('');
                        }}
                      >
                        Voltar
                      </Button>
                      <Button
                        size="lg"
                        pill
                        disabled={
                          working ||
                          (preview.document.duplicate &&
                            paymentType === preview.document.paymentType) ||
                          preview.document.errors.length > 0
                        }
                        onClick={() => void confirmImport()}
                      >
                        {working ? 'Importando...' : 'Confirmar importação'}
                      </Button>
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
                onArchive={(id) => archiveDocument(id)}
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
        </div>
        {confirmationModal}
      </PageContainer>
    </ProtectedRoute>
  );
}
