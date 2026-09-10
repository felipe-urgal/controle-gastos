'use client';

import { useRouter } from 'next/navigation';
import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { FaArrowRight, FaCheck, FaExchangeAlt } from 'react-icons/fa';

import { FormContainer } from '@/app/components/forms';
import { Button, Input, RadioGroup, Select } from '@/app/components/ui';
import { useCurrencyFormatter } from '@/app/lib/currency/format-currency';
import {
  getTransferIdempotencyAttempt,
  type TransferIdempotencyAttempt,
} from '@/app/lib/transfers/client-idempotency';
import { formatPtBrLogicalDate } from '@/app/lib/transactions/monthly-recurrence';
import { accountService } from '@/app/services/account-service';
import { transferService } from '@/app/services/transfer-service';
import type { AccountModel } from '@/app/types/account';
import type { CreateTransferInput } from '@/app/types/transfer';

interface TransferFormProps {
  onCancelOverride?: () => void;
}

type TransferCreateStatus = CreateTransferInput['status'];

const transferStatusOptions = [
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'PENDING', label: 'Pendente' },
];

export default function TransferForm({ onCancelOverride }: TransferFormProps) {
  const router = useRouter();
  const now = new Date();
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TransferCreateStatus>('COMPLETED');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const idempotencyAttemptRef = useRef<TransferIdempotencyAttempt | null>(null);

  const selectedSource = accounts.find((account) => account.id === sourceAccountId);
  const selectedDestination = accounts.find(
    (account) => account.id === destinationAccountId,
  );
  const { displayValue, setDisplayValue, formatCentsToCurrency } = useCurrencyFormatter({
    initialValue: 'R$ 0,00',
    currency: selectedSource?.currency || 'BRL',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        const response = await accountService.getAll();
        if (!cancelled) {
          setAccounts(response.data?.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error ? error.message : 'Não foi possível carregar as contas',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDisplayValue(formatCentsToCurrency(amountCents));
  }, [amountCents, formatCentsToCurrency, setDisplayValue]);

  function handleCancel() {
    if (onCancelOverride) {
      onCancelOverride();
      return;
    }

    router.replace('/transacoes');
  }

  function moveCursorToEnd() {
    requestAnimationFrame(() => {
      const input = amountInputRef.current;
      if (!input) return;
      const length = input.value.length;
      input.setSelectionRange(length, length);
    });
  }

  function handleAmountChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const raw = event.target.value.replace(/\D/g, '');
    const cents = Number(raw || 0);
    setAmountCents(cents);
    setDisplayValue(formatCentsToCurrency(cents));
    moveCursorToEnd();
  }

  function handleSourceChange(value: string | number) {
    const nextSourceId = String(value);
    const nextSource = accounts.find((account) => account.id === nextSourceId);
    setSourceAccountId(nextSourceId);
    setDestinationAccountId((currentDestinationId) => {
      const destination = accounts.find((account) => account.id === currentDestinationId);
      if (
        !destination ||
        destination.id === nextSourceId ||
        (nextSource && destination.currency !== nextSource.currency)
      ) {
        return '';
      }
      return currentDestinationId;
    });
  }

  function buildPayload(): CreateTransferInput {
    if (!selectedSource || !selectedSource.isActive) {
      throw new Error('Selecione uma conta de origem ativa');
    }
    if (!selectedDestination || !selectedDestination.isActive) {
      throw new Error('Selecione uma conta de destino ativa');
    }
    if (selectedSource.id === selectedDestination.id) {
      throw new Error('As contas de origem e destino devem ser diferentes');
    }
    if (selectedSource.currency !== selectedDestination.currency) {
      throw new Error('Transferências entre moedas diferentes não são suportadas');
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('O valor deve ser maior que zero');
    }

    return {
      sourceAccountId: selectedSource.id,
      destinationAccountId: selectedDestination.id,
      amountCents,
      year,
      month,
      day,
      description: description.trim(),
      status,
    };
  }

  async function persistTransfer() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildPayload();
      const attempt = getTransferIdempotencyAttempt(
        idempotencyAttemptRef.current,
        payload,
      );
      idempotencyAttemptRef.current = attempt;

      await transferService.create(payload, attempt.key);
      router.replace('/transacoes');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Erro ao salvar transferência',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    try {
      buildPayload();
      setReviewOpen(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Revise os dados da transferência',
      );
    }
  }

  const loading = isSubmitting || loadingData;
  const activeAccounts = accounts.filter((account) => account.isActive);
  const sourceOptions = activeAccounts.map((account) => ({
    value: account.id,
    label: `${account.name} · ${account.currency}`,
  }));
  const destinationOptions = activeAccounts
    .filter(
      (account) =>
        account.id !== sourceAccountId &&
        (!selectedSource || account.currency === selectedSource.currency),
    )
    .map((account) => ({
      value: account.id,
      label: `${account.name} · ${account.currency}`,
    }));
  const selectedDateLabel = formatPtBrLogicalDate({ year, month, day });
  const selectedStatusLabel =
    transferStatusOptions.find((option) => option.value === status)?.label ?? status;

  return (
    <>
      <FormContainer
        onSubmit={handleSubmit}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-3 !border-0 !bg-transparent !p-0 !pb-20 !shadow-none [--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)] lg:!pb-0"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <section
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-[18px]"
            aria-label="Nova transferência"
          >
            <div className="flex min-h-12 items-center justify-center gap-2 rounded-[11px] border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] px-3 py-3 text-sm font-bold text-[var(--orbit-primary)] sm:text-base">
              <FaExchangeAlt aria-hidden="true" />
              Transferência entre contas
            </div>

            <div className="mt-4 rounded-[14px] border border-[var(--orbit-primary)] bg-[var(--surface-subtle)] p-4 sm:p-[18px]">
              <label
                htmlFor="transfer-amount"
                className="mb-2 block text-sm font-medium text-[var(--text-muted)]"
              >
                Valor
                <span className="ml-1 text-[var(--expense)]" aria-hidden="true">
                  *
                </span>
              </label>
              <Input
                id="transfer-amount"
                ref={amountInputRef}
                aria-label="Valor"
                value={displayValue}
                onChange={handleAmountChange}
                onFocus={moveCursorToEnd}
                onClick={moveCursorToEnd}
                disabled={loading}
                required
                inputMode="numeric"
                className="!min-h-12 !border-0 !bg-transparent !px-0 !py-0 text-[34px] font-extrabold tracking-tight !text-[var(--foreground)] !outline-none focus-visible:!outline-none sm:text-[38px]"
              />
            </div>

            <div className="mt-4 grid gap-x-3 gap-y-3 md:grid-cols-2">
              <Select
                label="Conta de origem"
                value={sourceAccountId}
                onChange={handleSourceChange}
                options={sourceOptions}
                disabled={loading}
                required
                placeholder="Selecione a origem"
              />

              <Select
                label="Conta de destino"
                value={destinationAccountId}
                onChange={(value) => setDestinationAccountId(String(value))}
                options={destinationOptions}
                disabled={loading || !selectedSource}
                required
                placeholder={
                  selectedSource ? 'Selecione o destino' : 'Selecione primeiro a origem'
                }
              />

              <Input
                label="Data"
                type="date"
                value={`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const [nextYear, nextMonth, nextDay] = event.target.value
                    .split('-')
                    .map(Number);
                  setYear(nextYear);
                  setMonth(nextMonth);
                  setDay(nextDay);
                }}
                disabled={loading}
                required
              />

              <Input
                label="Descrição"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={loading}
                required
                minLength={2}
                maxLength={255}
                placeholder="Ex.: Reserva mensal, aporte, ajuste entre contas..."
              />
            </div>

            <details className="group mt-4 overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--orbit-focus)]">
                <span>✦ Adicionar detalhes</span>
                <span className="text-[var(--text-muted)] group-open:hidden" aria-hidden="true">
                  ⌄
                </span>
                <span className="hidden text-[var(--text-muted)] group-open:inline" aria-hidden="true">
                  ⌃
                </span>
              </summary>
              <div className="border-t border-[var(--border)] p-4">
                <RadioGroup
                  required
                  name="transfer-status"
                  label="Status"
                  value={status}
                  onChange={(value) => setStatus(value as TransferCreateStatus)}
                  options={transferStatusOptions}
                  disabled={loading}
                />
              </div>
            </details>

            <div className="mt-5 hidden flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:flex">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                disabled={loading}
                icon={<FaArrowRight />}
                iconPosition="right"
              >
                Revisar e transferir
              </Button>
            </div>
          </section>

          <aside className="hidden lg:block">
            <div
              className="sticky top-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-[18px]"
              aria-labelledby="transfer-summary-title"
            >
              <h2
                id="transfer-summary-title"
                className="text-lg font-semibold text-[var(--foreground)]"
              >
                Resumo da transferência
              </h2>

              <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] px-3 py-1.5 text-sm font-bold text-[var(--orbit-primary)]">
                <FaExchangeAlt aria-hidden="true" />
                Transferência
              </span>

              <p className="mt-4 text-[30px] font-black tracking-tight text-[var(--foreground)]">
                {formatCentsToCurrency(amountCents)}
              </p>

              <dl className="mt-5 grid gap-3 text-sm">
                <TransferSummaryRow
                  label="Origem"
                  value={
                    selectedSource
                      ? `${selectedSource.name} · ${selectedSource.currency}`
                      : 'Não selecionada'
                  }
                />
                <TransferSummaryRow
                  label="Destino"
                  value={
                    selectedDestination
                      ? `${selectedDestination.name} · ${selectedDestination.currency}`
                      : 'Não selecionado'
                  }
                />
                <TransferSummaryRow label="Data" value={selectedDateLabel} />
                <TransferSummaryRow label="Status" value={selectedStatusLabel} />
              </dl>

              <div className="mt-5 rounded-[12px] border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] p-3 text-sm leading-relaxed text-[var(--text-muted)]">
                <strong className="text-[var(--foreground)]">✦ Sem categoria artificial</strong>
                <br />
                O valor sai da origem e entra no destino sem virar receita ou despesa operacional.
              </div>
            </div>
          </aside>
        </div>
      </FormContainer>

      <div className="fixed bottom-[calc(var(--app-mobile-bottom-nav-height)_+_env(safe-area-inset-bottom))] left-0 right-0 z-40 grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 py-2 backdrop-blur lg:hidden">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={loading}
          fullWidth
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => amountInputRef.current?.form?.requestSubmit()}
          isLoading={loading}
          disabled={loading}
          fullWidth
        >
          Transferir
        </Button>
      </div>

      <TransferReviewModal
        isOpen={reviewOpen}
        isLoading={isSubmitting}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => {
          setReviewOpen(false);
          void persistTransfer();
        }}
        amount={formatCentsToCurrency(amountCents)}
        source={selectedSource?.name ?? 'Não selecionada'}
        destination={selectedDestination?.name ?? 'Não selecionado'}
        status={selectedStatusLabel}
      />
    </>
  );
}

function TransferSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

interface TransferReviewModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  source: string;
  destination: string;
  status: string;
}

function TransferReviewModal({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
  amount,
  source,
  destination,
  status,
}: TransferReviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !isLoading) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (activeElement === dialogRef.current) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar revisão"
        className="absolute inset-0 h-full w-full bg-[var(--overlay)]"
        onClick={isLoading ? undefined : onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-busy={isLoading || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="pointer-events-auto w-full max-w-[520px] rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] p-5 shadow-2xl [--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary:var(--orbit-primary)]"
        >
          <h2 id={titleId} className="text-xl font-semibold text-[var(--foreground)]">
            Revisar transferência
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-[var(--text-muted)]">
            Confira as duas contas e o valor antes de confirmar.
          </p>

          <dl className="mt-4 grid gap-2">
            <TransferReviewRow label="Valor" value={amount} />
            <TransferReviewRow label="Origem" value={source} />
            <TransferReviewRow label="Destino" value={destination} />
            <TransferReviewRow label="Status" value={status} />
          </dl>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Voltar
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={isLoading}
              icon={<FaCheck />}
            >
              Confirmar transferência
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] bg-[var(--surface-raised)] px-3.5 py-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}
