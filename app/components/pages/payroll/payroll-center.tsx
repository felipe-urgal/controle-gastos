'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { useEffect, useMemo, useState } from 'react';

import { ProtectedRoute } from '@/app/components/layout';
import { ActionsMenu, Select, ShowBelow, ShowFrom } from '@/app/components/ui';
import { usePayrollConfirmation } from '@/app/components/pages/payroll/use-payroll-confirmation';
import { DocumentHistoryPanel } from '@/app/components/pages/payroll/payroll-monthly-panels';
import { PayrollCompetencies, PayrollReviewQueue } from '@/app/components/pages/payroll/payroll-competencies';
import { PayrollImportPanel } from '@/app/components/pages/payroll/payroll-import-panel';
import { PayrollYearOverview } from '@/app/components/pages/payroll/payroll-year-overview';
import { AnnualIncomeStatementSection } from '@/app/components/pages/payroll/annual-income-statement-section';
import { PayrollAdvanceReconciliationSection } from '@/app/components/pages/payroll/payroll-advance-reconciliation-section';
import { PayrollAnnualReconciliationSection } from '@/app/components/pages/payroll/payroll-annual-reconciliation-section';
import { PayrollTransactionReconciliationSection } from '@/app/components/pages/payroll/payroll-transaction-reconciliation-section';
import { useAuth } from '@/app/context/auth-context';
import { logicalDateParts } from '@/app/lib/payroll/payroll-date';
import { payrollService } from '@/app/services/payroll-service';
import type {
  PayrollImportPreview,
  PayrollPage,
  PayrollPaymentType,
  PayrollSummary,
  StoredPayrollDocument,
} from '@/app/types/payroll';

type PayrollTab = 'MONTHLY' | 'BANK' | 'ANNUAL';

const emptyDocuments: PayrollPage<StoredPayrollDocument> = {
  items: [],
  pageInfo: { page: 1, limit: 8, hasMore: false },
};

// O ano inteiro (até 50 competências) numa única leitura alimenta total, gráfico, revisão e lista.
const YEAR_SUMMARY_LIMIT = 50;

const emptySummaries: PayrollPage<PayrollSummary> = {
  items: [],
  pageInfo: { page: 1, limit: YEAR_SUMMARY_LIMIT, hasMore: false },
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
  const [showImporter, setShowImporter] = useState(false);
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
      page: 1,
      limit: YEAR_SUMMARY_LIMIT,
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
        page: 1,
        limit: YEAR_SUMMARY_LIMIT,
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
  }, [monthlyYear]);

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
      setShowImporter(false);
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
    setDocumentsLoading(true);
    setSummariesLoading(true);
  }

  const headerControls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-[12.5rem] shrink-0">
        <Select
          ariaLabel="Área de rendimentos do trabalho"
          value={activeTab}
          onChange={(value) => setActiveTab(value as 'MONTHLY' | 'BANK' | 'ANNUAL')}
          options={[
            { value: 'MONTHLY', label: 'Mensal' },
            { value: 'BANK', label: 'Conciliação bancária' },
            { value: 'ANNUAL', label: 'Anual / IR' },
          ]}
        />
      </div>
      <div className="w-[7rem] shrink-0">
        <Select
          ariaLabel="Ano dos rendimentos mensais"
          value={monthlyYear}
          onChange={(value) => changeMonthlyYear(Number(value))}
          options={years.map((year) => ({ value: year, label: String(year) }))}
        />
      </div>
      <ActionsMenu
        items={[
          {
            label: 'Importar holerite',
            onSelect: () => {
              setActiveTab('MONTHLY');
              setShowImporter(true);
            },
          },
        ]}
      />
    </div>
  );

  return (
    <ProtectedRoute>
      <PageContainer as="section">
        <PageTitle title="Rendimentos do trabalho" sidebarAligned actions={<ShowFrom breakpoint="lg">{headerControls}</ShowFrom>} />
        <ShowBelow breakpoint="lg">
          <div className="mt-4">{headerControls}</div>
        </ShowBelow>

        <div className="mt-5 space-y-5">
          {activeTab === 'MONTHLY' && (
            <div className="space-y-5">
              {feedback && !showImporter && (
                <div role="status" className="rounded-[var(--radius-lg)] bg-[var(--success-subtle)] p-3 text-sm font-semibold text-[var(--success)]">
                  {feedback}
                </div>
              )}

              {showImporter && (
                <PayrollImportPanel
                  preview={preview}
                  rubrics={rubrics}
                  paymentType={paymentType}
                  supersedesId={supersedesId}
                  working={working}
                  feedback={feedback}
                  actionError={actionError}
                  showValues={showValues}
                  file={file}
                  setFile={setFile}
                  setPreview={setPreview}
                  setPaymentType={setPaymentType}
                  setSupersedesId={setSupersedesId}
                  onAnalyze={() => void generatePreview()}
                  onConfirm={() => void confirmImport()}
                  onClose={() => {
                    setShowImporter(false);
                    setPreview(null);
                    setFile(null);
                    setActionError('');
                  }}
                />
              )}

              {!summariesLoading && !summariesError && (
                <PayrollYearOverview
                  items={summaries.items}
                  year={monthlyYear}
                  hasMore={summaries.pageInfo.hasMore}
                  showValues={showValues}
                />
              )}

              <PayrollReviewQueue items={summaries.items} />

              <PayrollCompetencies
                items={summaries.items}
                loading={summariesLoading}
                error={summariesError}
                showValues={showValues}
                onRetry={() => void retrySummaries()}
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
