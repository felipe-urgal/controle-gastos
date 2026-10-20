'use client';

import { FaChartLine, FaHistory, FaTrash } from 'react-icons/fa';
import { ModalShell as SharedModalShell } from '@/app/components/overlays/modal-shell';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { groupInvestmentIncomesByAsset } from '@/app/lib/investments/investment-income-summary';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { InvestmentAsset, InvestmentIncome, InvestmentOperation, InvestmentPortfolio } from '@/app/types/investment';
import { dateLabel, fiscalEventLabel, operationLabel, quantityLabel, quoteDateLabel, typeLabel } from '@/app/components/pages/investment/investments-helpers';

export function TotalsCard({
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

export function FiscalCostCard({
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
                      : 'border-[var(--warning)]/35 text-[var(--warning)]'
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
                    <span className="mt-1 block text-xs text-[var(--warning)]">
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
                    <span className="mt-1 block text-xs text-[var(--warning)]">
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
                <div className="mt-3 rounded-xl bg-[var(--warning-subtle)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
                  {item.pending[0]?.message}
                  {item.pending.length > 1
                    ? ` +${item.pending.length - 1} pendência(s).`
                    : ''}
                </div>
              )}

              <button
                type="button"
                onClick={() => onAdjust(item.assetId)}
                className="mt-3 min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
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

export function PositionsCard({
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
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
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

export function IncomesCard({
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

export function AssetsCard({
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
                  className="grid h-11 w-11 place-items-center rounded-full text-[var(--expense)]"
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

export function OperationsCard({
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

export function OperationRow({
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
          <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
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
          className="min-h-11 rounded-full border border-[var(--border)] px-3 text-xs font-bold text-[var(--foreground)]"
        >
          Fiscal
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Excluir operação"
          className="grid h-11 w-11 place-items-center rounded-full text-[var(--expense)]"
        >
          <FaTrash aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

export function IncomeRow({
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

export function SelectField({
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

export function ModalActions({
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

export function InvestmentModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <SharedModalShell variant="fullscreen-sheet" title={title} onClose={onClose} maxWidthClass="max-w-2xl">
      {children}
    </SharedModalShell>
  );
}
