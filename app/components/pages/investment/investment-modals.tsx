'use client';

import type { Dispatch, FormEvent, SetStateAction } from 'react';

import { PageLoading } from '@/app/components/feedback';
import { IncomeRow, InvestmentModal, ModalActions, OperationRow, SelectField } from '@/app/components/pages/investment/investment-cards';
import { AssetForm, FiscalCostForm, IncomeForm, OperationForm, assetTypes, incomeTypes, dateLabel, fiscalEventTypes, quantityLabel } from '@/app/components/pages/investment/investments-helpers';
import { Button, Input, MoneyInput, MoneyText } from '@/app/components/ui';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { InvestmentAsset, InvestmentAssetType, InvestmentFiscalEventType, InvestmentIncome, InvestmentOperation, InvestmentIncomeType, InvestmentOperationType, InvestmentPortfolio, InvestmentTaxLocation } from '@/app/types/investment';

type Setter<T> = Dispatch<SetStateAction<T>>;
type Submit = (event: FormEvent) => void | Promise<void>;

export function DeleteConfirmModal({ pendingDelete, saving, onCancel, onConfirm }: {
  pendingDelete: { kind: 'OPERATION'; value: InvestmentOperation } | { kind: 'ASSET'; value: InvestmentAsset };
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
          <InvestmentModal
            title={
              pendingDelete.kind === 'OPERATION'
                ? 'Excluir operação'
                : 'Excluir ativo'
            }
            onClose={() => onCancel()}
          >
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {pendingDelete.kind === 'OPERATION'
                ? `A operação de ${pendingDelete.value.asset.symbol} será removida. A posição, o custo fiscal, resultados realizados e pendências derivadas serão recalculados. A exclusão será bloqueada se romper a posição posterior ou houver vínculo fiscal protegido.`
                : `O ativo ${pendingDelete.value.symbol} será removido somente se não possuir operações ou proventos históricos.`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" size="cta" onClick={() => onCancel()} disabled={saving} fullWidth>
                Cancelar
              </Button>
              <Button type="button" variant="danger" size="cta" onClick={() => onConfirm()} disabled={saving} isLoading={saving} loadingText="Excluindo..." fullWidth>
                Excluir
              </Button>
            </div>
          </InvestmentModal>
  );
}

export function AssetModal({ assetForm, setAssetForm, saving, onSubmit, onClose }: {
  assetForm: AssetForm;
  setAssetForm: Setter<AssetForm>;
  saving: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  return (
          <InvestmentModal title="Novo ativo" onClose={() => onClose()}>
            <form onSubmit={onSubmit} className="space-y-4">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                onClose={() => onClose()}
                submitLabel="Criar ativo"
              />
            </form>
          </InvestmentModal>
  );
}

export function OperationModal({ portfolio, operationForm, setOperationForm, compatibleAssets, saving, onSubmit, onClose }: {
  portfolio: InvestmentPortfolio;
  operationForm: OperationForm;
  setOperationForm: Setter<OperationForm>;
  compatibleAssets: InvestmentAsset[];
  saving: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  return (
          <InvestmentModal
            title="Nova operação"
            onClose={() => onClose()}
          >
            <form onSubmit={onSubmit} className="space-y-4">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <MoneyInput
                  label="Preço unitário"
                  currency={portfolio.accounts.find((item) => item.id === operationForm.accountId)?.currency}
                  value={operationForm.unitPrice}
                  onValueChange={(unitPrice) =>
                    setOperationForm({ ...operationForm, unitPrice })
                  }
                  required
                  placeholder="35,90"
                  disabled={saving}
                />
                <MoneyInput
                  label="Taxas"
                  currency={portfolio.accounts.find((item) => item.id === operationForm.accountId)?.currency}
                  value={operationForm.fees}
                  onValueChange={(fees) =>
                    setOperationForm({ ...operationForm, fees })
                  }
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
                onClose={() => onClose()}
                submitLabel="Registrar"
              />
            </form>
          </InvestmentModal>
  );
}

export function IncomeModal({ portfolio, incomeForm, setIncomeForm, compatibleAssets, saving, onSubmit, onClose }: {
  portfolio: InvestmentPortfolio;
  incomeForm: IncomeForm;
  setIncomeForm: Setter<IncomeForm>;
  compatibleAssets: InvestmentAsset[];
  saving: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  return (
    <InvestmentModal title="Novo provento" onClose={() => onClose()}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo"
            value={incomeForm.type}
            disabled={saving}
            onChange={(value) =>
              setIncomeForm({ ...incomeForm, type: value as InvestmentIncomeType })
            }
            options={incomeTypes}
          />
          <SelectField
            label="Conta"
            value={incomeForm.accountId}
            disabled={saving}
            onChange={(value) => {
              const account = portfolio.accounts.find((item) => item.id === value);
              const firstAsset = portfolio.assets.find(
                (asset) => asset.currency === account?.currency,
              );
              setIncomeForm({
                ...incomeForm,
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
          value={incomeForm.assetId}
          disabled={saving}
          onChange={(value) => setIncomeForm({ ...incomeForm, assetId: value })}
          options={compatibleAssets.map((asset) => ({
            value: asset.id,
            label: `${asset.symbol} · ${asset.currency}`,
          }))}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Quantidade de cotas"
            value={incomeForm.quantity}
            onChange={(event) =>
              setIncomeForm({ ...incomeForm, quantity: event.target.value })
            }
            inputMode="decimal"
            required
            placeholder="100"
            disabled={saving}
          />
          <MoneyInput
            label="Valor por cota"
            currency={portfolio.accounts.find((item) => item.id === incomeForm.accountId)?.currency}
            value={incomeForm.unitValue}
            onValueChange={(unitValue) =>
              setIncomeForm({ ...incomeForm, unitValue })
            }
            required
            placeholder="0,85"
            disabled={saving}
          />
          <MoneyInput
            label="Valor líquido recebido"
            currency={portfolio.accounts.find((item) => item.id === incomeForm.accountId)?.currency}
            value={incomeForm.netAmount}
            onValueChange={(netAmount) =>
              setIncomeForm({ ...incomeForm, netAmount })
            }
            required
            placeholder="85,00"
            disabled={saving}
          />
        </div>
        <Input
          label="Data do pagamento"
          type="date"
          value={incomeForm.date}
          onChange={(event) =>
            setIncomeForm({ ...incomeForm, date: event.target.value })
          }
          required
          disabled={saving}
        />
        <Input
          label="Observação"
          value={incomeForm.note}
          onChange={(event) =>
            setIncomeForm({ ...incomeForm, note: event.target.value })
          }
          multiline
          rows={3}
          maxLength={500}
          disabled={saving}
        />
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          O provento não altera a posição nem o saldo da conta. Nenhuma transação financeira é criada automaticamente.
        </p>
        <ModalActions
          saving={saving}
          onClose={() => onClose()}
          submitLabel="Registrar"
        />
      </form>
    </InvestmentModal>
  );
}

export function FiscalCostModal({ portfolio, fiscalCostForm, setFiscalCostForm, showValues, saving, onSubmit, onClose }: {
  portfolio: InvestmentPortfolio;
  fiscalCostForm: FiscalCostForm;
  setFiscalCostForm: Setter<FiscalCostForm>;
  showValues: boolean;
  saving: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  return (
          <InvestmentModal
            title={`Ajustar custo fiscal · ${
              portfolio.assets.find((asset) => asset.id === fiscalCostForm.assetId)
                ?.symbol ?? ''
            }`}
            onClose={() => onClose()}
          >
            <form onSubmit={onSubmit} className="space-y-4">
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
                <MoneyInput
                  label="Custo fiscal total"
                  currency={portfolio.assets.find((asset) => asset.id === fiscalCostForm.assetId)?.currency}
                  value={fiscalCostForm.costBasis}
                  onValueChange={(costBasis) =>
                    setFiscalCostForm({ ...fiscalCostForm, costBasis })
                  }
                  required
                  placeholder="20.000,00"
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
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
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
                          <MoneyText>
                            {showValues
                              ? formatCurrency(
                                  item.costBasisCents,
                                  portfolio.assets.find(
                                    (asset) => asset.id === item.assetId,
                                  )?.currency ?? 'BRL',
                                )
                              : '••••'}
                          </MoneyText>
                          {' · '}
                          {item.reason}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <ModalActions
                saving={saving}
                onClose={() => onClose()}
                submitLabel="Registrar ajuste"
              />
            </form>
          </InvestmentModal>
  );
}

export function FiscalClassificationModal({ fiscalOperation, fiscalType, setFiscalType, fiscalSourceInstitution, setFiscalSourceInstitution, fiscalDestinationInstitution, setFiscalDestinationInstitution, fiscalNote, setFiscalNote, saving, onSubmit, onClose }: {
  fiscalOperation: InvestmentOperation;
  fiscalType: InvestmentFiscalEventType;
  setFiscalType: Setter<InvestmentFiscalEventType>;
  fiscalSourceInstitution: string;
  setFiscalSourceInstitution: Setter<string>;
  fiscalDestinationInstitution: string;
  setFiscalDestinationInstitution: Setter<string>;
  fiscalNote: string;
  setFiscalNote: Setter<string>;
  saving: boolean;
  onSubmit: Submit;
  onClose: () => void;
}) {
  return (
          <InvestmentModal
            title={`Classificação fiscal · ${fiscalOperation.asset.symbol}`}
            onClose={() => onClose()}
          >
            <form onSubmit={onSubmit} className="space-y-4">
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
                onClose={() => onClose()}
                submitLabel="Salvar classificação"
              />
            </form>
          </InvestmentModal>
  );
}

export function HistoryModal({ historyAsset, historyLoading, historyError, historyOperations, historyIncomes, showValues, onRetry, onClose, onRemoveOperation, onClassify }: {
  historyAsset: InvestmentAsset;
  historyLoading: boolean;
  historyError: string;
  historyOperations: InvestmentOperation[];
  historyIncomes: InvestmentIncome[];
  showValues: boolean;
  onRetry: () => void;
  onClose: () => void;
  onRemoveOperation: (operation: InvestmentOperation) => void;
  onClassify: (operation: InvestmentOperation) => void;
}) {
  return (
          <InvestmentModal
            title={`Histórico · ${historyAsset.symbol}`}
            onClose={onClose}
          >
            {historyLoading ? (
              <PageLoading />
            ) : historyError ? (
              <div>
                <p role="alert" className="text-sm text-[var(--expense)]">
                  {historyError}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                  Tentar novamente
                </Button>
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
                          onRemove={() => onRemoveOperation(operation)}
                          onClassify={() => onClassify(operation)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </InvestmentModal>
  );
}
