'use client';

import ReceiptSelect from '@/app/components/pages/transactions/shared/receipt-select';
import ReceiptOcrScanner from '@/app/components/pages/transactions/form/receipt-ocr-scanner';
import { FaArrowDown, FaArrowRight, FaArrowUp, FaCalendarAlt, FaCheck, FaChevronRight, FaCreditCard, FaExchangeAlt, FaFileAlt, FaStore, FaRedoAlt, FaSlidersH, FaTag, FaWallet } from 'react-icons/fa';
import { FormContainer } from '@/app/components/forms';
import { Button, IconRenderer, Input, RadioGroup } from '@/app/components/ui';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { MAX_RECURRENCE_OCCURRENCES } from '@/app/lib/transactions/logical-recurrence';
import { formatIsoLogicalDate, formatPtBrLogicalDate, MAX_MONTHLY_OCCURRENCES } from '@/app/lib/transactions/monthly-recurrence';
import { recurrencePresetOptions, RecurrencePreset } from '@/app/lib/transactions/recurrence-presets';
import { TransactionStatus } from '@/app/types/transaction';
import { CreationMode, RecurrenceMode } from '@/app/components/pages/transactions/form/transaction-form-shared';

import type { TransactionFormState } from '@/app/components/pages/transactions/form/use-transaction-form';

export function DesktopTransactionForm({ form }: { form: TransactionFormState }) {
  const { isEditing, onSuccess, onSelectTransfer, formData, setFormData, creationMode, setCreationMode, recurrencePreset, setRecurrencePreset, recurrenceMode, setRecurrenceMode, occurrenceCount, setOccurrenceCount, recurrenceEndDate, setRecurrenceEndDate, installmentCount, setInstallmentCount, merchants, submitError, setSubmitError, merchantRecognition, amountInputRef, desktopDateInputRef, selectedAccount, selectedCategory, selectedMerchant, displayValue, formatCentsToCurrency, recurrencePreview, installmentPreview, handleCancel, moveCursorToEnd, handleAmountChange, handleMerchantChange, handleDescriptionChange, receiptOcrFormState, handleReceiptOcrApplication, handleCategoryType, handleCategoryChange, handleSubmit, loading, renderTagEditor, renderAllocationEditor, accountOptions, categoryOptions, isFixedDate, firstRecurrenceDate, lastRecurrenceDate, firstInstallment, lastInstallment, installmentTotal, installmentAmounts, operationType, selectedStatusLabel, selectedDateLabel, recurrencePresetLabel, creationModeLabel, createLabel } = form;

  return (
    <FormContainer
        bare
        onSubmit={handleSubmit}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-4 "
      >
        <section
          className="w-full overflow-visible rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-surface)]"
          aria-label={isEditing ? 'Editar transação' : 'Nova transação'}
        >
          <div className="p-4 sm:p-6">
            <div
              className="mx-auto grid max-w-[520px] grid-cols-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-1"
              aria-label="Tipo da transação"
            >
              <Button
                variant={operationType === 'EXPENSE' ? 'primary' : 'ghost'}
                aria-pressed={operationType === 'EXPENSE'}
                onClick={() => handleCategoryType('EXPENSE')}
                disabled={loading}
                icon={<FaArrowDown aria-hidden="true" />}
              >
                Despesa
              </Button>
              <Button
                variant={operationType === 'INCOME' ? 'primary' : 'ghost'}
                aria-pressed={operationType === 'INCOME'}
                onClick={() => handleCategoryType('INCOME')}
                disabled={loading}
                icon={<FaArrowUp aria-hidden="true" />}
              >
                Receita
              </Button>
              <Button
                variant="ghost"
                onClick={onSelectTransfer}
                disabled={loading || !onSelectTransfer}
                aria-label={isEditing ? 'Transferência indisponível na edição' : 'Transferência'}
                icon={<FaExchangeAlt aria-hidden="true" />}
              >
                Transferência
              </Button>
            </div>

            {!isEditing ? (
              <ReceiptOcrScanner
                disabled={loading}
                formState={receiptOcrFormState}
                onApply={handleReceiptOcrApplication}
                className="mx-auto mt-3 grid w-full max-w-[520px] gap-2"
              />
            ) : null}

            <div className="mt-6 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div className="text-center lg:pl-[110px]">
                <label htmlFor="transaction-amount" className="sr-only">
                  {creationMode === 'installment' ? 'Valor total' : 'Valor'}
                </label>
                <Input
                  bare
                  id="transaction-amount"
                  ref={amountInputRef}
                  aria-label={creationMode === 'installment' ? 'Valor total' : 'Valor'}
                  value={displayValue}
                  onChange={handleAmountChange}
                  onFocus={moveCursorToEnd}
                  onClick={moveCursorToEnd}
                  disabled={loading}
                  required
                  inputMode="numeric"
                  className="mx-auto min-h-[72px] max-w-[420px] border-0 p-0 text-center text-5xl font-black tracking-tight sm:text-6xl"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {creationMode === 'installment' ? 'Valor total da compra' : 'Adicionar um valor'}
                </p>
              </div>

              <div className="grid gap-2 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <ReceiptSelect
                  ariaLabel="Status"
                  value={formData.status}
                  disabled={loading}
                  onChange={(value) =>
                    setFormData((previous) => ({
                      ...previous,
                      status: value as TransactionStatus,
                    }))
                  }
                  options={statusOptions.map((option) => ({
                    value: String(option.value),
                    label: option.label,
                  }))}
                  triggerClassName="flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
                  menuClassName="min-w-[190px]"
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
                  <span className="truncate">{selectedStatusLabel}</span>
                  <FaChevronRight className="ml-auto rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                </ReceiptSelect>

                {!isEditing ? (
                  <ReceiptSelect
                    ariaLabel="Criar como"
                    value={creationMode}
                    disabled={loading}
                    onChange={(value) => setCreationMode(value as CreationMode)}
                    options={[
                      { value: 'single', label: 'Única' },
                      { value: 'recurring', label: 'Recorrente' },
                      { value: 'installment', label: 'Parcelada' },
                    ]}
                    triggerClassName="flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
                    menuClassName="min-w-[190px]"
                  >
                    <FaCalendarAlt aria-hidden="true" />
                    <span className="truncate">{creationModeLabel}</span>
                    <FaChevronRight className="ml-auto rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                  </ReceiptSelect>
                ) : (
                  <div className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)]">
                    <FaCalendarAlt aria-hidden="true" /> Única
                  </div>
                )}

              </div>
            </div>

            <div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <ReceiptSelect
                ariaLabel="Conta"
                value={formData.accountId}
                disabled={loading}
                onChange={(value) =>
                  setFormData((previous) => ({ ...previous, accountId: value }))
                }
                options={accountOptions}
                triggerClassName="grid min-h-[44px] w-full grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] disabled:opacity-50"
              >
                <FaWallet className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-[var(--text-muted)]">Conta</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">
                  {selectedAccount?.name ?? 'Selecione uma conta'}
                </span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ReceiptSelect>

              <ReceiptSelect
                ariaLabel="Categoria"
                value={formData.categoryId}
                disabled={loading}
                onChange={handleCategoryChange}
                groups={categoryOptions}
                triggerClassName="grid min-h-[44px] w-full grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] disabled:opacity-50"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-white"
                  style={{ backgroundColor: selectedCategory?.color || 'var(--surface-subtle)' }}
                >
                  {selectedCategory ? (
                    <IconRenderer iconName={selectedCategory.icon || 'tag'} size={12} />
                  ) : (
                    <FaTag className="text-[var(--text-muted)]" aria-hidden="true" />
                  )}
                </span>
                <span className="text-[var(--text-muted)]">Categoria</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">
                  {selectedCategory?.name ?? 'Selecione uma categoria'}
                </span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ReceiptSelect>

              <ReceiptSelect
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
                triggerClassName="grid min-h-[44px] w-full grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] disabled:opacity-50"
              >
                <FaStore className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-[var(--text-muted)]">Estabelecimento</span>
                <span className="min-w-0 text-right">
                  <span className="block truncate font-medium text-[var(--foreground)]">
                    {selectedMerchant?.name ?? 'Opcional'}
                  </span>
                  {merchantRecognition?.kind === 'auto' ? (
                    <span className="block text-xs font-semibold text-[var(--primary)]">
                      Reconhecido por alias
                    </span>
                  ) : merchantRecognition?.kind === 'conflict' ? (
                    <span className="block text-xs font-semibold text-[var(--warning)]">
                      Conflito — escolha manual
                    </span>
                  ) : null}
                </span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ReceiptSelect>

              {renderAllocationEditor()}
              {renderTagEditor('desktop')}

              <div className="relative">
                {isFixedDate ? (
                  <div className="grid min-h-[44px] grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-sm">
                    <FaCalendarAlt className="text-[var(--text-muted)]" aria-hidden="true" />
                    <span className="text-[var(--text-muted)]">Data</span>
                    <span className="truncate text-right font-medium text-[var(--foreground)]">{selectedDateLabel}</span>
                    <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={`Data, ${selectedDateLabel}. Abrir calendário`}
                      onClick={() => desktopDateInputRef.current?.showPicker()}
                      disabled={loading}
                      className="grid min-h-[44px] w-full grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] disabled:opacity-50"
                    >
                      <FaCalendarAlt className="text-[var(--text-muted)]" aria-hidden="true" />
                      <span className="text-[var(--text-muted)]">Data</span>
                      <span className="truncate text-right font-medium text-[var(--foreground)]">{selectedDateLabel}</span>
                      <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
                    </button>
                    <input
                      ref={desktopDateInputRef}
                      aria-label={creationMode === 'installment' ? 'Data da primeira parcela' : 'Data'}
                      type="date"
                      value={formatIsoLogicalDate({
                        year: formData.year,
                        month: formData.month,
                        day: formData.day,
                      })}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const [year, month, day] = event.target.value.split('-').map(Number);
                        setFormData((previous) => ({ ...previous, day, month, year }));
                      }}
                      disabled={loading}
                      required
                      tabIndex={-1}
                      className="pointer-events-none absolute h-px w-px opacity-0"
                    />
                  </>
                )}
              </div>

              <div className="grid min-h-[44px] grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-sm">
                <FaFileAlt className="text-[var(--text-muted)]" aria-hidden="true" />
                <label htmlFor="transaction-description" className="text-[var(--text-muted)]">Descrição</label>
                <Input
                  bare
                  id="transaction-description"
                  value={formData.description}
                  onChange={(event) => handleDescriptionChange(event.target.value)}
                  disabled={loading}
                  required
                  maxLength={100}
                  enterKeyHint="next"
                  placeholder="Adicionar descrição"
                  className="text-right font-medium placeholder:text-[var(--text-subtle)]"
                />
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </div>
            </div>

            <details className="group mt-3 border-y border-dashed border-[var(--border-strong)]">
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-4 px-2 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]">
                <span className="flex items-center gap-3">
                  <FaSlidersH className="text-[var(--text-muted)]" aria-hidden="true" />
                  <span>
                    <strong className="block text-sm text-[var(--foreground)]">Detalhes avançados</strong>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Status, recorrência e parcelamento
                    </span>
                  </span>
                </span>
                <span className="text-[var(--text-muted)] group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>

              <div className="space-y-5 border-t border-dashed border-[var(--border)] px-2 py-4">
                <RadioGroup
                  required
                  name="status-advanced"
                  label={creationMode === 'installment' ? 'Status da primeira parcela' : 'Status'}
                  value={formData.status}
                  onChange={(value) =>
                    setFormData((previous) => ({
                      ...previous,
                      status: value as TransactionStatus,
                    }))
                  }
                  options={statusOptions}
                  disabled={loading}
                />

                {!isEditing && creationMode === 'recurring' && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <div className="flex items-start gap-3">
                      <FaRedoAlt className="mt-1 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">Repetir lançamento</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            Configure a frequência da série.
                          </p>
                        </div>
                        <div>
                          <p className="ds-label mb-2 block">Frequência</p>
                          <ReceiptSelect
                            ariaLabel="Frequência"
                            value={recurrencePreset}
                            disabled={loading}
                            onChange={(value) => setRecurrencePreset(value as RecurrencePreset)}
                            options={recurrencePresetOptions.map((option) => ({
                              value: String(option.value),
                              label: option.label,
                            }))}
                            triggerClassName="ds-control flex w-full items-center justify-between gap-3 px-3.5 text-left"
                          >
                            <span className="truncate">{recurrencePresetLabel}</span>
                            <FaChevronRight className="rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                          </ReceiptSelect>
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
                            min={formatIsoLogicalDate({
                              year: formData.year,
                              month: formData.month,
                              day: formData.day,
                            })}
                            onChange={(event) => setRecurrenceEndDate(event.target.value)}
                            disabled={loading}
                            required
                          />
                        )}
                        <div
                          className={`rounded-[var(--radius-md)] border p-3 text-sm leading-relaxed ${
                            recurrencePreview.error
                              ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                              : 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--foreground)]'
                          }`}
                          role={recurrencePreview.error ? 'alert' : 'status'}
                        >
                          {recurrencePreview.error
                            ? recurrencePreview.error
                            : firstRecurrenceDate && lastRecurrenceDate
                              ? `${recurrencePresetLabel} · ${recurrencePreview.dates.length} ocorrências · ${formatPtBrLogicalDate(firstRecurrenceDate)} até ${formatPtBrLogicalDate(lastRecurrenceDate)}. As futuras serão pendentes.`
                              : 'Configure a recorrência para revisar o período.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isEditing && creationMode === 'installment' && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <div className="flex items-start gap-3">
                      <FaCreditCard className="mt-1 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">Parcelar despesa</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            O valor principal é o total; os centavos são distribuídos exatamente.
                          </p>
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
                        <div
                          className={`rounded-[var(--radius-md)] border p-3 text-sm leading-relaxed ${
                            installmentPreview.error
                              ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                              : 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--foreground)]'
                          }`}
                          role={installmentPreview.error ? 'alert' : 'status'}
                        >
                          {installmentPreview.error ? (
                            installmentPreview.error
                          ) : firstInstallment && lastInstallment ? (
                            <div className="space-y-1">
                              <p>
                                <strong>{installmentPreview.occurrences.length} parcelas</strong> · {formatPtBrLogicalDate(firstInstallment)} até {formatPtBrLogicalDate(lastInstallment)}.
                              </p>
                              <p>
                                {installmentAmounts.length === 1
                                  ? `Cada parcela: ${formatCentsToCurrency(installmentAmounts[0])}.`
                                  : `${formatCentsToCurrency(Math.min(...installmentAmounts))} a ${formatCentsToCurrency(Math.max(...installmentAmounts))}, com resíduos nas primeiras parcelas.`}
                              </p>
                              <p>Total conferido: <strong>{formatCentsToCurrency(installmentTotal)}</strong>.</p>
                            </div>
                          ) : (
                            'Selecione uma categoria de despesa e informe o parcelamento.'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>

          <footer className="hidden items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--surface-raised)]/40 px-5 py-4 lg:flex sm:px-7">
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading}
              icon={!isEditing && !onSuccess ? <FaArrowRight /> : <FaCheck />}
              iconPosition="right"
            >
              {isEditing
                ? 'Salvar alterações'
                : !onSuccess
                  ? 'Revisar e criar'
                  : createLabel}
            </Button>
          </footer>
        </section>
      </FormContainer>
  );
}
