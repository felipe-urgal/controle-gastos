'use client';

import { useMediaQuery } from '@/app/hooks/use-media-query';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaCalendarAlt,
  FaCheck,
  FaChevronRight,
  FaExchangeAlt,
  FaFileAlt,
  FaSlidersH,
  FaWallet,
} from 'react-icons/fa';

import { FormContainer } from '@/app/components/forms';
import { Button, Input, RadioGroup } from '@/app/components/ui';
import ReceiptSelect from '@/app/components/pages/transactions/shared/receipt-select';
import { useCurrencyFormatter } from '@/app/lib/currency/format-currency';
import {
  getTransferIdempotencyAttempt,
  type TransferIdempotencyAttempt,
} from '@/app/lib/transfers/client-idempotency';
import { formatPtBrLogicalDate } from '@/app/lib/date/logical-date';
import { accountService } from '@/app/services/account-service';
import { transferService } from '@/app/services/transfer-service';
import type { AccountModel } from '@/app/types/account';
import type { CreateTransferInput, TransferStatus, UpdateTransferInput } from '@/app/types/transfer';

interface TransferFormProps {
  onCancelOverride?: () => void;
  onSelectTransactionType?: (type: 'INCOME' | 'EXPENSE') => void;
  transferId?: string;
}


const transferStatusOptions = [
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export default function TransferForm({
  onCancelOverride,
  onSelectTransactionType,
  transferId,
}: TransferFormProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
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
  const [status, setStatus] = useState<TransferStatus>('COMPLETED');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
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

    async function loadData() {
      try {
        const [accountsResponse, transferResponse] = await Promise.all([
          accountService.getAll(),
          transferId ? transferService.getById(transferId) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        setAccounts(accountsResponse.data?.items || []);
        if (transferResponse) {
          const transfer = transferResponse.data;
          setSourceAccountId(transfer.source.account.id);
          setDestinationAccountId(transfer.destination.account.id);
          setAmountCents(transfer.amountCents);
          setYear(transfer.year);
          setMonth(transfer.month);
          setDay(transfer.day);
          setDescription(transfer.description);
          setStatus(transfer.status);
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error ? error.message : 'Não foi possível carregar a transferência',
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [transferId]);

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

  function buildPayload() {
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
    if (amountCents > 1_000_000_000) {
      throw new Error('O valor excede o limite permitido por transferência');
    }
    if (description.trim().length < 2) {
      throw new Error('Informe uma descrição');
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
      if (transferId) {
        const updatePayload: UpdateTransferInput = {
          amountCents: payload.amountCents,
          year: payload.year,
          month: payload.month,
          day: payload.day,
          description: payload.description,
          status: payload.status,
        };
        await transferService.update(transferId, updatePayload);
      } else {
        const createPayload: CreateTransferInput = {
          ...payload,
          status: payload.status === 'CANCELLED' ? 'PENDING' : payload.status,
        };
        const attempt = getTransferIdempotencyAttempt(
          idempotencyAttemptRef.current,
          createPayload,
        );
        idempotencyAttemptRef.current = attempt;
        await transferService.create(createPayload, attempt.key);
      }
      router.replace('/transacoes');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Erro ao salvar transferência',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function advanceMobileTransferStep() {
    setSubmitError(null);
    try {
      buildPayload();
      setMobileStep(2);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Revise os dados da transferência',
      );
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
  const activeAccounts = accounts.filter(
    (account) => account.isActive && account.type !== 'CREDIT_CARD',
  );
  const sourceOptions = activeAccounts.map((account) => ({
    value: account.id,
    label: `${account.name} · ${account.currency}`,
    color: account.color,
    icon: account.icon,
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
      color: account.color,
      icon: account.icon,
    }));
  const selectedDateLabel = formatPtBrLogicalDate({ year, month, day });
  const availableStatusOptions = transferId
    ? transferStatusOptions
    : transferStatusOptions.filter((option) => option.value !== 'CANCELLED');

  const selectedStatusLabel =
    availableStatusOptions.find((option) => option.value === status)?.label ?? status;

  return (
    <>
      {!isDesktop && (
      <FormContainer
        bare
        onSubmit={(event) => event.preventDefault()}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-4 pb-4 "
      >
        <section aria-label="Nova transferência mobile">
          <div className="mb-5 grid grid-cols-[auto_minmax(44px,1fr)_auto_minmax(44px,1fr)_auto] items-start gap-2 px-4" aria-label="Etapas da transferência">
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
              <div className="grid grid-cols-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-1" aria-label="Tipo da transação">
                <Button
                  variant="ghost"
                  onClick={() => onSelectTransactionType?.('EXPENSE')}
                  disabled={loading || Boolean(transferId) || !onSelectTransactionType}
                  icon={<FaArrowDown aria-hidden="true" />}
                  className="min-w-0 px-2"
                >
                  <span className="truncate">Despesa</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onSelectTransactionType?.('INCOME')}
                  disabled={loading || Boolean(transferId) || !onSelectTransactionType}
                  icon={<FaArrowUp aria-hidden="true" />}
                  className="min-w-0 px-2"
                >
                  <span className="truncate">Receita</span>
                </Button>
                <Button variant="primary" aria-pressed="true" icon={<FaExchangeAlt aria-hidden="true" />} className="min-w-0 px-1.5">
                  <span className="truncate">Transferência</span>
                </Button>
              </div>

              <div
                className="min-h-[142px] rounded-[var(--radius-lg)] border border-[var(--primary)] bg-[var(--surface)] p-4"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--primary) 9%, var(--surface)) 0%, var(--surface) 72%)',
                  boxShadow:
                    'inset 0 0 34px color-mix(in srgb, var(--primary) 7%, transparent)',
                }}
              >
                <label htmlFor="mobile-transfer-amount" className="text-sm text-[var(--text-muted)]">Valor da transferência</label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    bare
                    id="mobile-transfer-amount"
                    aria-label="Valor"
                    value={displayValue}
                    onChange={handleAmountChange}
                    disabled={loading}
                    inputMode="numeric"
                    className="min-h-[76px] min-w-0 flex-1 border-0 p-0 text-4xl font-black tracking-tight min-[360px]:text-5xl"
                  />
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
                    <FaExchangeAlt />
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Detalhes da transferência</h2>
                <span className="shrink-0 text-sm text-[var(--text-muted)]">Passo 1 de 3</span>
              </div>

              <div className="grid gap-2.5">
                <ReceiptSelect
                  ariaLabel="Conta de origem"
                  value={sourceAccountId}
                  disabled={loading || Boolean(transferId)}
                  onChange={handleSourceChange}
                  options={sourceOptions}
                  triggerClassName="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaWallet aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Conta de origem <span className="text-[var(--expense)]">*</span></strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">
                      {selectedSource ? `${selectedSource.name} · ${selectedSource.currency}` : 'Selecione a origem'}
                    </span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </ReceiptSelect>

                <ReceiptSelect
                  ariaLabel="Conta de destino"
                  value={destinationAccountId}
                  disabled={loading || Boolean(transferId) || !selectedSource}
                  onChange={setDestinationAccountId}
                  options={destinationOptions}
                  triggerClassName="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaWallet aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Conta de destino <span className="text-[var(--expense)]">*</span></strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">
                      {selectedDestination
                        ? `${selectedDestination.name} · ${selectedDestination.currency}`
                        : selectedSource
                          ? 'Selecione o destino'
                          : 'Selecione primeiro a origem'}
                    </span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </ReceiptSelect>

                <label className="relative grid min-h-[76px] cursor-pointer grid-cols-[48px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3">
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaCalendarAlt aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--foreground)]">Data <span className="text-[var(--expense)]">*</span></span>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{selectedDateLabel}</span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                  <input
                    aria-label="Data"
                    type="date"
                    value={`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      const [nextYear, nextMonth, nextDay] = event.target.value.split('-').map(Number);
                      setYear(nextYear);
                      setMonth(nextMonth);
                      setDay(nextDay);
                    }}
                    disabled={loading}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>

                <div className="grid min-h-[86px] grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3">
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <FaFileAlt aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <label htmlFor="mobile-transfer-description" className="block text-sm font-bold text-[var(--foreground)]">Descrição</label>
                    <Input
                      bare
                      id="mobile-transfer-description"
                      aria-label="Descrição"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      disabled={loading}
                      minLength={2}
                      maxLength={255}
                      enterKeyHint="next"
                      placeholder="Ex.: Reserva, ajuste entre contas..."
                      className="mt-1 text-sm text-[var(--text-muted)] placeholder:text-[var(--text-subtle)]"
                    />
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </div>

                <button
                  type="button"
                  onClick={advanceMobileTransferStep}
                  disabled={loading}
                  className="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--primary)]">
                    <FaSlidersH aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Detalhes avançados</strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">Status da transferência</span>
                  </span>
                  <FaChevronRight className="rotate-90 text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-3">
                <Button size="cta" type="button" variant="secondary" onClick={handleCancel} disabled={loading} fullWidth>Cancelar</Button>
                <Button size="cta" type="button" onClick={advanceMobileTransferStep} disabled={loading} icon={<FaArrowRight />} iconPosition="right" fullWidth>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {mobileStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Detalhes avançados</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Passo 2 de 3 · ajuste o status da transferência.</p>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Transferência</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <strong className="truncate text-sm">{selectedSource?.name ?? 'Origem'} → {selectedDestination?.name ?? 'Destino'}</strong>
                  <strong className="shrink-0 text-lg">{formatCentsToCurrency(amountCents)}</strong>
                </div>
              </div>

              <RadioGroup
                required
                name="transfer-status-mobile"
                label="Status"
                value={status}
                onChange={(value) => setStatus(value as TransferStatus)}
                options={availableStatusOptions}
                disabled={loading}
              />

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-3">
                <Button size="cta" type="button" variant="secondary" onClick={() => setMobileStep(1)} disabled={loading} fullWidth>Voltar</Button>
                <Button size="cta" type="button" onClick={() => setMobileStep(3)} disabled={loading} icon={<FaArrowRight />} iconPosition="right" fullWidth>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {mobileStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Revisar transferência</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Passo 3 de 3 · confira antes de confirmar.</p>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--primary)]/45 bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--text-muted)]">Transferência</p>
                <strong className="mt-1 block text-4xl font-black tracking-tight text-[var(--foreground)]">{formatCentsToCurrency(amountCents)}</strong>
                <dl className="mt-4 grid gap-2">
                  <TransferReviewRow label="Origem" value={selectedSource?.name ?? 'Não selecionada'} />
                  <TransferReviewRow label="Destino" value={selectedDestination?.name ?? 'Não selecionado'} />
                  <TransferReviewRow label="Data" value={selectedDateLabel} />
                  <TransferReviewRow label="Descrição" value={description || 'Sem descrição'} />
                  <TransferReviewRow label="Status" value={selectedStatusLabel} />
                </dl>
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-3">
                <Button size="cta" type="button" variant="secondary" onClick={() => setMobileStep(2)} disabled={loading} fullWidth>Voltar</Button>
                <Button size="cta"
                  type="button"
                  onClick={() => void persistTransfer()}
                  isLoading={isSubmitting}
                  disabled={loading}
                  icon={<FaCheck />}
                  iconPosition="right"
                  fullWidth
                >
                  Confirmar transferência
                </Button>
              </div>
            </div>
          )}
        </section>
      </FormContainer>
      )}

      {isDesktop && (
      <FormContainer
        bare
        onSubmit={handleSubmit}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-4 "
      >
        <section
          className="w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-surface)]"
          aria-label="Nova transferência"
        >
          <div className="p-4 sm:p-6">
            <div
              className="mx-auto grid max-w-[520px] grid-cols-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-1"
              aria-label="Tipo da transação"
            >
              <Button
                variant="ghost"
                onClick={() => onSelectTransactionType?.('EXPENSE')}
                disabled={loading || Boolean(transferId) || !onSelectTransactionType}
                icon={<FaArrowDown aria-hidden="true" />}
              >
                Despesa
              </Button>
              <Button
                variant="ghost"
                onClick={() => onSelectTransactionType?.('INCOME')}
                disabled={loading || Boolean(transferId) || !onSelectTransactionType}
                icon={<FaArrowUp aria-hidden="true" />}
              >
                Receita
              </Button>
              <Button variant="primary" aria-pressed="true" icon={<FaExchangeAlt aria-hidden="true" />}>
                Transferência
              </Button>
            </div>

            <div className="mt-6 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div className="text-center lg:pl-[110px]">
                <label htmlFor="transfer-amount" className="sr-only">Valor</label>
                <Input
                  bare
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
                  className="mx-auto min-h-[72px] max-w-[420px] border-0 p-0 text-center text-5xl font-black tracking-tight sm:text-6xl"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Adicionar um valor</p>
              </div>

              <div className="grid gap-2 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <ReceiptSelect
                  ariaLabel="Status"
                  value={status}
                  disabled={loading}
                  onChange={(value) => setStatus(value as TransferStatus)}
                  options={availableStatusOptions.map((option) => ({
                    value: String(option.value),
                    label: option.label,
                  }))}
                  triggerClassName="flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
                  menuClassName="min-w-[190px]"
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
                  <span className="truncate">{selectedStatusLabel}</span>
                  <FaChevronRight className="ml-auto rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                </ReceiptSelect>
                <div className="flex min-h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)]">
                  <FaCalendarAlt aria-hidden="true" /> Única
                </div>
              </div>
            </div>

            <div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <ReceiptSelect
                ariaLabel="Conta de origem"
                value={sourceAccountId}
                disabled={loading || Boolean(transferId)}
                onChange={handleSourceChange}
                options={sourceOptions}
                triggerClassName="grid min-h-[44px] w-full grid-cols-[28px_140px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] disabled:opacity-50"
              >
                <FaWallet className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-[var(--text-muted)]">Conta de origem</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">
                  {selectedSource ? `${selectedSource.name} · ${selectedSource.currency}` : 'Selecione a origem'}
                </span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ReceiptSelect>

              <ReceiptSelect
                ariaLabel="Conta de destino"
                value={destinationAccountId}
                disabled={loading || Boolean(transferId) || !selectedSource}
                onChange={setDestinationAccountId}
                options={destinationOptions}
                triggerClassName="grid min-h-[44px] w-full grid-cols-[28px_140px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] disabled:opacity-50"
              >
                <FaWallet className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-[var(--text-muted)]">Conta de destino</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">
                  {selectedDestination ? `${selectedDestination.name} · ${selectedDestination.currency}` : selectedSource ? 'Selecione o destino' : 'Selecione primeiro a origem'}
                </span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ReceiptSelect>

              <label className="relative grid min-h-[44px] cursor-pointer grid-cols-[28px_140px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-sm">
                <FaCalendarAlt className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-[var(--text-muted)]">Data</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">{selectedDateLabel}</span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
                <input
                  aria-label="Data"
                  type="date"
                  value={`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
                  onChange={(event) => {
                    if (!event.target.value) return;
                    const [nextYear, nextMonth, nextDay] = event.target.value.split('-').map(Number);
                    setYear(nextYear);
                    setMonth(nextMonth);
                    setDay(nextDay);
                  }}
                  disabled={loading}
                  required
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>

              <div className="grid min-h-[44px] grid-cols-[28px_140px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-sm">
                <FaFileAlt className="text-[var(--text-muted)]" aria-hidden="true" />
                <label htmlFor="transfer-description" className="text-[var(--text-muted)]">Descrição</label>
                <Input
                  bare
                  id="transfer-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={loading}
                  required
                  minLength={2}
                  maxLength={255}
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
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">Status da transferência</span>
                  </span>
                </span>
                <span className="text-[var(--text-muted)] group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>
              <div className="border-t border-dashed border-[var(--border)] px-2 py-4">
                <RadioGroup
                  required
                  name="transfer-status"
                  label="Status"
                  value={status}
                  onChange={(value) => setStatus(value as TransferStatus)}
                  options={availableStatusOptions}
                  disabled={loading}
                />
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
              icon={<FaArrowRight />}
              iconPosition="right"
            >
              {transferId ? 'Revisar alterações' : 'Revisar e transferir'}
            </Button>
          </footer>
        </section>
      </FormContainer>
      )}

      {transferId && (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => {
              if (!window.confirm('Excluir esta transferência e as duas movimentações vinculadas?')) return;
              void (async () => {
                setIsSubmitting(true);
                setSubmitError(null);
                try {
                  await transferService.delete(transferId);
                  router.replace('/transacoes');
                } catch (error) {
                  setSubmitError(error instanceof Error ? error.message : 'Não foi possível excluir a transferência');
                  setIsSubmitting(false);
                }
              })();
            }}
          >
            Excluir transferência
          </Button>
        </div>
      )}

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
  if (!isOpen) return null;

  return (
    <ModalShell
      title="Revisar transferência"
      description="Confira as duas contas e o valor antes de confirmar."
      closeLabel="Fechar revisão"
      onClose={onClose}
      closeDisabled={isLoading}
      maxWidthClass="max-w-[520px]"
      sectionClassName=" "
      footer={
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
      }
    >
      <dl className="grid gap-2">
        <TransferReviewRow label="Valor" value={amount} />
        <TransferReviewRow label="Origem" value={source} />
        <TransferReviewRow label="Destino" value={destination} />
        <TransferReviewRow label="Status" value={status} />
      </dl>

    </ModalShell>
  );
}

function TransferReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3.5 py-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}
