'use client';

import dynamic from 'next/dynamic';
import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus, FaSyncAlt } from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { InvestmentFiscalYearProvider } from '@/app/components/pages/investment/investment-fiscal-year-context';
import { EconomicIndicatorsCard } from '@/app/components/pages/investment/economic-indicators-card';

import { ProtectedRoute } from '@/app/components/layout';
import { Button, Chip, ChipRow } from '@/app/components/ui';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import { useAuth } from '@/app/context';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';

import { investmentService, type InvestmentAssetInput } from '@/app/services/investment-service';
import type { InvestmentAsset, InvestmentFiscalEventType, InvestmentIncome, InvestmentOperation, InvestmentPortfolio } from '@/app/types/investment';
import { AssetForm, FiscalCostForm, IncomeForm, OperationForm, emptyAsset, emptyFiscalCost, emptyIncome, emptyOperation, today } from '@/app/components/pages/investment/investments-helpers';
import { AssetModal, DeleteConfirmModal, FiscalClassificationModal, FiscalCostModal, HistoryModal, IncomeModal, OperationModal } from '@/app/components/pages/investment/investment-modals';
import { AssetsCard, FiscalCostCard, IncomesCard, OperationsCard } from '@/app/components/pages/investment/investment-cards';
import { InvestmentActionsMenu } from '@/app/components/pages/investment/investment-actions-menu';
import { PortfolioSummary } from '@/app/components/pages/investment/portfolio-summary';
import { PositionsList } from '@/app/components/pages/investment/positions-list';
import { portfolioCurrencies, summarizeCurrency } from '@/app/components/pages/investment/investments-model';


// Áreas Fiscal/Informes e o modal de importação só carregam quando usados (dados já são sob demanda).
function cardFallback() {
  return function CardFallback() {
    return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" aria-hidden="true" />;
  };
}
const AnnualIncomeReportCard = dynamic(() => import('@/app/components/pages/investment/annual-income-report-card').then((m) => m.AnnualIncomeReportCard), { ssr: false, loading: cardFallback() });
const AnnualFinancialStatementCard = dynamic(() => import('@/app/components/pages/investment/annual-financial-statement-card').then((m) => m.AnnualFinancialStatementCard), { ssr: false, loading: cardFallback() });
const AnnualTaxSupportReportCard = dynamic(() => import('@/app/components/pages/investment/annual-tax-support-report-card').then((m) => m.AnnualTaxSupportReportCard), { ssr: false, loading: cardFallback() });
const CustodyStatementCard = dynamic(() => import('@/app/components/pages/investment/custody-statement-card').then((m) => m.CustodyStatementCard), { ssr: false, loading: cardFallback() });
const FiscalPendingCenterCard = dynamic(() => import('@/app/components/pages/investment/fiscal-pending-center-card').then((m) => m.FiscalPendingCenterCard), { ssr: false, loading: cardFallback() });
const FiscalYearEndSnapshotCard = dynamic(() => import('@/app/components/pages/investment/fiscal-year-end-snapshot-card').then((m) => m.FiscalYearEndSnapshotCard), { ssr: false, loading: cardFallback() });
const ForeignInvestmentAnnualTaxCard = dynamic(() => import('@/app/components/pages/investment/foreign-investment-annual-tax-card').then((m) => m.ForeignInvestmentAnnualTaxCard), { ssr: false, loading: cardFallback() });
const InvestmentTaxControlCard = dynamic(() => import('@/app/components/pages/investment/investment-tax-control-card').then((m) => m.InvestmentTaxControlCard), { ssr: false, loading: cardFallback() });
const RealizedResultReportCard = dynamic(() => import('@/app/components/pages/investment/realized-result-report-card').then((m) => m.RealizedResultReportCard), { ssr: false, loading: cardFallback() });
const TaxLossCarryforwardCard = dynamic(() => import('@/app/components/pages/investment/tax-loss-carryforward-card').then((m) => m.TaxLossCarryforwardCard), { ssr: false, loading: cardFallback() });
const InvestmentImportModal = dynamic(() => import('@/app/components/pages/investment/investment-import-modal').then((m) => m.InvestmentImportModal), { ssr: false });

export default function InvestmentsCenter() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [portfolio, setPortfolio] = useState<InvestmentPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);
  const [quoteNotice, setQuoteNotice] = useState('');
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAsset);
  const [operationForm, setOperationForm] =
    useState<OperationForm>(emptyOperation);
  const [assetModal, setAssetModal] = useState(false);
  const [operationModal, setOperationModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState<IncomeForm>(emptyIncome);
  const [incomeModal, setIncomeModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [historyAssetId, setHistoryAssetId] = useState<string | null>(null);
  const [historyOperations, setHistoryOperations] = useState<InvestmentOperation[]>([]);
  const [historyIncomes, setHistoryIncomes] = useState<InvestmentIncome[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [fiscalOperation, setFiscalOperation] =
    useState<InvestmentOperation | null>(null);
  const [fiscalType, setFiscalType] =
    useState<InvestmentFiscalEventType>('BUY');
  const [fiscalSourceInstitution, setFiscalSourceInstitution] = useState('');
  const [fiscalDestinationInstitution, setFiscalDestinationInstitution] =
    useState('');
  const [fiscalNote, setFiscalNote] = useState('');
  const [fiscalCostForm, setFiscalCostForm] =
    useState<FiscalCostForm>(emptyFiscalCost);
  const [fiscalCostModal, setFiscalCostModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('BRL');
  const [area, setArea] = useState<'PORTFOLIO' | 'FISCAL' | 'STATEMENTS'>(
    'PORTFOLIO',
  );
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: 'OPERATION'; value: InvestmentOperation }
    | { kind: 'ASSET'; value: InvestmentAsset }
    | null
  >(null);

  const load = useCallback(async () => {
    try {
      const response = await investmentService.getPortfolio();
      setPortfolio(response.data);
      setError('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar os investimentos',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void investmentService
      .getPortfolio()
      .then((response) => {
        if (cancelled) return;
        setPortfolio(response.data);
        setError('');
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar os investimentos',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyAssetId) return;

    let cancelled = false;
    void Promise.all([
      investmentService.getOperationsHistory(historyAssetId, 1, 100),
      investmentService.getIncomesHistory(historyAssetId, 1, 100),
    ])
      .then(([operations, incomes]) => {
        if (cancelled) return;
        setHistoryOperations(operations.data.items);
        setHistoryIncomes(incomes.data.items);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setHistoryError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar o histórico',
        );
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [historyAssetId, historyRefresh]);

  function openHistory(assetId: string) {
    setHistoryLoading(true);
    setHistoryError('');
    setHistoryOperations([]);
    setHistoryIncomes([]);
    setHistoryAssetId(assetId);
  }

  function closeHistory() {
    setHistoryAssetId(null);
    setHistoryOperations([]);
    setHistoryIncomes([]);
    setHistoryError('');
  }

  function retryHistory() {
    setHistoryLoading(true);
    setHistoryError('');
    setHistoryRefresh((value) => value + 1);
  }

  const selectedAccount = portfolio?.accounts.find(
    (account) => account.id === operationForm.accountId,
  );

  const incomeAccount = portfolio?.accounts.find(
    (account) => account.id === incomeForm.accountId,
  );
  const incomeCompatibleAssets = useMemo(
    () =>
      portfolio?.assets.filter(
        (asset) => !incomeAccount || asset.currency === incomeAccount.currency,
      ) ?? [],
    [portfolio?.assets, incomeAccount],
  );

  const compatibleAssets = useMemo(
    () =>
      portfolio?.assets.filter(
        (asset) =>
          !selectedAccount || asset.currency === selectedAccount.currency,
      ) ?? [],
    [portfolio, selectedAccount],
  );

  const historyAsset = portfolio?.assets.find(
    (asset) => asset.id === historyAssetId,
  );
  const currencies = useMemo(() => (portfolio ? portfolioCurrencies(portfolio) : []), [portfolio]);
  const activeCurrency = currencies.includes(selectedCurrency) ? selectedCurrency : (currencies[0] ?? selectedCurrency);
  const summary = useMemo(
    () => (portfolio ? summarizeCurrency(portfolio.positions, activeCurrency) : null),
    [portfolio, activeCurrency],
  );
  const hasQuoteablePositions =
    portfolio?.positions.some((position) => {
      const asset = portfolio.assets.find((item) => item.id === position.assetId);
      return (
        position.currency === 'BRL' &&
        ['STOCK', 'FII', 'ETF'].includes(position.assetType) &&
        (!asset?.market || asset.market === 'B3')
      );
    }) ?? false;

  async function handleAssetSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const input: InvestmentAssetInput = {
        symbol: assetForm.symbol,
        name: assetForm.name || null,
        type: assetForm.type,
        currency: assetForm.currency,
        market: assetForm.market || null,
        taxLocation: assetForm.taxLocation,
      };
      await investmentService.createAsset(input);
      setAssetForm(emptyAsset);
      setAssetModal(false);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível criar o ativo',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleOperationSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const unitPriceCents = parseMoneyInputToCents(operationForm.unitPrice);
    const feesCents = operationForm.fees
      ? parseMoneyInputToCents(operationForm.fees)
      : 0;

    if (unitPriceCents === null || unitPriceCents <= 0) {
      setError('Informe um preço unitário válido.');
      return;
    }
    if (feesCents === null || feesCents < 0) {
      setError('Informe taxas válidas.');
      return;
    }

    setSaving(true);
    try {
      await investmentService.createOperation({
        type: operationForm.type,
        accountId: operationForm.accountId,
        assetId: operationForm.assetId,
        quantity: operationForm.quantity,
        unitPriceCents,
        feesCents,
        date: operationForm.date,
        note: operationForm.note || null,
      });
      setOperationForm({ ...emptyOperation, date: today() });
      setOperationModal(false);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível registrar a operação',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleIncomeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const unitValueCents = parseMoneyInputToCents(incomeForm.unitValue);
    const netAmountCents = parseMoneyInputToCents(incomeForm.netAmount);

    if (unitValueCents === null || unitValueCents <= 0) {
      setError('Informe um valor por cota válido.');
      return;
    }
    if (netAmountCents === null || netAmountCents <= 0) {
      setError('Informe um valor líquido válido.');
      return;
    }

    setSaving(true);
    try {
      await investmentService.createIncome({
        type: incomeForm.type,
        accountId: incomeForm.accountId,
        assetId: incomeForm.assetId,
        quantity: incomeForm.quantity,
        unitValueCents,
        netAmountCents,
        date: incomeForm.date,
        note: incomeForm.note || null,
      });
      setIncomeForm({ ...emptyIncome, date: today() });
      setIncomeModal(false);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível registrar o provento',
      );
    } finally {
      setSaving(false);
    }
  }

  function openIncomeModal() {
    const firstAccount = portfolio?.accounts.find((account) => account.isActive);
    const firstAsset = portfolio?.assets.find(
      (asset) => !firstAccount || asset.currency === firstAccount.currency,
    );
    setIncomeForm({
      ...emptyIncome,
      accountId: firstAccount?.id ?? '',
      assetId: firstAsset?.id ?? '',
      date: today(),
    });
    setIncomeModal(true);
  }

  function openFiscalModal(operation: InvestmentOperation) {
    setFiscalOperation(operation);
    setFiscalType(operation.fiscalEvent?.type ?? operation.type);
    setFiscalSourceInstitution(
      operation.fiscalEvent?.sourceInstitution ?? '',
    );
    setFiscalDestinationInstitution(
      operation.fiscalEvent?.destinationInstitution ?? '',
    );
    setFiscalNote(operation.fiscalEvent?.reclassificationNote ?? '');
  }

  async function handleFiscalSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!fiscalOperation) return;

    setError('');
    setSaving(true);
    try {
      await investmentService.updateOperationFiscalEvent(fiscalOperation.id, {
        type: fiscalType,
        sourceInstitution: fiscalSourceInstitution || null,
        destinationInstitution: fiscalDestinationInstitution || null,
        reclassificationNote: fiscalNote || null,
      });
      setFiscalOperation(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível atualizar a classificação fiscal',
      );
    } finally {
      setSaving(false);
    }
  }

  function openFiscalCostModal(assetId: string) {
    const fiscal = portfolio?.fiscalPositions.find(
      (item) => item.assetId === assetId,
    );
    setFiscalCostForm({
      ...emptyFiscalCost,
      assetId,
      quantity: fiscal?.economicQuantity ?? '',
      date: today(),
    });
    setFiscalCostModal(true);
  }

  async function handleFiscalCostSubmit(event: React.FormEvent) {
    event.preventDefault();
    const costBasisCents = parseMoneyInputToCents(fiscalCostForm.costBasis);
    if (costBasisCents === null || costBasisCents < 0) {
      setError('Informe um custo fiscal válido.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await investmentService.createFiscalCostAdjustment({
        assetId: fiscalCostForm.assetId,
        quantity: fiscalCostForm.quantity,
        costBasisCents,
        date: fiscalCostForm.date,
        reason: fiscalCostForm.reason,
        sourceInstitution: fiscalCostForm.sourceInstitution || null,
      });
      setFiscalCostModal(false);
      setFiscalCostForm(emptyFiscalCost);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível registrar o ajuste de custo fiscal',
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshQuotes() {
    setError('');
    setQuoteNotice('');
    setRefreshingQuotes(true);
    try {
      const response = await investmentService.refreshQuotes();
      await load();

      const { refreshed, cached, failed } = response.data;
      if (failed.length > 0) {
        const symbols = failed.map((item) => item.symbol).join(', ');
        const detail = failed[0]?.message ? ` ${failed[0].message}` : '';
        setQuoteNotice(
          `${refreshed} cotação(ões) atualizada(s), ${cached} em cache. Falha em ${symbols}.${detail}`,
        );
      } else if (refreshed > 0) {
        setQuoteNotice(
          `${refreshed} cotação(ões) atualizada(s); ${cached} já estava(m) válida(s) no cache.`,
        );
      } else if (cached > 0) {
        setQuoteNotice('As cotações já estão atualizadas no cache.');
      } else {
        setQuoteNotice('Não há posições B3 elegíveis para cotação.');
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível atualizar as cotações',
      );
    } finally {
      setRefreshingQuotes(false);
    }
  }

  function removeOperation(operation: InvestmentOperation) {
    setPendingDelete({ kind: 'OPERATION', value: operation });
  }

  function removeAsset(asset: InvestmentAsset) {
    setPendingDelete({ kind: 'ASSET', value: asset });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setSaving(true);
    setError('');
    try {
      if (pendingDelete.kind === 'OPERATION') {
        await investmentService.removeOperation(pendingDelete.value.id);
      } else {
        await investmentService.removeAsset(pendingDelete.value.id);
      }
      setPendingDelete(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível concluir a exclusão',
      );
    } finally {
      setSaving(false);
    }
  }

  function openOperationModal() {
    const firstAccount = portfolio?.accounts.find((account) => account.isActive);
    const firstAsset = portfolio?.assets.find(
      (asset) => !firstAccount || asset.currency === firstAccount.currency,
    );
    setOperationForm({
      ...emptyOperation,
      accountId: firstAccount?.id ?? '',
      assetId: firstAsset?.id ?? '',
      date: today(),
    });
    setOperationModal(true);
  }

  return (
    <ProtectedRoute>
      <InvestmentFiscalYearProvider>
      <PageContainer as="section">
        <PageTitle title="Investimentos" description="Posições derivadas das operações, com cotação B3 sob demanda via brapi." actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              icon={<FaSyncAlt className={refreshingQuotes ? 'animate-spin' : undefined} aria-hidden="true" />}
              onClick={refreshQuotes}
              disabled={!hasQuoteablePositions || refreshingQuotes}
            >
              {refreshingQuotes ? 'Atualizando...' : 'Atualizar cotações'}
            </Button>
            <Button
              icon={<FaPlus aria-hidden="true" />}
              onClick={openOperationModal}
              disabled={
                !portfolio?.accounts.some((account) => account.isActive) ||
                !portfolio?.assets.length
              }
            >
              Nova operação
            </Button>
            <InvestmentActionsMenu
              items={[
                { label: 'Novo ativo', onSelect: () => setAssetModal(true) },
                {
                  label: 'Novo provento',
                  onSelect: openIncomeModal,
                  disabled: !portfolio?.accounts.some((account) => account.isActive) || !portfolio?.assets.length,
                },
                {
                  label: 'Importar extrato',
                  onSelect: () => setImportModal(true),
                  disabled: !portfolio?.accounts.some((account) => account.isActive && account.currency === 'BRL'),
                },
              ]}
            />
          </div>
        } />

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
          >
            {error}
          </p>
        )}

        {quoteNotice && (
          <p
            role="status"
            className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]"
          >
            {quoteNotice}
          </p>
        )}

        <ChipRow label="Áreas de investimentos" className="mt-5">
          {[
            ['PORTFOLIO', 'Carteira'],
            ['FISCAL', 'Fiscal'],
            ['STATEMENTS', 'Informes / IR'],
          ].map(([value, label]) => (
            <Chip
              key={value}
              selected={area === value}
              onClick={() => setArea(value as 'PORTFOLIO' | 'FISCAL' | 'STATEMENTS')}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>

        {loading ? (
          <div className="mt-5">
            <PageLoading />
          </div>
        ) : !portfolio ? null : (
          <div className="mt-5 space-y-4">
            {portfolio.accounts.length === 0 && (
              <div className="ds-panel p-6">
                <PageEmpty title="Crie uma conta de investimento primeiro" />
                <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
                  Operações só podem ser vinculadas a contas do tipo investimento.
                </p>
              </div>
            )}

            {area === 'PORTFOLIO' && (
              <>
                {summary && (
                  <PortfolioSummary
                    summary={summary}
                    incomeTotal={portfolio.incomeTotalsByCurrency[activeCurrency] ?? 0}
                    currencies={currencies}
                    onCurrency={setSelectedCurrency}
                    showValues={showValues}
                  />
                )}
                <EconomicIndicatorsCard />
                {summary && (
                  <PositionsList
                    ranked={summary.ranked}
                    showValues={showValues}
                    onHistory={openHistory}
                  />
                )}
                <IncomesCard
                  incomes={portfolio.incomes}
                  totals={portfolio.incomeTotalsByCurrency}
                  showValues={showValues}
                  onHistory={openHistory}
                />
                <AssetsCard
                  assets={portfolio.assets}
                  onHistory={openHistory}
                  onRemove={removeAsset}
                />
                <OperationsCard
                  operations={portfolio.operations}
                  showValues={showValues}
                  onRemove={removeOperation}
                  onClassify={openFiscalModal}
                />
              </>
            )}

            {area === 'FISCAL' && (
              <>
                <FiscalCostCard
                  portfolio={portfolio}
                  showValues={showValues}
                  onAdjust={openFiscalCostModal}
                />
                <RealizedResultReportCard showValues={showValues} />
                <TaxLossCarryforwardCard showValues={showValues} />
                <InvestmentTaxControlCard showValues={showValues} />
                <ForeignInvestmentAnnualTaxCard showValues={showValues} />
                <FiscalPendingCenterCard />
              </>
            )}

            {area === 'STATEMENTS' && (
              <>
                <AnnualIncomeReportCard showValues={showValues} />
                <AnnualFinancialStatementCard
                  showValues={showValues}
                  onInspectAsset={openHistory}
                  onBaselineApplied={load}
                />
                <AnnualTaxSupportReportCard showValues={showValues} />
                <CustodyStatementCard showValues={showValues} />
                <FiscalYearEndSnapshotCard showValues={showValues} />
              </>
            )}
          </div>
        )}

        {pendingDelete && (
          <DeleteConfirmModal
            pendingDelete={pendingDelete}
            saving={saving}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => void confirmDelete()}
          />
        )}

        {importModal && portfolio && (
          <InvestmentImportModal
            accounts={portfolio.accounts}
            showValues={showValues}
            onClose={() => setImportModal(false)}
            onImported={load}
          />
        )}

        {assetModal && (
          <AssetModal
            assetForm={assetForm}
            setAssetForm={setAssetForm}
            saving={saving}
            onSubmit={handleAssetSubmit}
            onClose={() => setAssetModal(false)}
          />
        )}

        {operationModal && portfolio && (
          <OperationModal
            portfolio={portfolio}
            operationForm={operationForm}
            setOperationForm={setOperationForm}
            compatibleAssets={compatibleAssets}
            saving={saving}
            onSubmit={handleOperationSubmit}
            onClose={() => setOperationModal(false)}
          />
        )}

        {incomeModal && portfolio && (
          <IncomeModal
            portfolio={portfolio}
            incomeForm={incomeForm}
            setIncomeForm={setIncomeForm}
            compatibleAssets={incomeCompatibleAssets}
            saving={saving}
            onSubmit={handleIncomeSubmit}
            onClose={() => setIncomeModal(false)}
          />
        )}

        {fiscalCostModal && portfolio && (
          <FiscalCostModal
            portfolio={portfolio}
            fiscalCostForm={fiscalCostForm}
            setFiscalCostForm={setFiscalCostForm}
            showValues={showValues}
            saving={saving}
            onSubmit={handleFiscalCostSubmit}
            onClose={() => setFiscalCostModal(false)}
          />
        )}

        {fiscalOperation && (
          <FiscalClassificationModal
            fiscalOperation={fiscalOperation}
            fiscalType={fiscalType}
            setFiscalType={setFiscalType}
            fiscalSourceInstitution={fiscalSourceInstitution}
            setFiscalSourceInstitution={setFiscalSourceInstitution}
            fiscalDestinationInstitution={fiscalDestinationInstitution}
            setFiscalDestinationInstitution={setFiscalDestinationInstitution}
            fiscalNote={fiscalNote}
            setFiscalNote={setFiscalNote}
            saving={saving}
            onSubmit={handleFiscalSubmit}
            onClose={() => setFiscalOperation(null)}
          />
        )}

        {historyAsset && (
          <HistoryModal
            historyAsset={historyAsset}
            historyLoading={historyLoading}
            historyError={historyError}
            historyOperations={historyOperations}
            historyIncomes={historyIncomes}
            showValues={showValues}
            onRetry={retryHistory}
            onClose={closeHistory}
            onRemoveOperation={removeOperation}
            onClassify={openFiscalModal}
          />
        )}
      </PageContainer>
      </InvestmentFiscalYearProvider>
    </ProtectedRoute>
  );
}
