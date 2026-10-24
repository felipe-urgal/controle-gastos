'use client';

import ListboxSelect from '@/app/components/ui/listbox-select';
import ReceiptOcrScanner from '@/app/components/pages/transactions/form/receipt-ocr-scanner';
import { FaArrowDown, FaArrowRight, FaArrowUp, FaCalendarAlt, FaCalculator, FaCheck, FaChevronRight, FaCog, FaExchangeAlt, FaFileAlt, FaStore, FaTag, FaWallet } from 'react-icons/fa';
import { FormContainer } from '@/app/components/forms';
import { Button, IconRenderer, Input, RadioGroup } from '@/app/components/ui';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { MAX_RECURRENCE_OCCURRENCES } from '@/app/lib/transactions/logical-recurrence';
import { formatIsoLogicalDate, formatPtBrLogicalDate, MAX_MONTHLY_OCCURRENCES } from '@/app/lib/transactions/monthly-recurrence';
import { recurrencePresetOptions, RecurrencePreset } from '@/app/lib/transactions/recurrence-presets';
import { TransactionStatus } from '@/app/types/transaction';
import { CreationMode, RecurrenceMode } from '@/app/components/pages/transactions/form/transaction-form-shared';
import { ReviewRow } from '@/app/components/pages/transactions/form/transaction-review-modal';

import type { TransactionFormState } from '@/app/components/pages/transactions/form/use-transaction-form';

export function MobileTransactionWizard({ form }: { form: TransactionFormState }) {
  const { isEditing, onSelectTransfer, reviewingQueueItem, formData, setFormData, creationMode, setCreationMode, recurrencePreset, setRecurrencePreset, recurrenceMode, setRecurrenceMode, occurrenceCount, setOccurrenceCount, recurrenceEndDate, setRecurrenceEndDate, installmentCount, setInstallmentCount, merchants, submitError, setSubmitError, isSubmitting, mobileStep, setMobileStep, merchantRecognition, selectedAccount, selectedCategory, selectedMerchant, displayValue, formatCentsToCurrency, recurrencePreview, installmentPreview, handleCancel, handleAmountChange, handleMerchantChange, handleDescriptionChange, receiptOcrFormState, handleReceiptOcrApplication, handleCategoryType, handleCategoryChange, persistTransaction, advanceMobilePrimaryStep, advanceMobileAdvancedStep, loading, renderTagEditor, renderAllocationEditor, accountOptions, categoryOptions, isFixedDate, firstRecurrenceDate, lastRecurrenceDate, firstInstallment, lastInstallment, installmentTotal, operationType, operationLabel, selectedStatusLabel, selectedDateLabel, recurrencePresetLabel, creationModeLabel, createLabel } = form;

  return (
    <FormContainer
        bare
        onSubmit={(event) => event.preventDefault()}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-4 pb-4 "
      >
        <section aria-label={isEditing ? 'Editar transação mobile' : 'Nova transação mobile'}>
          <div className="mb-5 grid grid-cols-[auto_minmax(44px,1fr)_auto_minmax(44px,1fr)_auto] items-start gap-2 px-4" aria-label="Etapas da transação">
            {([
              [1, 'Valor'],
              [2, 'Detalhes'],
              [3, 'Revisão'],
            ] as const).map(([step, label], index) => (
              <div key={step} className="contents">
                {index > 0 && (
                  <span
                    className={`mt-5 h-px self-start ${
                      mobileStep >= step ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="grid justify-items-center gap-1.5">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full border text-sm font-bold ${
                      mobileStep === step
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_45%,transparent)]'
                        : mobileStep > step
                          ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]'
                          : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {step}
                  </span>
                  <span className={`text-xs font-medium ${mobileStep === step ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {mobileStep === 1 && (
            <div className="space-y-4">
              <div
                className="grid grid-cols-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-1"
                aria-label="Tipo da transação"
              >
                <Button
                  variant={operationType === 'EXPENSE' ? 'primary' : 'ghost'}
                  aria-pressed={operationType === 'EXPENSE'}
                  onClick={() => handleCategoryType('EXPENSE')}
                  disabled={loading}
                  icon={<FaArrowDown aria-hidden="true" />}
                  className="min-w-0 px-2"
                >
                  <span className="truncate">Despesa</span>
                </Button>
                <Button
                  variant={operationType === 'INCOME' ? 'primary' : 'ghost'}
                  aria-pressed={operationType === 'INCOME'}
                  onClick={() => handleCategoryType('INCOME')}
                  disabled={loading}
                  icon={<FaArrowUp aria-hidden="true" />}
                  className="min-w-0 px-2"
                >
                  <span className="truncate">Receita</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={onSelectTransfer}
                  disabled={loading || !onSelectTransfer}
                  aria-label={isEditing ? 'Transferência indisponível na edição' : 'Transferência'}
                  icon={<FaExchangeAlt aria-hidden="true" />}
                  className="min-w-0 px-1.5"
                >
                  <span className="truncate">Transferência</span>
                </Button>
              </div>

              {!isEditing ? (
                <ReceiptOcrScanner
                  disabled={loading}
                  formState={receiptOcrFormState}
                  onApply={handleReceiptOcrApplication}
                  className="grid gap-2"
                />
              ) : null}

              <div
                className="min-h-[142px] rounded-[var(--radius-lg)] border border-[var(--primary)] bg-[var(--surface)] p-4"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--primary) 9%, var(--surface)) 0%, var(--surface) 72%)',
                  boxShadow:
                    'inset 0 0 34px color-mix(in srgb, var(--primary) 7%, transparent)',
                }}
              >
                <label htmlFor="mobile-transaction-amount" className="text-sm text-[var(--text-muted)]">
                  {creationMode === 'installment' ? 'Valor total da transação' : 'Valor da transação'}
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    bare
                    id="mobile-transaction-amount"
                    aria-label={creationMode === 'installment' ? 'Valor total' : 'Valor'}
                    value={displayValue}
                    onChange={handleAmountChange}
                    disabled={loading}
                    inputMode="numeric"
                    className="min-h-[76px] min-w-0 flex-1 border-0 p-0 text-4xl font-black tracking-tight min-[360px]:text-5xl"
                  />
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
                    <FaCalculator />
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Detalhes da transação</h2>
                <span className="shrink-0 text-sm text-[var(--text-muted)]">Passo 1 de 3</span>
              </div>

              <div className="grid gap-2.5">
                <ListboxSelect
                  ariaLabel="Conta"
                  value={formData.accountId}
                  disabled={loading}
                  onChange={(value) => setFormData((previous) => ({ ...previous, accountId: value }))}
                  options={accountOptions}
                  triggerClassName="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaWallet aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Conta <span className="text-[var(--expense)]">*</span></strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{selectedAccount?.name ?? 'Selecione uma conta'}</span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </ListboxSelect>

                <ListboxSelect
                  ariaLabel="Categoria"
                  value={formData.categoryId}
                  disabled={loading}
                  onChange={handleCategoryChange}
                  groups={categoryOptions}
                  triggerClassName="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                    style={selectedCategory?.color ? { color: selectedCategory.color } : undefined}
                  >
                    {selectedCategory ? <IconRenderer iconName={selectedCategory.icon || 'tag'} size={17} /> : <FaTag aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Categoria <span className="text-[var(--expense)]">*</span></strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{selectedCategory?.name ?? 'Selecione uma categoria'}</span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </ListboxSelect>

                <ListboxSelect
                  ariaLabel="Estabelecimento"
                  value={formData.merchantId ?? ''}
                  disabled={loading}
                  onChange={handleMerchantChange}
                  options={[
                    { value: '', label: 'Sem estabelecimento' },
                    ...merchants
                      .filter((merchant) => merchant.isActive || merchant.id === formData.merchantId)
                      .map((merchant) => ({
                        value: merchant.id,
                        label: merchant.isActive ? merchant.name : `${merchant.name} (inativo)`,
                      })),
                  ]}
                  triggerClassName="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaStore aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Estabelecimento</strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">
                      {selectedMerchant?.name ?? 'Opcional'}
                    </span>
                    {merchantRecognition?.kind === 'auto' ? (
                      <span className="mt-0.5 block text-xs font-semibold text-[var(--primary)]">
                        Reconhecido automaticamente por alias
                      </span>
                    ) : merchantRecognition?.kind === 'conflict' ? (
                      <span className="mt-0.5 block text-xs font-semibold text-[var(--warning)]">
                        Conflito entre aliases — escolha manual necessária
                      </span>
                    ) : null}
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </ListboxSelect>

                {renderAllocationEditor()}
              <details className="group" open={(formData.tagIds?.length ?? 0) > 0 || undefined}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <FaTag aria-hidden="true" /> Adicionar tags
                    {(formData.tagIds?.length ?? 0) > 0 && (
                      <span className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
                        {formData.tagIds?.length}
                      </span>
                    )}
                  </span>
                  <FaChevronRight className="text-xs text-[var(--text-muted)] transition-transform group-open:rotate-90" aria-hidden="true" />
                </summary>
                <div className="mt-2">{renderTagEditor('mobile')}</div>
              </details>

                <label className={`relative grid min-h-[86px] grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 ${isFixedDate ? '' : 'cursor-pointer'}`}>
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaCalendarAlt aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--foreground)]">Data <span className="text-[var(--expense)]">*</span></span>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{selectedDateLabel}</span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                  {!isFixedDate && (
                    <input
                      aria-label={creationMode === 'installment' ? 'Data da primeira parcela' : 'Data'}
                      type="date"
                      value={formatIsoLogicalDate({ year: formData.year, month: formData.month, day: formData.day })}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const [year, month, day] = event.target.value.split('-').map(Number);
                        setFormData((previous) => ({ ...previous, day, month, year }));
                      }}
                      disabled={loading}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  )}
                </label>

                <div className="grid min-h-[86px] grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3">
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaFileAlt aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <label htmlFor="mobile-transaction-description" className="block text-sm font-bold text-[var(--foreground)]">
                      Descrição <span className="text-[var(--expense)]">*</span>
                    </label>
                    <Input
                      bare
                      id="mobile-transaction-description"
                      aria-label="Descrição"
                      value={formData.description}
                      onChange={(event) => handleDescriptionChange(event.target.value)}
                      disabled={loading}
                      maxLength={100}
                      enterKeyHint="next"
                      placeholder="Ex.: Supermercado, salário, aluguel..."
                      className="mt-1 min-h-11 text-base text-[var(--text-muted)] placeholder:text-[var(--text-subtle)]"
                    />
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </div>

                <button
                  type="button"
                  onClick={advanceMobilePrimaryStep}
                  disabled={loading}
                  className="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--primary)]">
                    <FaCog aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Detalhes avançados</strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">Status, recorrência e parcelamento</span>
                  </span>
                  <FaChevronRight className="rotate-90 text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-3">
                <Button size="cta" type="button" variant="secondary" onClick={handleCancel} disabled={loading} fullWidth>
                  Cancelar
                </Button>
                <Button size="cta" type="button" onClick={advanceMobilePrimaryStep} disabled={loading} icon={<FaArrowRight />} iconPosition="right" fullWidth>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {mobileStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Detalhes avançados</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Passo 2 de 3 · ajuste apenas o que precisar.</p>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Transação</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <strong className="truncate text-sm text-[var(--foreground)]">{operationLabel}</strong>
                  <strong className="shrink-0 text-lg text-[var(--foreground)]">{formatCentsToCurrency(formData.amount)}</strong>
                </div>
              </div>

              <div className="grid gap-3">
                <div>
                  <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Status</p>
                  <RadioGroup
                    required
                    name="status-mobile"
                    value={formData.status}
                    onChange={(value) => setFormData((previous) => ({ ...previous, status: value as TransactionStatus }))}
                    options={statusOptions}
                    disabled={loading}
                  />
                </div>

                {!isEditing && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Criar como</p>
                    <ListboxSelect
                      ariaLabel="Criar como"
                      value={creationMode}
                      disabled={loading}
                      onChange={(value) => setCreationMode(value as CreationMode)}
                      options={[
                        { value: 'single', label: 'Única' },
                        { value: 'recurring', label: 'Recorrente' },
                        { value: 'installment', label: 'Parcelada' },
                      ]}
                      triggerClassName="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm font-semibold text-[var(--foreground)]"
                    >
                      <span>{creationModeLabel}</span>
                      <FaChevronRight className="rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                    </ListboxSelect>
                  </div>
                )}

                {!isEditing && creationMode === 'recurring' && (
                  <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div>
                      <strong className="text-sm text-[var(--foreground)]">Recorrência</strong>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Configure quando este lançamento deve se repetir.</p>
                    </div>
                    <ListboxSelect
                      ariaLabel="Frequência"
                      value={recurrencePreset}
                      disabled={loading}
                      onChange={(value) => setRecurrencePreset(value as RecurrencePreset)}
                      options={recurrencePresetOptions.map((option) => ({ value: String(option.value), label: option.label }))}
                      triggerClassName="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-left text-sm"
                    >
                      <span>{recurrencePresetLabel}</span>
                      <FaChevronRight className="rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                    </ListboxSelect>
                    <RadioGroup
                      name="recurrence-mode-mobile"
                      label="Terminar por"
                      value={recurrenceMode}
                      onChange={(value) => setRecurrenceMode(value as RecurrenceMode)}
                      disabled={loading}
                      options={[
                        { value: 'count', label: 'Quantidade' },
                        { value: 'endDate', label: 'Data final' },
                      ]}
                    />
                    {recurrenceMode === 'count' ? (
                      <Input
                        label="Quantidade de ocorrências"
                        type="number"
                        min={2}
                        max={MAX_RECURRENCE_OCCURRENCES}
                        value={occurrenceCount}
                        onChange={(event) => setOccurrenceCount(Number(event.target.value))}
                        disabled={loading}
                      />
                    ) : (
                      <Input
                        label="Data final"
                        type="date"
                        value={recurrenceEndDate}
                        min={formatIsoLogicalDate({ year: formData.year, month: formData.month, day: formData.day })}
                        onChange={(event) => setRecurrenceEndDate(event.target.value)}
                        disabled={loading}
                      />
                    )}
                    <p role="status" className={`rounded-[var(--radius-md)] border p-3 text-xs ${
                      recurrencePreview.error
                        ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]'
                    }`}>
                      {recurrencePreview.error
                        ? recurrencePreview.error
                        : firstRecurrenceDate && lastRecurrenceDate
                          ? `${recurrencePresetLabel} · ${recurrencePreview.dates.length} ocorrências · ${formatPtBrLogicalDate(firstRecurrenceDate)} até ${formatPtBrLogicalDate(lastRecurrenceDate)}. As futuras serão pendentes.`
                          : 'Configure a recorrência para revisar o período.'}
                    </p>
                  </div>
                )}

                {!isEditing && creationMode === 'installment' && (
                  <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div>
                      <strong className="text-sm text-[var(--foreground)]">Parcelamento</strong>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">O valor informado é o total da compra.</p>
                    </div>
                    <Input
                      label="Quantidade de parcelas"
                      type="number"
                      min={2}
                      max={MAX_MONTHLY_OCCURRENCES}
                      value={installmentCount}
                      onChange={(event) => setInstallmentCount(Number(event.target.value))}
                      disabled={loading}
                    />
                    <p className={`rounded-[var(--radius-md)] border p-3 text-xs ${
                      installmentPreview.error
                        ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]'
                    }`}>
                      {installmentPreview.error
                        ? installmentPreview.error
                        : firstInstallment && lastInstallment
                          ? `${installmentPreview.occurrences.length} parcelas · ${formatPtBrLogicalDate(firstInstallment)} até ${formatPtBrLogicalDate(lastInstallment)} · total ${formatCentsToCurrency(installmentTotal)}.`
                          : 'Informe o parcelamento para revisar as parcelas.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-3">
                <Button size="cta" type="button" variant="secondary" onClick={() => setMobileStep(1)} disabled={loading} fullWidth>
                  Voltar
                </Button>
                <Button size="cta" type="button" onClick={advanceMobileAdvancedStep} disabled={loading} icon={<FaArrowRight />} iconPosition="right" fullWidth>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {mobileStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Revisar transação</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Passo 3 de 3 · confira antes de confirmar.</p>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--primary)]/45 bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--text-muted)]">{operationLabel}</p>
                <strong className="mt-1 block text-4xl font-black tracking-tight text-[var(--foreground)]">
                  {formatCentsToCurrency(formData.amount)}
                </strong>
                <dl className="mt-4 grid gap-2">
                  <ReviewRow label="Conta" value={selectedAccount?.name ?? 'Não selecionada'} />
                  <ReviewRow label="Categoria" value={selectedCategory?.name ?? 'Não selecionada'} />
                  <ReviewRow
                    label="Estabelecimento"
                    value={
                      selectedMerchant
                        ? selectedMerchant.name +
                          (merchantRecognition?.kind === 'auto'
                            ? ' · reconhecido por alias'
                            : '')
                        : merchantRecognition?.kind === 'conflict'
                          ? 'Conflito entre aliases · escolha manual necessária'
                          : 'Não informado'
                    }
                  />
                  <ReviewRow label="Data" value={selectedDateLabel} />
                  <ReviewRow label="Descrição" value={formData.description || 'Sem descrição'} />
                  <ReviewRow label="Status" value={selectedStatusLabel} />
                  <ReviewRow label="Formato" value={creationModeLabel} />
                </dl>
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-3">
                <Button size="cta" type="button" variant="secondary" onClick={() => setMobileStep(2)} disabled={loading} fullWidth>
                  Voltar
                </Button>
                <Button size="cta"
                  type="button"
                  onClick={() => void persistTransaction()}
                  isLoading={isSubmitting}
                  disabled={loading}
                  icon={<FaCheck />}
                  iconPosition="right"
                  fullWidth
                >
                  {reviewingQueueItem ? 'Confirmar nova tentativa' : isEditing ? 'Salvar alterações' : createLabel}
                </Button>
              </div>
            </div>
          )}
        </section>
      </FormContainer>
  );
}
