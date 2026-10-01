'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaHistory,
  FaPlus,
  FaTrash,
  FaTimes,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import {
  investmentService,
  type InvestmentAssetInput,
} from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentOperation,
  InvestmentOperationType,
  InvestmentPortfolio,
} from '@/app/types/investment';

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
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function typeLabel(type: InvestmentAssetType) {
  return assetTypes.find((item) => item.value === type)?.label ?? type;
}

function operationLabel(type: InvestmentOperationType) {
  return type === 'BUY' ? 'Compra' : 'Venda';
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
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
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAsset);
  const [operationForm, setOperationForm] =
    useState<OperationForm>(emptyOperation);
  const [assetModal, setAssetModal] = useState(false);
  const [operationModal, setOperationModal] = useState(false);
  const [historyAssetId, setHistoryAssetId] = useState<string | null>(null);

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
    void load();
  }, [load]);

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
  const historyOperations =
    portfolio?.operations.filter(
      (operation) => operation.asset.id === historyAssetId,
    ) ?? [];

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

  async function removeOperation(operation: InvestmentOperation) {
    if (
      !window.confirm(
        `Excluir a ${operationLabel(operation.type).toLowerCase()} de ${operation.asset.symbol}?`,
      )
    ) {
      return;
    }
    setError('');
    try {
      await investmentService.removeOperation(operation.id);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível excluir a operação',
      );
    }
  }

  async function removeAsset(asset: InvestmentAsset) {
    if (!window.confirm(`Excluir o ativo ${asset.symbol}?`)) return;
    setError('');
    try {
      await investmentService.removeAsset(asset.id);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível excluir o ativo',
      );
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
      <section className="mx-auto w-full max-w-6xl pb-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-extrabold tracking-tight text-[var(--foreground)]">
              Investimentos
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
              Ativos, posições e operações derivados do seu histórico, sem cotação externa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              disabled={!portfolio?.accounts.length || !portfolio?.assets.length}
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

            <TotalsCard
              totals={portfolio.totalsByCurrency}
              showValues={showValues}
            />

            <PositionsCard
              portfolio={portfolio}
              showValues={showValues}
              onHistory={setHistoryAssetId}
            />

            <AssetsCard
              assets={portfolio.assets}
              onHistory={setHistoryAssetId}
              onRemove={removeAsset}
            />

            <OperationsCard
              operations={portfolio.operations}
              showValues={showValues}
              onRemove={removeOperation}
            />
          </div>
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
                  onChange={(value) =>
                    setAssetForm({
                      ...assetForm,
                      currency: value as SupportedCurrency,
                    })
                  }
                  options={currencyOptions}
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
                  options={portfolio.accounts.map((account) => ({
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

        {historyAsset && (
          <ModalShell
            title={`Histórico · ${historyAsset.symbol}`}
            onClose={() => setHistoryAssetId(null)}
          >
            {historyOperations.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhuma operação registrada para este ativo.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {historyOperations.map((operation) => (
                  <OperationRow
                    key={operation.id}
                    operation={operation}
                    showValues={showValues}
                    onRemove={() => removeOperation(operation)}
                  />
                ))}
              </div>
            )}
          </ModalShell>
        )}
      </section>
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
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
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
              </div>
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
}: {
  operations: InvestmentOperation[];
  showValues: boolean;
  onRemove: (operation: InvestmentOperation) => void;
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
}: {
  operation: InvestmentOperation;
  showValues: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_40px] items-center gap-3 py-2">
      <span className="min-w-0">
        <strong className="block truncate text-sm text-[var(--foreground)]">
          {operationLabel(operation.type)} · {operation.asset.symbol}
        </strong>
        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
          {dateLabel(operation.date)} · {operation.account.name} ·{' '}
          {quantityLabel(operation.quantity)} un.
        </span>
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
      <button
        type="button"
        onClick={onRemove}
        aria-label="Excluir operação"
        className="grid h-10 w-10 place-items-center rounded-full text-[var(--expense)]"
      >
        <FaTrash aria-hidden="true" />
      </button>
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
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/55 p-4">
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="w-full max-w-2xl rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-elevated)]"
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
