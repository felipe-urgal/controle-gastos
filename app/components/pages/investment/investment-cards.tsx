'use client';

import { motion } from 'framer-motion';
import { RiseArticle, RiseDetails } from '@/app/components/ui/motion';

import { useState, type ReactNode } from 'react';
import { FaChevronDown, FaHistory, FaTrash } from 'react-icons/fa';
import { Button, IconButton, Select } from '@/app/components/ui';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { ModalShell as SharedModalShell } from '@/app/components/overlays/modal-shell';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { groupInvestmentIncomesByAsset } from '@/app/lib/investments/investment-income-summary';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { InvestmentAsset, InvestmentIncome, InvestmentOperation, InvestmentPortfolio } from '@/app/types/investment';
import { dateLabel, fiscalEventLabel, operationLabel, quantityLabel, typeLabel } from '@/app/components/pages/investment/investments-helpers';

/**
 * Cartão com cabeçalho recolhível: aberto a partir de 640 px; no mobile começa recolhido para
 * manter a carteira (totais e posições) em destaque. O cabeçalho é o `summary` (alvo ≥44 px).
 */
export function CollapsibleCard({ header, children }: { header: ReactNode; children: ReactNode }) {
  const wide = useMediaQuery('(min-width: 640px)');
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? wide;

  return (
    <RiseDetails
      open={open}
      onToggle={(event) => setOverride(event.currentTarget.open)}
      className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:p-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">{header}</div>
        <FaChevronDown
          className="mt-1.5 shrink-0 text-xs text-[var(--text-muted)] transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </RiseDetails>
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
    <RiseArticle className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)] p-4 sm:p-5">
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
              className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
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

              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onAdjust(item.assetId)}
              >
                {item.lastAdjustmentId ? 'Novo ajuste fiscal' : 'Informar custo fiscal'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </RiseArticle>
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
    <CollapsibleCard
      header={
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
                <span className="money">{showValues ? formatCurrency(amount, currency) : '••••'}</span> {currency}
              </strong>
            ))}
          </div>
        )}
      </div>
      }
    >

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
                className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 text-left hover:border-[var(--primary)]/40"
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
    </CollapsibleCard>
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
    <CollapsibleCard header={<h2 className="text-lg font-bold text-[var(--foreground)]">Ativos</h2>}>
      {assets.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Cadastre um ativo para começar.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-[var(--border)]">
          {assets.map((asset) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="flex min-h-[64px] items-center justify-between gap-3 overflow-hidden py-2"
            >
              <button
                type="button"
                onClick={() => onHistory(asset.id)}
                className="min-h-11 min-w-0 flex-1 text-left"
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
                <IconButton
                  tone="danger"
                  label={`Excluir ativo ${asset.symbol}`}
                  icon={<FaTrash />}
                  className="rounded-full"
                  onClick={() => onRemove(asset)}
                />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </CollapsibleCard>
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
    <CollapsibleCard
      header={
        <div className="flex items-center gap-2">
          <FaHistory className="text-[var(--primary)]" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[var(--foreground)]">Operações</h2>
        </div>
      }
    >
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
    </CollapsibleCard>
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
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 overflow-hidden py-2"
    >
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
        <Button variant="outline" size="sm" onClick={onClassify}>
          Fiscal
        </Button>
        <IconButton
          tone="danger"
          label="Excluir operação"
          icon={<FaTrash />}
          className="rounded-full"
          onClick={onRemove}
        />
      </span>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden py-2"
    >
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
    </motion.div>
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
    <Select
      label={label}
      value={value}
      onChange={(next) => onChange(String(next))}
      options={options}
      placeholder="Selecione"
      disabled={disabled}
      required
    />
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
      <Button type="button" variant="outline" size="cta" onClick={onClose} disabled={saving} fullWidth>
        Cancelar
      </Button>
      <Button type="submit" size="cta" disabled={saving} isLoading={saving} loadingText="Salvando..." fullWidth>
        {submitLabel}
      </Button>
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
