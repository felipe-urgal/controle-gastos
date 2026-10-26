'use client';

import type { ReactNode } from 'react';
import { FaArrowDown, FaArrowUp, FaCalendarAlt, FaChevronRight, FaExchangeAlt, FaFileAlt, FaFlag, FaRedoAlt, FaCreditCard, FaStore, FaTag, FaWallet } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import ReceiptOcrScanner from '@/app/components/pages/transactions/form/receipt-ocr-scanner';
import { Button, IconRenderer, Input, RadioGroup } from '@/app/components/ui';
import ListboxSelect from '@/app/components/ui/listbox-select';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { MAX_RECURRENCE_OCCURRENCES } from '@/app/lib/transactions/logical-recurrence';
import { formatIsoLogicalDate, formatPtBrLogicalDate, MAX_MONTHLY_OCCURRENCES } from '@/app/lib/transactions/monthly-recurrence';
import { recurrencePresetOptions, RecurrencePreset } from '@/app/lib/transactions/recurrence-presets';
import { TransactionStatus } from '@/app/types/transaction';
import { CreationMode, RecurrenceMode } from '@/app/components/pages/transactions/form/transaction-form-shared';

import type { TransactionFormState } from '@/app/components/pages/transactions/form/use-transaction-form';

const ROW_CLASS = 'grid min-h-[52px] w-full grid-cols-[28px_96px_minmax(0,1fr)_16px] items-center gap-2 px-2 text-left text-sm sm:grid-cols-[28px_120px_minmax(0,1fr)_16px] lg:min-h-12';
const ROW_TRIGGER_CLASS = `${ROW_CLASS} transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] disabled:opacity-50`;
const SEGMENT_CLASS = 'min-w-0 px-2';
const PANEL_CLASS = 'space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4';

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <>
      <span className="grid h-7 w-7 place-items-center text-[var(--text-muted)]" aria-hidden="true">{icon}</span>
      <span className="text-[var(--text-muted)]">{label}</span>
      {children}
      <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
    </>
  );
}

function Preview({ error, children }: { error: string | null; children: ReactNode }) {
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-[var(--radius-md)] border p-3 text-sm leading-relaxed ${
        error
          ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]'
      }`}
    >
      {error ?? children}
    </p>
  );
}

export function TransactionFormView({ form }: { form: TransactionFormState }) {
  const {
    isEditing, onSelectTransfer, reviewingQueueItem, formData, setFormData,
    creationMode, setCreationMode, recurrencePreset, setRecurrencePreset, recurrenceMode, setRecurrenceMode,
    occurrenceCount, setOccurrenceCount, recurrenceEndDate, setRecurrenceEndDate, installmentCount, setInstallmentCount,
    merchants, submitError, setSubmitError, merchantRecognition, amountInputRef,
    selectedAccount, selectedCategory, selectedMerchant, displayValue, formatCentsToCurrency,
    recurrencePreview, installmentPreview, handleCancel, moveCursorToEnd, handleAmountChange,
    handleMerchantChange, handleDescriptionChange, receiptOcrFormState, handleReceiptOcrApplication,
    handleCategoryType, handleCategoryChange, handleSubmit, loading, isSubmitting,
    renderTagEditor, renderAllocationEditor, accountOptions, categoryOptions, isFixedDate,
    firstRecurrenceDate, lastRecurrenceDate, firstInstallment, lastInstallment, installmentTotal, installmentAmounts,
    operationType, selectedStatusLabel, selectedDateLabel, recurrencePresetLabel, createLabel,
  } = form;

  const isInstallment = creationMode === 'installment';
  const hasExtras = Boolean(formData.merchantId) || (formData.tagIds?.length ?? 0) > 0 || (formData.allocations?.length ?? 0) > 0 || merchantRecognition !== null;
  const submitLabel = reviewingQueueItem ? 'Confirmar nova tentativa' : isEditing ? 'Salvar alterações' : createLabel;
  const typeButtons = [
    { type: 'EXPENSE' as const, label: 'Despesa', icon: <FaArrowDown aria-hidden="true" /> },
    { type: 'INCOME' as const, label: 'Receita', icon: <FaArrowUp aria-hidden="true" /> },
  ];

  return (
    <FormContainer
      bare
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-4 w-full gap-5 lg:rounded-[var(--radius-lg)] lg:border lg:border-[var(--border)] lg:bg-[var(--card)] lg:p-6 lg:shadow-[var(--shadow-surface)]"
    >
      <section aria-label={isEditing ? 'Editar transação' : 'Nova transação'} className="grid gap-5">
        <div
          className={`grid overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-1 ${isEditing ? 'grid-cols-2' : 'grid-cols-3'}`}
          role="group"
          aria-label="Tipo da transação"
        >
          {typeButtons.map(({ type, label, icon }) => (
            <Button
              key={type}
              variant={operationType === type ? 'primary' : 'ghost'}
              aria-pressed={operationType === type}
              onClick={() => handleCategoryType(type)}
              disabled={loading}
              icon={icon}
              className={SEGMENT_CLASS}
            >
              <span className="truncate">{label}</span>
            </Button>
          ))}
          {!isEditing && (
            <Button
              variant="ghost"
              onClick={onSelectTransfer}
              disabled={loading || !onSelectTransfer}
              icon={<FaExchangeAlt aria-hidden="true" />}
              className={SEGMENT_CLASS}
            >
              <span className="truncate">Transferência</span>
            </Button>
          )}
        </div>

        <div className="text-center">
          <label htmlFor="transaction-amount" className="text-sm text-[var(--text-muted)]">
            {isInstallment ? 'Valor total da compra' : 'Valor'}
          </label>
          <Input
            bare
            id="transaction-amount"
            ref={amountInputRef}
            value={displayValue}
            onChange={handleAmountChange}
            onFocus={moveCursorToEnd}
            onClick={moveCursorToEnd}
            disabled={loading}
            required
            inputMode="numeric"
            className="mx-auto min-h-[64px] max-w-[420px] border-0 p-0 amount-display text-center font-black tracking-tight"
          />
        </div>

        {!isEditing && (
          <ReceiptOcrScanner
            disabled={loading}
            formState={receiptOcrFormState}
            onApply={handleReceiptOcrApplication}
            className="grid w-full gap-2"
          />
        )}

        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          <div className={ROW_CLASS}>
            <Row icon={<FaFileAlt />} label="Descrição">
              <Input
                bare
                id="transaction-description"
                aria-label="Descrição"
                value={formData.description}
                onChange={(event) => handleDescriptionChange(event.target.value)}
                disabled={loading}
                required
                maxLength={100}
                enterKeyHint="next"
                placeholder="Ex.: Supermercado"
                className="text-right font-medium placeholder:text-[var(--text-subtle)]"
              />
            </Row>
          </div>

          <ListboxSelect
            ariaLabel="Conta"
            value={formData.accountId}
            disabled={loading}
            onChange={(value) => setFormData((previous) => ({ ...previous, accountId: value }))}
            options={accountOptions}
            triggerClassName={ROW_TRIGGER_CLASS}
          >
            <Row icon={<FaWallet />} label="Conta">
              <span className="truncate text-right font-medium text-[var(--foreground)]">
                {selectedAccount?.name ?? 'Selecione'}
              </span>
            </Row>
          </ListboxSelect>

          <ListboxSelect
            ariaLabel="Categoria"
            value={formData.categoryId}
            disabled={loading}
            onChange={handleCategoryChange}
            groups={categoryOptions}
            triggerClassName={ROW_TRIGGER_CLASS}
          >
            <Row
              label="Categoria"
              icon={
                <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ backgroundColor: selectedCategory?.color || 'var(--surface-subtle)' }}>
                  {selectedCategory ? <IconRenderer iconName={selectedCategory.icon || 'tag'} size={12} /> : <FaTag className="text-[var(--text-muted)]" />}
                </span>
              }
            >
              <span className="truncate text-right font-medium text-[var(--foreground)]">
                {selectedCategory?.name ?? 'Selecione'}
              </span>
            </Row>
          </ListboxSelect>

          <label className={`relative ${ROW_CLASS} ${isFixedDate ? '' : 'cursor-pointer hover:bg-[var(--surface-hover)]'}`}>
            <Row icon={<FaCalendarAlt />} label="Data">
              <span className="truncate text-right font-medium text-[var(--foreground)]">{selectedDateLabel}</span>
            </Row>
            {!isFixedDate && (
              <input
                aria-label={isInstallment ? 'Data da primeira parcela' : 'Data'}
                type="date"
                value={formatIsoLogicalDate({ year: formData.year, month: formData.month, day: formData.day })}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const [year, month, day] = event.target.value.split('-').map(Number);
                  setFormData((previous) => ({ ...previous, day, month, year }));
                }}
                onClick={(event) => {
                  try {
                    event.currentTarget.showPicker?.();
                  } catch {
                    // O seletor nativo abre pelo toque quando showPicker não está disponível.
                  }
                }}
                disabled={loading}
                required
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            )}
          </label>

          <ListboxSelect
            ariaLabel="Status"
            value={formData.status}
            disabled={loading}
            onChange={(value) => setFormData((previous) => ({ ...previous, status: value as TransactionStatus }))}
            options={statusOptions.map((option) => ({ value: String(option.value), label: option.label }))}
            triggerClassName={ROW_TRIGGER_CLASS}
          >
            <Row icon={<FaFlag />} label={isInstallment ? 'Status 1ª parcela' : 'Status'}>
              <span className="truncate text-right font-medium text-[var(--foreground)]">{selectedStatusLabel}</span>
            </Row>
          </ListboxSelect>
        </div>

        {!isEditing && (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-[var(--text-muted)]">Formato</p>
            <div className="grid grid-cols-3 gap-1 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-1" role="group" aria-label="Criar como">
              {([
                ['single', 'Única'],
                ['recurring', 'Recorrente'],
                ['installment', 'Parcelada'],
              ] as Array<[CreationMode, string]>).map(([value, label]) => (
                <Button
                  key={value}
                  variant={creationMode === value ? 'primary' : 'ghost'}
                  aria-pressed={creationMode === value}
                  onClick={() => setCreationMode(value)}
                  disabled={loading}
                  className={SEGMENT_CLASS}
                >
                  <span className="truncate">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {!isEditing && creationMode === 'recurring' && (
          <div className={PANEL_CLASS}>
            <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
              <FaRedoAlt className="text-[var(--primary)]" aria-hidden="true" /> Repetir lançamento
            </div>
            <div>
              <p className="ds-label mb-2 block">Frequência</p>
              <ListboxSelect
                ariaLabel="Frequência"
                value={recurrencePreset}
                disabled={loading}
                onChange={(value) => setRecurrencePreset(value as RecurrencePreset)}
                options={recurrencePresetOptions.map((option) => ({ value: String(option.value), label: option.label }))}
                triggerClassName="ds-control flex w-full items-center justify-between gap-3 px-3.5 text-left"
              >
                <span className="truncate">{recurrencePresetLabel}</span>
                <FaChevronRight className="rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ListboxSelect>
            </div>
            <RadioGroup
              name="recurrence-mode"
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
                required
              />
            ) : (
              <Input
                label="Data final"
                type="date"
                value={recurrenceEndDate}
                min={formatIsoLogicalDate({ year: formData.year, month: formData.month, day: formData.day })}
                onChange={(event) => setRecurrenceEndDate(event.target.value)}
                disabled={loading}
                required
              />
            )}
            <Preview error={recurrencePreview.error}>
              {firstRecurrenceDate && lastRecurrenceDate
                ? `${recurrencePresetLabel} · ${recurrencePreview.dates.length} ocorrências · ${formatPtBrLogicalDate(firstRecurrenceDate)} até ${formatPtBrLogicalDate(lastRecurrenceDate)}. As futuras serão pendentes.`
                : 'Configure a recorrência para revisar o período.'}
            </Preview>
          </div>
        )}

        {!isEditing && isInstallment && (
          <div className={PANEL_CLASS}>
            <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
              <FaCreditCard className="text-[var(--primary)]" aria-hidden="true" /> Parcelar despesa
            </div>
            <Input
              label="Quantidade de parcelas"
              type="number"
              min={2}
              max={MAX_MONTHLY_OCCURRENCES}
              value={installmentCount}
              onChange={(event) => setInstallmentCount(Number(event.target.value))}
              disabled={loading}
              required
            />
            <Preview error={installmentPreview.error}>
              {firstInstallment && lastInstallment
                ? `${installmentPreview.occurrences.length} parcelas · ${formatPtBrLogicalDate(firstInstallment)} até ${formatPtBrLogicalDate(lastInstallment)}. ${
                    installmentAmounts.length === 1
                      ? `Cada parcela: ${formatCentsToCurrency(installmentAmounts[0])}.`
                      : `${formatCentsToCurrency(Math.min(...installmentAmounts))} a ${formatCentsToCurrency(Math.max(...installmentAmounts))}, com resíduos nas primeiras parcelas.`
                  } Total: ${formatCentsToCurrency(installmentTotal)}.`
                : 'Selecione uma categoria de despesa e informe o parcelamento.'}
            </Preview>
          </div>
        )}

        <details className="group border-y border-[var(--border)]" open={hasExtras || undefined}>
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
            <span>
              <strong className="text-[var(--foreground)]">Mais detalhes</strong>
              <span className="ml-2 text-xs text-[var(--text-muted)]">Estabelecimento, tags e divisão</span>
            </span>
            <FaChevronRight className="text-xs text-[var(--text-muted)] transition-transform group-open:rotate-90" aria-hidden="true" />
          </summary>

          <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
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
              triggerClassName={ROW_TRIGGER_CLASS}
            >
              <Row icon={<FaStore />} label="Estabelecimento">
                <span className="min-w-0 text-right">
                  <span className="block truncate font-medium text-[var(--foreground)]">{selectedMerchant?.name ?? 'Opcional'}</span>
                  {merchantRecognition?.kind === 'auto' ? (
                    <span className="block text-xs font-semibold text-[var(--primary)]">Reconhecido por alias</span>
                  ) : merchantRecognition?.kind === 'conflict' ? (
                    <span className="block text-xs font-semibold text-[var(--warning)]">Conflito — escolha manual</span>
                  ) : null}
                </span>
              </Row>
            </ListboxSelect>

            {renderTagEditor('form')}
            {renderAllocationEditor()}
          </div>
        </details>
      </section>

      <FormActions
        isEditing={isEditing || Boolean(reviewingQueueItem)}
        loading={isSubmitting}
        disabled={loading}
        onCancel={handleCancel}
        submitLabel={submitLabel}
        createLabel={createLabel}
        iconsOnMobile
      />
    </FormContainer>
  );
}
