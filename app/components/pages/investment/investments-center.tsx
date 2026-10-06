'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaFileImport,
  FaHistory,
  FaPlus,
  FaSyncAlt,
  FaTrash,
  FaTimes,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { AnnualIncomeReportCard } from '@/app/components/pages/investment/annual-income-report-card';
import { InvestmentFiscalYearProvider } from '@/app/components/pages/investment/investment-fiscal-year-context';
import { AnnualFinancialStatementCard } from '@/app/components/pages/investment/annual-financial-statement-card';
import { AnnualTaxSupportReportCard } from '@/app/components/pages/investment/annual-tax-support-report-card';
import { EconomicIndicatorsCard } from '@/app/components/pages/investment/economic-indicators-card';
import { FiscalPendingCenterCard } from '@/app/components/pages/investment/fiscal-pending-center-card';
import { FiscalYearEndSnapshotCard } from '@/app/components/pages/investment/fiscal-year-end-snapshot-card';
import { ForeignInvestmentAnnualTaxCard } from '@/app/components/pages/investment/foreign-investment-annual-tax-card';
import { InvestmentTaxControlCard } from '@/app/components/pages/investment/investment-tax-control-card';
import { RealizedResultReportCard } from '@/app/components/pages/investment/realized-result-report-card';
import { TaxLossCarryforwardCard } from '@/app/components/pages/investment/tax-loss-carryforward-card';
import { InvestmentImportModal } from '@/app/components/pages/investment/investment-import-modal';
import { useDialogA11y } from '@/app/components/pages/investment/use-dialog-a11y';
import { ProtectedRoute } from '@/app/components/layout';
import { Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { groupInvestmentIncomesByAsset } from '@/app/lib/investments/investment-income-summary';
import {
  investmentService,
  type InvestmentAssetInput,
} from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentFiscalEventType,
  InvestmentTaxLocation,
  InvestmentIncome,
  InvestmentOperation,
  InvestmentOperationType,
  InvestmentPortfolio,
} from '@/app/types/investment';

const fiscalEventTypes: Array<{ value: InvestmentFiscalEventType; label: string }> = [
  { value: 'BUY', label: 'Compra' },
  { value: 'SELL', label: 'Venda' },
  { value: 'CUSTODY_TRANSFER_IN', label: 'Transferência de custódia · entrada' },
  { value: 'CUSTODY_TRANSFER_OUT', label: 'Transferência de custódia · saída' },
  { value: 'BONUS', label: 'Bonificação' },
  { value: 'SPLIT', label: 'Desdobramento' },
  { value: 'REVERSE_SPLIT', label: 'Grupamento' },
  { value: 'OTHER', label: 'Outro' },
];

const assetTypes: Array<{ value: InvestmentAssetType; label: string }> = [
  { value: 'STOCK', label: 'Ação' },
  { value: 'FII', label: 'FII' },
  { value: 'ETF', label: 'ETF' },
  { value: 'FIXED_INCOME', label: 'Renda fixa' },
  { value: 'CRYPTO', label: 'Cripto' },
  { value: 'FUND', label: 'Fundo' },
  { value: 'OTHER', label: 'Outro' },
];

function today() {
  const date = new Date();
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function typeLabel(type: InvestmentAssetType) {
  return assetTypes.find((item) => item.value === type)?.label ?? type;
}

function operationLabel(type: InvestmentOperationType) {
  return type === 'BUY' ? 'Compra' : 'Venda';
}

function fiscalEventLabel(type: InvestmentFiscalEventType) {
  return fiscalEventTypes.find((item) => item.value === type)?.label ?? type;
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function quoteDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function quantityLabel(value: string) {
  return value.replace('.', ',');
}

type AssetForm = {
  symbol: string;
  name: string;
  type: InvestmentAssetType;
  currency: SupportedCurrency;
  market: string;
  taxLocation: InvestmentTaxLocation;
};

type FiscalCostForm = {
  assetId: string;
  quantity: string;
  costBasis: string;
  date: string;
  reason: string;
  sourceInstitution: string;
};

type OperationForm = {
  type: InvestmentOperationType;
  accountId: string;
  assetId: string;
  quantity: string;
  unitPrice: string;
  fees: string;
  date: string;
  note: string;
};

const emptyAsset: AssetForm = {
  symbol: '',
  name: '',
  type: 'STOCK',
  currency: 'BRL',
  market: 'B3',
  taxLocation: 'BRAZIL',
};

const emptyFiscalCost: FiscalCostForm = {
  assetId: '',
  quantity: '',
  costBasis: '',
  date: today(),
  reason: '',
  sourceInstitution: '',
};

const emptyOperation: OperationForm = {
  type: 'BUY',
  accountId: '',
  assetId: '',
  quantity: '',
  unitPrice: '',
  fees: '',
  date: today(),
  note: '',
};

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
      <section className="mx-auto w-full max-w-6xl pb-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-extrabold tracking-tight text-[var(--foreground)]">
              Investimentos
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
              Posições derivadas das operações, com cotação B3 sob demanda via brapi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshQuotes}
              disabled={!hasQuoteablePositions || refreshingQuotes}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold disabled:opacity-40"
            >
              <FaSyncAlt
                className={refreshingQuotes ? 'animate-spin' : undefined}
                aria-hidden="true"
              />
              {refreshingQuotes ? 'Atualizando...' : 'Atualizar cotações'}
            </button>
            <button
              type="button"
              onClick={() => setImportModal(true)}
              disabled={!portfolio?.accounts.some(
                (account) => account.isActive && account.currency === 'BRL',
              )}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold disabled:opacity-40"
            >
              <FaFileImport aria-hidden="true" /> Importar
            </button>
            <button
              type="button"
              onClick={() => setAssetModal(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold"
            >
              <FaPlus aria-hidden="true" /> Novo ativo
            </button>
            <button
              type="button"
              onClick={openOperationModal}
              disabled={
                !portfolio?.accounts.some((account) => account.isActive) ||
                !portfolio?.assets.length
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-extrabold text-white disabled:opacity-40"
            >
              <FaPlus aria-hidden="true" /> Nova operação
            </button>
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
          >
            {error}
          </p>
        )}

        {quoteNotice && (
          <p
            role="status"
            className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]"
          >
            {quoteNotice}
          </p>
        )}

        <nav
          aria-label="Áreas de investimentos"
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
        >
          {[
            ['PORTFOLIO', 'Carteira'],
            ['FISCAL', 'Fiscal'],
            ['STATEMENTS', 'Informes / IR'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setArea(value as 'PORTFOLIO' | 'FISCAL' | 'STATEMENTS')
              }
              aria-pressed={area === value}
              className={
                area === value
                  ? 'min-h-11 shrink-0 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white'
                  : 'min-h-11 shrink-0 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--foreground)]'
              }
            >
              {label}
            </button>
          ))}
        </nav>

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
                <TotalsCard
                  totals={portfolio.totalsByCurrency}
                  showValues={showValues}
                />
                <EconomicIndicatorsCard />
                <PositionsCard
                  portfolio={portfolio}
                  showValues={showValues}
                  onHistory={openHistory}
                />
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
                <FiscalYearEndSnapshotCard showValues={showValues} />
              </>
            )}
          </div>
        )}

        {pendingDelete && (
          <ModalShell
            title={
              pendingDelete.kind === 'OPERATION'
                ? 'Excluir operação'
                : 'Excluir ativo'
            }
            onClose={() => setPendingDelete(null)}
          >
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {pendingDelete.kind === 'OPERATION'
                ? `A operação de ${pendingDelete.value.asset.symbol} será removida. A posição, o custo fiscal, resultados realizados e pendências derivadas serão recalculados. A exclusão será bloqueada se romper a posição posterior ou houver vínculo fiscal protegido.`
                : `O ativo ${pendingDelete.value.symbol} será removido somente se não possuir operações ou proventos históricos.`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={saving}
                className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={saving}
                className="min-h-12 rounded-full bg-[var(--expense)] px-4 font-extrabold text-white disabled:opacity-50"
              >
                {saving ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </ModalShell>
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
          <ModalShell title="Novo ativo" onClose={() => setAssetModal(false)}>
            <form onSubmit={handleAssetSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Código"
                  value={assetForm.symbol}
                  onChange={(event) =>
                    setAssetForm({ ...assetForm, symbol: event.target.value })
                  }
                  maxLength={24}
                  required
                  placeholder="PETR4"
                  disabled={saving}
                />
                <Input
                  label="Nome opcional"
                  value={assetForm.name}
                  onChange={(event) =>
                    setAssetForm({ ...assetForm, name: event.target.value })
                  }
                  maxLength={120}
                  placeholder="Petrobras PN"
                  disabled={saving}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField
                  label="Tipo"
                  value={assetForm.type}
                  disabled={saving}
                  onChange={(value) =>
                    setAssetForm({
                      ...assetForm,
                      type: value as InvestmentAssetType,
                    })
                  }
                  options={assetTypes}
                />
                <SelectField
                  label="Moeda"
                  value={assetForm.currency}
                  disabled={saving}
                  onChange={(value) => {
                    const currency = value as SupportedCurrency;
                    setAssetForm({
                      ...assetForm,
                      currency,
                      taxLocation: currency === 'BRL' ? 'BRAZIL' : 'ABROAD',
                    });
                  }}
                  options={currencyOptions}
                />
                <SelectField
                  label="Local fiscal"
                  value={assetForm.taxLocation}
                  disabled={saving}
                  onChange={(value) =>
                    setAssetForm({
                      ...assetForm,
                      taxLocation: value as InvestmentTaxLocation,
                    })
                  }
                  options={[
                    { value: 'BRAZIL', label: 'Brasil' },
                    { value: 'ABROAD', label: 'Exterior' },
                  ]}
                />
                <Input
                  label="Mercado opcional"
                  value={assetForm.market}
                  onChange={(event) =>
                    setAssetForm({ ...assetForm, market: event.target.value })
                  }
                  maxLength={40}
                  placeholder="B3"
                  disabled={saving}
                />
              </div>
              <ModalActions
                saving={saving}
                onClose={() => setAssetModal(false)}
                submitLabel="Criar ativo"
              />
            </form>
          </ModalShell>
        )}

        {operationModal && portfolio && (
          <ModalShell
            title="Nova operação"
            onClose={() => setOperationModal(false)}
          >
            <form onSubmit={handleOperationSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Operação"
                  value={operationForm.type}
                  disabled={saving}
                  onChange={(value) =>
                    setOperationForm({
                      ...operationForm,
                      type: value as InvestmentOperationType,
                    })
                  }
                  options={[
                    { value: 'BUY', label: 'Compra' },
                    { value: 'SELL', label: 'Venda' },
                  ]}
                />
                <SelectField
                  label="Conta"
                  value={operationForm.accountId}
                  disabled={saving}
                  onChange={(value) => {
                    const account = portfolio.accounts.find(
                      (item) => item.id === value,
                    );
                    const firstAsset = portfolio.assets.find(
                      (asset) => asset.currency === account?.currency,
                    );
                    setOperationForm({
                      ...operationForm,
                      accountId: value,
                      assetId: firstAsset?.id ?? '',
                    });
                  }}
                  options={portfolio.accounts
                    .filter((account) => account.isActive)
                    .map((account) => ({
                      value: account.id,
                      label: `${account.name} · ${account.currency}`,
                    }))}
                />
              </div>
              <SelectField
                label="Ativo"
                value={operationForm.assetId}
                disabled={saving}
                onChange={(value) =>
                  setOperationForm({ ...operationForm, assetId: value })
                }
                options={compatibleAssets.map((asset) => ({
                  value: asset.id,
                  label: `${asset.symbol} · ${asset.currency}`,
                }))}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Quantidade"
                  value={operationForm.quantity}
                  onChange={(event) =>
                    setOperationForm({
                      ...operationForm,
                      quantity: event.target.value,
                    })
                  }
                  inputMode="decimal"
                  required
                  placeholder="10,125"
                  disabled={saving}
                />
                <Input
                  label="Preço unitário"
                  value={operationForm.unitPrice}
                  onChange={(event) =>
                    setOperationForm({
                      ...operationForm,
                      unitPrice: event.target.value,
                    })
                  }
                  inputMode="decimal"
                  required
                  placeholder="35,90"
                  disabled={saving}
                />
                <Input
                  label="Taxas"
                  value={operationForm.fees}
                  onChange={(event) =>
                    setOperationForm({
                      ...operationForm,
                      fees: event.target.value,
                    })
                  }
                  inputMode="decimal"
                  placeholder="0,00"
                  disabled={saving}
                />
              </div>
              <Input
                label="Data"
                type="date"
                value={operationForm.date}
                onChange={(event) =>
                  setOperationForm({ ...operationForm, date: event.target.value })
                }
                required
                disabled={saving}
              />
              <Input
                label="Observação"
                value={operationForm.note}
                onChange={(event) =>
                  setOperationForm({ ...operationForm, note: event.target.value })
                }
                multiline
                rows={3}
                maxLength={500}
                disabled={saving}
              />
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                Esta operação altera somente a posição do ativo. Nenhuma transação financeira é criada automaticamente.
              </p>
              <ModalActions
                saving={saving}
                onClose={() => setOperationModal(false)}
                submitLabel="Registrar"
              />
            </form>
          </ModalShell>
        )}

        {fiscalCostModal && portfolio && (
          <ModalShell
            title={`Ajustar custo fiscal · ${
              portfolio.assets.find((asset) => asset.id === fiscalCostForm.assetId)
                ?.symbol ?? ''
            }`}
            onClose={() => setFiscalCostModal(false)}
          >
            <form onSubmit={handleFiscalCostSubmit} className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                Informe uma base fiscal conhecida para este ativo. O ajuste é
                auditável, não altera a operação original e não usa cotação de
                mercado para preencher custo ausente.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Quantidade fiscal"
                  value={fiscalCostForm.quantity}
                  onChange={(event) =>
                    setFiscalCostForm({
                      ...fiscalCostForm,
                      quantity: event.target.value,
                    })
                  }
                  inputMode="decimal"
                  required
                  placeholder="2100"
                  disabled={saving}
                />
                <Input
                  label="Custo fiscal total"
                  value={fiscalCostForm.costBasis}
                  onChange={(event) =>
                    setFiscalCostForm({
                      ...fiscalCostForm,
                      costBasis: event.target.value,
                    })
                  }
                  inputMode="decimal"
                  required
                  placeholder="R$ 20.000,00"
                  disabled={saving}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Data-base"
                  type="date"
                  value={fiscalCostForm.date}
                  onChange={(event) =>
                    setFiscalCostForm({
                      ...fiscalCostForm,
                      date: event.target.value,
                    })
                  }
                  required
                  disabled={saving}
                />
                <Input
                  label="Instituição de origem"
                  value={fiscalCostForm.sourceInstitution}
                  onChange={(event) =>
                    setFiscalCostForm({
                      ...fiscalCostForm,
                      sourceInstitution: event.target.value,
                    })
                  }
                  maxLength={120}
                  placeholder="Ex.: Rico"
                  disabled={saving}
                />
              </div>
              <Input
                label="Motivo do ajuste"
                value={fiscalCostForm.reason}
                onChange={(event) =>
                  setFiscalCostForm({
                    ...fiscalCostForm,
                    reason: event.target.value,
                  })
                }
                maxLength={500}
                required
                placeholder="Ex.: custo fiscal herdado antes da transferência de custódia"
                disabled={saving}
              />

              {portfolio.fiscalCostAdjustments.some(
                (item) => item.assetId === fiscalCostForm.assetId,
              ) && (
                <div className="rounded-[14px] border border-[var(--border)] p-3">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    Ajustes anteriores
                  </h3>
                  <div className="mt-2 space-y-2">
                    {portfolio.fiscalCostAdjustments
                      .filter((item) => item.assetId === fiscalCostForm.assetId)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="text-xs leading-relaxed text-[var(--text-muted)]"
                        >
                          <strong className="text-[var(--foreground)]">
                            {dateLabel(item.date)} · {quantityLabel(item.quantity)} un.
                          </strong>
                          {' · '}
                          {showValues
                            ? formatCurrency(
                                item.costBasisCents,
                                portfolio.assets.find(
                                  (asset) => asset.id === item.assetId,
                                )?.currency ?? 'BRL',
                              )
                            : '••••'}
                          {' · '}
                          {item.reason}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <ModalActions
                saving={saving}
                onClose={() => setFiscalCostModal(false)}
                submitLabel="Registrar ajuste"
              />
            </form>
          </ModalShell>
        )}

        {fiscalOperation && (
          <ModalShell
            title={`Classificação fiscal · ${fiscalOperation.asset.symbol}`}
            onClose={() => setFiscalOperation(null)}
          >
            <form onSubmit={handleFiscalSubmit} className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                A operação original é preservada. Esta classificação informa
                como ela deve ser tratada fiscalmente.
              </p>
              <SelectField
                label="Evento fiscal"
                value={fiscalType}
                disabled={saving}
                onChange={(value) =>
                  setFiscalType(value as InvestmentFiscalEventType)
                }
                options={fiscalEventTypes}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Instituição de origem"
                  value={fiscalSourceInstitution}
                  onChange={(event) =>
                    setFiscalSourceInstitution(event.target.value)
                  }
                  maxLength={120}
                  placeholder="Ex.: Rico"
                  disabled={saving}
                />
                <Input
                  label="Instituição de destino"
                  value={fiscalDestinationInstitution}
                  onChange={(event) =>
                    setFiscalDestinationInstitution(event.target.value)
                  }
                  maxLength={120}
                  placeholder="Ex.: Nubank Investimentos"
                  disabled={saving}
                />
              </div>
              <Input
                label="Motivo / observação"
                value={fiscalNote}
                onChange={(event) => setFiscalNote(event.target.value)}
                maxLength={500}
                placeholder="Ex.: transferência de custódia entre corretoras"
                disabled={saving}
              />
              <ModalActions
                saving={saving}
                onClose={() => setFiscalOperation(null)}
                submitLabel="Salvar classificação"
              />
            </form>
          </ModalShell>
        )}

        {historyAsset && (
          <ModalShell
            title={`Histórico · ${historyAsset.symbol}`}
            onClose={closeHistory}
          >
            {historyLoading ? (
              <PageLoading />
            ) : historyError ? (
              <div>
                <p role="alert" className="text-sm text-[var(--expense)]">
                  {historyError}
                </p>
                <button
                  type="button"
                  onClick={retryHistory}
                  className="mt-3 min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : historyOperations.length === 0 && historyIncomes.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum histórico registrado para este ativo.
              </p>
            ) : (
              <div className="space-y-5">
                {historyIncomes.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[var(--foreground)]">
                      Proventos
                    </h3>
                    <div className="divide-y divide-[var(--border)]">
                      {historyIncomes.map((income) => (
                        <IncomeRow
                          key={income.id}
                          income={income}
                          showValues={showValues}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {historyOperations.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[var(--foreground)]">
                      Operações
                    </h3>
                    <div className="divide-y divide-[var(--border)]">
                      {historyOperations.map((operation) => (
                        <OperationRow
                          key={operation.id}
                          operation={operation}
                          showValues={showValues}
                          onRemove={() => removeOperation(operation)}
                          onClassify={() => openFiscalModal(operation)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalShell>
        )}
      </section>
      </InvestmentFiscalYearProvider>
    </ProtectedRoute>
  );
}

function TotalsCard({
  totals,
  showValues,
}: {
  totals: InvestmentPortfolio['totalsByCurrency'];
  showValues: boolean;
}) {
  const entries = Object.entries(totals) as Array<[SupportedCurrency, number]>;
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <FaChartLine className="text-[var(--orbit-primary)]" aria-hidden="true" />
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Custo investido por moeda
        </h2>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Não é valor de mercado e não é somado automaticamente ao patrimônio.
      </p>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhuma posição aberta.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {entries.map(([currency, amount]) => (
            <div
              key={currency}
              className="rounded-[14px] bg-[var(--surface-raised)] p-4"
            >
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {currency}
              </span>
              <strong className="mt-1 block text-xl text-[var(--foreground)]">
                {showValues ? formatCurrency(amount, currency) : '••••'}
              </strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function FiscalCostCard({
  portfolio,
  showValues,
  onAdjust,
}: {
  portfolio: InvestmentPortfolio;
  showValues: boolean;
  onAdjust: (assetId: string) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Custo fiscal
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Base fiscal por ativo, independente da corretora e separada do
            valor de mercado.
          </p>
        </div>
      </div>

      {portfolio.fiscalPositions.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum ativo com histórico fiscal.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {portfolio.fiscalPositions.map((item) => (
            <div
              key={item.assetId}
              className="rounded-[14px] border border-[var(--border)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <span>
                  <strong className="block text-base text-[var(--foreground)]">
                    {item.symbol}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {typeLabel(item.assetType)} · {item.currency}
                  </span>
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    item.status === 'OK'
                      ? 'border-[var(--income)]/35 text-[var(--income)]'
                      : 'border-amber-500/35 text-amber-400'
                  }`}
                >
                  {item.status === 'OK' ? 'Conciliado' : 'Pendente'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <span className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Quantidade fiscal
                  </span>
                  <strong className="mt-1 block">
                    {quantityLabel(item.quantity)}
                  </strong>
                  {item.quantity !== item.economicQuantity && (
                    <span className="mt-1 block text-[11px] text-amber-400">
                      posição: {quantityLabel(item.economicQuantity)}
                    </span>
                  )}
                </span>
                <span className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Custo fiscal
                  </span>
                  <strong className="mt-1 block">
                    {showValues
                      ? formatCurrency(item.costBasisCents, item.currency)
                      : '••••'}
                  </strong>
                  {item.status === 'PENDING' && (
                    <span className="mt-1 block text-[11px] text-amber-400">
                      valor parcial
                    </span>
                  )}
                </span>
                <span className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Preço médio fiscal
                  </span>
                  <strong className="mt-1 block">
                    {item.averageUnitCostCents === null
                      ? 'Pendente'
                      : showValues
                        ? formatCurrency(
                            item.averageUnitCostCents,
                            item.currency,
                          )
                        : '••••'}
                  </strong>
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                <span>
                  Custo econômico:{' '}
                  <strong className="text-[var(--foreground)]">
                    {showValues
                      ? formatCurrency(item.economicCostCents, item.currency)
                      : '••••'}
                  </strong>
                </span>
                <span>
                  Mercado:{' '}
                  <strong className="text-[var(--foreground)]">
                    {item.marketValueCents === null
                      ? 'Sem cotação'
                      : showValues
                        ? formatCurrency(item.marketValueCents, item.currency)
                        : '••••'}
                  </strong>
                </span>
              </div>

              {item.pending.length > 0 && (
                <div className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                  {item.pending[0]?.message}
                  {item.pending.length > 1
                    ? ` +${item.pending.length - 1} pendência(s).`
                    : ''}
                </div>
              )}

              <button
                type="button"
                onClick={() => onAdjust(item.assetId)}
                className="mt-3 min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
              >
                {item.lastAdjustmentId ? 'Novo ajuste fiscal' : 'Informar custo fiscal'}
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function PositionsCard({
  portfolio,
  showValues,
  onHistory,
}: {
  portfolio: InvestmentPortfolio;
  showValues: boolean;
  onHistory: (assetId: string) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Posições</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Quantidade e custo médio derivados das operações.
      </p>
      {portfolio.positions.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhuma posição aberta.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {portfolio.positions.map((position) => (
            <button
              key={`${position.accountId}-${position.assetId}`}
              type="button"
              onClick={() => onHistory(position.assetId)}
              className="rounded-[14px] border border-[var(--border)] p-4 text-left hover:border-[var(--orbit-primary)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span>
                  <strong className="block text-base text-[var(--foreground)]">
                    {position.symbol}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {position.accountName} · {typeLabel(position.assetType)}
                  </span>
                </span>
                <span className="text-right">
                  <strong className="block text-sm text-[var(--foreground)]">
                    {quantityLabel(position.quantity)}
                  </strong>
                  <span className="text-xs text-[var(--text-muted)]">
                    unidades
                  </span>
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <span className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Custo médio
                  </span>
                  <strong className="mt-1 block">
                    {showValues
                      ? formatCurrency(
                          position.averageUnitCostCents,
                          position.currency,
                        )
                      : '••••'}
                  </strong>
                </span>
                <span className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Custo da posição
                  </span>
                  <strong className="mt-1 block">
                    {showValues
                      ? formatCurrency(position.investedCents, position.currency)
                      : '••••'}
                  </strong>
                </span>
                <span className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Valor de mercado
                  </span>
                  <strong className="mt-1 block">
                    {position.marketValueCents === null
                      ? 'Sem cotação'
                      : showValues
                        ? formatCurrency(
                            position.marketValueCents,
                            position.currency,
                          )
                        : '••••'}
                  </strong>
                  {position.quote && (
                    <span className="mt-1 block text-[11px] leading-relaxed text-[var(--text-muted)]">
                      {showValues
                        ? `${formatCurrency(
                            position.quote.priceCents,
                            position.currency,
                          )} / un. · `
                        : ''}
                      {position.quote.isStale ? 'desatualizada' : 'atualizada'} ·{' '}
                      {quoteDateLabel(position.quote.referenceAt)}
                    </span>
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function IncomesCard({
  incomes,
  totals,
  showValues,
  onHistory,
}: {
  incomes: InvestmentIncome[];
  totals: InvestmentPortfolio['incomeTotalsByCurrency'];
  showValues: boolean;
  onHistory: (assetId: string) => void;
}) {
  const entries = Object.entries(totals) as Array<[SupportedCurrency, number]>;
  const byAsset = groupInvestmentIncomesByAsset(incomes);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Proventos</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Rendimentos recebidos, sem alterar o saldo das contas.
          </p>
        </div>
        {entries.length > 0 && (
          <div className="text-right">
            {entries.map(([currency, amount]) => (
              <strong
                key={currency}
                className="block text-sm text-[var(--foreground)]"
              >
                {showValues ? formatCurrency(amount, currency) : '••••'} {currency}
              </strong>
            ))}
          </div>
        )}
      </div>

      {byAsset.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum provento registrado.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {byAsset.map((item) => (
              <button
                key={item.assetId}
                type="button"
                onClick={() => onHistory(item.assetId)}
                className="rounded-[14px] border border-[var(--border)] p-4 text-left hover:border-[var(--orbit-primary)]/40"
              >
                <strong className="block text-sm text-[var(--foreground)]">
                  {item.symbol}
                </strong>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  {item.count} pagamento(s)
                </span>
                <strong className="mt-3 block text-base text-[var(--foreground)]">
                  {showValues
                    ? formatCurrency(item.amountCents, item.currency)
                    : '••••'}
                </strong>
              </button>
            ))}
        </div>
      )}
    </article>
  );
}

function AssetsCard({
  assets,
  onHistory,
  onRemove,
}: {
  assets: InvestmentAsset[];
  onHistory: (assetId: string) => void;
  onRemove: (asset: InvestmentAsset) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Ativos</h2>
      {assets.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Cadastre um ativo para começar.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-[var(--border)]">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex min-h-[64px] items-center justify-between gap-3 py-2"
            >
              <button
                type="button"
                onClick={() => onHistory(asset.id)}
                className="min-w-0 flex-1 text-left"
              >
                <strong className="block truncate text-sm text-[var(--foreground)]">
                  {asset.symbol}
                </strong>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {asset.name || typeLabel(asset.type)} · {asset.currency}
                  {asset.market ? ` · ${asset.market}` : ''}
                  {asset.taxLocation === 'ABROAD' ? ' · Exterior' : ' · Brasil'}
                </span>
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                {asset.operationCount} op.
              </span>
              {asset.operationCount === 0 && (
                <button
                  type="button"
                  onClick={() => onRemove(asset)}
                  aria-label={`Excluir ativo ${asset.symbol}`}
                  className="grid h-10 w-10 place-items-center rounded-full text-[var(--expense)]"
                >
                  <FaTrash aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function OperationsCard({
  operations,
  showValues,
  onRemove,
  onClassify,
}: {
  operations: InvestmentOperation[];
  showValues: boolean;
  onRemove: (operation: InvestmentOperation) => void;
  onClassify: (operation: InvestmentOperation) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <FaHistory className="text-[var(--orbit-primary)]" aria-hidden="true" />
        <h2 className="text-lg font-bold text-[var(--foreground)]">Operações</h2>
      </div>
      {operations.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhuma operação registrada.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-[var(--border)]">
          {operations.map((operation) => (
            <OperationRow
              key={operation.id}
              operation={operation}
              showValues={showValues}
              onRemove={() => onRemove(operation)}
              onClassify={() => onClassify(operation)}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function OperationRow({
  operation,
  showValues,
  onRemove,
  onClassify,
}: {
  operation: InvestmentOperation;
  showValues: boolean;
  onRemove: () => void;
  onClassify: () => void;
}) {
  return (
    <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2">
      <span className="min-w-0">
        <strong className="block truncate text-sm text-[var(--foreground)]">
          {operationLabel(operation.type)} · {operation.asset.symbol}
        </strong>
        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
          {dateLabel(operation.date)} · {operation.account.name} ·{' '}
          {quantityLabel(operation.quantity)} un.
        </span>
        {operation.fiscalEvent && (
          <span className="mt-1 block truncate text-[11px] text-[var(--text-muted)]">
            Fiscal: {fiscalEventLabel(operation.fiscalEvent.type)}
            {operation.fiscalEvent.classificationSource === 'USER'
              ? ' · revisado'
              : ''}
          </span>
        )}
      </span>
      <span className="text-right">
        <strong className="block text-sm text-[var(--foreground)]">
          {showValues
            ? formatCurrency(
                operation.unitPriceCents,
                operation.asset.currency,
              )
            : '••••'}
        </strong>
        <span className="text-xs text-[var(--text-muted)]">por unidade</span>
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClassify}
          className="min-h-10 rounded-full border border-[var(--border)] px-3 text-xs font-bold text-[var(--foreground)]"
        >
          Fiscal
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Excluir operação"
          className="grid h-10 w-10 place-items-center rounded-full text-[var(--expense)]"
        >
          <FaTrash aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

function IncomeRow({
  income,
  showValues,
}: {
  income: InvestmentIncome;
  showValues: boolean;
}) {
  return (
    <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
      <span className="min-w-0">
        <strong className="block truncate text-sm text-[var(--foreground)]">
          {income.type === 'DIVIDEND'
            ? 'Dividendo'
            : income.type === 'INTEREST'
              ? 'Juros'
              : income.type === 'INCOME'
                ? 'Rendimento'
                : 'Provento'}
        </strong>
        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
          {dateLabel(income.date)} · {quantityLabel(income.quantity)} un.
        </span>
      </span>
      <span className="text-right">
        <strong className="block text-sm text-[var(--foreground)]">
          {showValues
            ? formatCurrency(income.netAmountCents, income.asset.currency)
            : '••••'}
        </strong>
        <span className="text-xs text-[var(--text-muted)]">
          {showValues
            ? `${formatCurrency(
                income.unitValueCents,
                income.asset.currency,
              )} / un.`
            : 'por unidade'}
        </span>
      </span>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="ds-label mb-2 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ds-control min-h-11 w-full px-3"
        disabled={disabled}
        required
      >
        <option value="" disabled>
          Selecione
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalActions({
  saving,
  onClose,
  submitLabel,
}: {
  saving: boolean;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-50"
      >
        {saving ? 'Salvando...' : submitLabel}
      </button>
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useDialogA11y(onClose);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/55 p-4">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="w-full max-w-2xl rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-elevated)]"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold text-[var(--foreground)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
