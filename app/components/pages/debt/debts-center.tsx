'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArchive,
  FaCheck,
  FaEdit,
  FaHistory,
  FaPlus,
  FaTrash,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { debtService, type DebtInput } from '@/app/services/debt-service';
import type { Debt, DebtAdjustmentKind, DebtStatus } from '@/app/types/debt';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type DebtFilter = 'ALL' | DebtStatus;

type DebtFormState = {
  name: string;
  currency: SupportedCurrency;
  balance: string;
  installmentAmount: string;
  dueDate: string;
  remainingInstallments: string;
  institution: string;
  description: string;
};

const emptyForm: DebtFormState = {
  name: '',
  currency: 'BRL',
  balance: '',
  installmentAmount: '',
  dueDate: '',
  remainingInstallments: '',
  institution: '',
  description: '',
};

function moneyInput(value: number | null) {
  if (value === null) return '';
  return (value / 100).toFixed(2).replace('.', ',');
}

function statusLabel(status: DebtStatus) {
  if (status === 'PAID') return 'Quitada';
  if (status === 'ARCHIVED') return 'Arquivada';
  return 'Ativa';
}

function statusClass(status: DebtStatus) {
  if (status === 'PAID') return 'border-[var(--income)]/35 text-[var(--income)]';
  if (status === 'ARCHIVED') return 'border-[var(--border)] text-[var(--text-muted)]';
  return 'border-[var(--orbit-primary)]/35 text-[var(--orbit-primary)]';
}

function dateLabel(value: string | null) {
  if (!value) return 'Sem vencimento';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function adjustmentKindLabel(kind: DebtAdjustmentKind) {
  if (kind === 'PAYMENT') return 'Pagamento';
  if (kind === 'INITIAL_BALANCE') return 'Saldo inicial';
  return 'Ajuste manual';
}

export default function DebtsCenter() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [items, setItems] = useState<Debt[]>([]);
  const [filter, setFilter] = useState<DebtFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState<DebtFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [adjusting, setAdjusting] = useState<Debt | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [adjustmentError, setAdjustmentError] = useState('');
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);

  const [paying, setPaying] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState('');

  const [confirming, setConfirming] = useState<{
    kind: 'ARCHIVE' | 'REMOVE';
    debt: Debt;
  } | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMoreLoading, setHistoryMoreLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await debtService.getAll();
      setItems(response.data.items);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as dívidas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    debtService
      .getAll()
      .then((response) => {
        if (cancelled) return;
        setItems(response.data.items);
        setError('');
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar as dívidas',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filter === 'ALL' ? items : items.filter((item) => item.status === filter),
    [filter, items],
  );

  const totals = useMemo(() => {
    const result: Partial<Record<SupportedCurrency, number>> = {};
    for (const debt of items) {
      if (debt.balance <= 0 || debt.status === 'ARCHIVED') continue;
      result[debt.currency] = (result[debt.currency] ?? 0) + debt.balance;
    }
    return result;
  }, [items]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(debt: Debt) {
    setEditing(debt);
    setForm({
      name: debt.name,
      currency: debt.currency,
      balance: moneyInput(debt.balance),
      installmentAmount: moneyInput(debt.installmentAmount),
      dueDate: debt.dueDate ?? '',
      remainingInstallments: debt.remainingInstallments?.toString() ?? '',
      institution: debt.institution ?? '',
      description: debt.description ?? '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');

    const installmentAmount = form.installmentAmount
      ? parseMoneyInputToCents(form.installmentAmount)
      : null;
    if (form.installmentAmount && installmentAmount === null) {
      setFormError('Informe um valor de parcela válido.');
      return;
    }

    const remainingInstallments = form.remainingInstallments
      ? Number(form.remainingInstallments)
      : null;
    if (
      remainingInstallments !== null &&
      (!Number.isInteger(remainingInstallments) || remainingInstallments <= 0)
    ) {
      setFormError('Informe uma quantidade válida de parcelas restantes.');
      return;
    }

    const scheduleFields = [
      installmentAmount !== null,
      Boolean(form.dueDate),
      remainingInstallments !== null,
    ];
    const scheduleFieldCount = scheduleFields.filter(Boolean).length;
    if (scheduleFieldCount !== 0 && scheduleFieldCount !== scheduleFields.length) {
      setFormError(
        'Para parcelar, informe valor da parcela, próximo vencimento e parcelas restantes.',
      );
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await debtService.update(editing.id, {
          name: form.name,
          installmentAmount,
          dueDate: form.dueDate || null,
          remainingInstallments,
          institution: form.institution || null,
          description: form.description || null,
        });
      } else {
        const balance = parseMoneyInputToCents(form.balance);
        if (balance === null) {
          setFormError('Informe um saldo devedor válido.');
          return;
        }
        const input: DebtInput = {
          name: form.name,
          currency: form.currency,
          balance,
          installmentAmount,
          dueDate: form.dueDate || null,
          remainingInstallments,
          institution: form.institution || null,
          description: form.description || null,
        };
        await debtService.create(input);
      }

      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Não foi possível salvar a dívida');
    } finally {
      setSaving(false);
    }
  }

  function openAdjustment(debt: Debt) {
    setAdjusting(debt);
    setNewBalance(moneyInput(debt.balance));
    setAdjustmentDescription('');
    setAdjustmentError('');
  }

  async function submitAdjustment(event: React.FormEvent) {
    event.preventDefault();
    if (!adjusting) return;
    const value = parseMoneyInputToCents(newBalance);
    if (value === null) {
      setAdjustmentError('Informe um novo saldo devedor válido.');
      return;
    }

    setAdjustmentSaving(true);
    try {
      await debtService.adjust(adjusting.id, {
        newBalance: value,
        description: adjustmentDescription || null,
      });
      setAdjusting(null);
      await load();
    } catch (cause) {
      setAdjustmentError(cause instanceof Error ? cause.message : 'Não foi possível ajustar o saldo');
    } finally {
      setAdjustmentSaving(false);
    }
  }

  function openPayment(debt: Debt) {
    setPaying(debt);
    setPaymentAmount(
      moneyInput(Math.min(debt.installmentAmount ?? debt.balance, debt.balance)),
    );
    setPaymentDescription('');
    setPaymentError('');
    setPaymentIdempotencyKey(crypto.randomUUID());
  }

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paying) return;

    const amount = parseMoneyInputToCents(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError('Informe um valor de pagamento válido.');
      return;
    }

    setPaymentSaving(true);
    setPaymentError('');
    try {
      await debtService.pay(
        paying.id,
        {
          amount,
          description: paymentDescription.trim() || null,
        },
        paymentIdempotencyKey,
      );
      setPaying(null);
      await load();
    } catch (cause) {
      setPaymentError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível registrar o pagamento',
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  async function confirmDebtAction() {
    if (!confirming) return;
    setConfirmSaving(true);
    try {
      if (confirming.kind === 'ARCHIVE') {
        await debtService.update(confirming.debt.id, { status: 'ARCHIVED' });
      } else {
        await debtService.remove(confirming.debt.id);
      }
      setConfirming(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : confirming.kind === 'ARCHIVE'
            ? 'Não foi possível arquivar a dívida'
            : 'Não foi possível excluir a dívida',
      );
    } finally {
      setConfirmSaving(false);
    }
  }

  async function restore(debt: Debt) {
    try {
      await debtService.update(debt.id, { status: 'ACTIVE' });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível restaurar a dívida',
      );
    }
  }

  async function openHistory(debt: Debt) {
    setHistoryDebt(debt);
    setHistoryLoading(true);
    try {
      const response = await debtService.getById(debt.id, { page: 1, limit: 20 });
      setHistoryDebt(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico');
      setHistoryDebt(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadMoreHistory() {
    if (!historyDebt?.adjustmentHistory?.hasMore || historyMoreLoading) return;
    setHistoryMoreLoading(true);
    try {
      const response = await debtService.getById(historyDebt.id, {
        page: historyDebt.adjustmentHistory.page + 1,
        limit: historyDebt.adjustmentHistory.limit,
      });
      setHistoryDebt((current) =>
        current
          ? {
              ...response.data,
              adjustments: [
                ...(current.adjustments ?? []),
                ...(response.data.adjustments ?? []),
              ],
            }
          : response.data,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais histórico');
    } finally {
      setHistoryMoreLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <section className="mx-auto w-full max-w-6xl pb-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-extrabold tracking-tight text-[var(--foreground)]">Dívidas</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
              Passivos manuais, separados das contas e sem alterar saldos financeiros.
            </p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-5 text-sm font-bold text-white">
            <FaPlus aria-hidden="true" />
            Nova dívida
          </button>
        </header>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-4 text-sm text-[var(--expense)]">
            {error}
          </p>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          {(['BRL', 'USD', 'EUR'] as const).map((currency) => (
            <article key={currency} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Saldo devedor · {currency}</span>
              <strong className="mt-1 block text-2xl text-[var(--foreground)]">
                {showValues ? formatCurrency(totals[currency] ?? 0, currency) : '••••'}
              </strong>
            </article>
          ))}
        </section>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar dívidas">
          {([
            ['ALL', 'Todas'],
            ['ACTIVE', 'Ativas'],
            ['PAID', 'Quitadas'],
            ['ARCHIVED', 'Arquivadas'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${
                filter === value
                  ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="mt-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-[var(--skeleton)]" />
              <div className="h-64 animate-pulse rounded-2xl bg-[var(--skeleton)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <strong className="text-[var(--foreground)]">Nenhuma dívida neste filtro</strong>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Cadastre passivos que você quer acompanhar manualmente.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  showValues={showValues}
                  onEdit={() => openEdit(debt)}
                  onAdjust={() => openAdjustment(debt)}
                  onHistory={() => void openHistory(debt)}
                  onPay={() => openPayment(debt)}
                  onArchive={() => setConfirming({ kind: 'ARCHIVE', debt })}
                  onRestore={() => void restore(debt)}
                  onRemove={() => setConfirming({ kind: 'REMOVE', debt })}
                />
              ))}
            </div>
          )}
        </section>

        {formOpen && (
          <DebtFormModal
            form={form}
            editing={Boolean(editing)}
            saving={saving}
            error={formError}
            onChange={setForm}
            onClose={() => setFormOpen(false)}
            onSubmit={submitForm}
          />
        )}

        {adjusting && (
          <ModalShell title="Ajustar saldo devedor" onClose={() => setAdjusting(null)} closeDisabled={adjustmentSaving}>
            <form onSubmit={submitAdjustment} className="space-y-4">
              <div className="rounded-xl bg-[var(--surface-raised)] p-4">
                <strong className="text-[var(--foreground)]">{adjusting.name}</strong>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Atual: {showValues ? formatCurrency(adjusting.balance, adjusting.currency) : '••••'}
                </p>
              </div>
              <Input label="Novo saldo devedor" value={newBalance} onChange={(event) => setNewBalance(event.target.value)} inputMode="decimal" required disabled={adjustmentSaving} />
              <Input label="Motivo do ajuste" value={adjustmentDescription} onChange={(event) => setAdjustmentDescription(event.target.value)} maxLength={255} disabled={adjustmentSaving} placeholder="Ex.: correção do saldo após renegociação" />
              <p className="text-xs text-[var(--text-muted)]">Ajuste manual corrige o passivo e não avança parcelas nem cria transação financeira.</p>
              {adjustmentError && <p role="alert" className="text-sm font-semibold text-[var(--expense)]">{adjustmentError}</p>}
              <ModalActions saving={adjustmentSaving} onClose={() => setAdjusting(null)} submitLabel="Registrar ajuste" />
            </form>
          </ModalShell>
        )}

        {paying && (
          <ModalShell
            title={paying.installmentAmount ? 'Registrar pagamento da parcela' : 'Registrar pagamento'}
            onClose={() => setPaying(null)}
            closeDisabled={paymentSaving}
          >
            <form onSubmit={submitPayment} className="space-y-4">
              <div className="rounded-xl bg-[var(--surface-raised)] p-4">
                <strong className="text-[var(--foreground)]">{paying.name}</strong>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Saldo: {showValues ? formatCurrency(paying.balance, paying.currency) : '••••'}
                </p>
                {paying.installmentAmount !== null && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Parcela atual: {showValues ? formatCurrency(paying.installmentAmount, paying.currency) : '••••'}
                    {paying.dueDate ? ` · vence ${dateLabel(paying.dueDate)}` : ''}
                  </p>
                )}
              </div>
              <Input
                label="Valor pago"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                inputMode="decimal"
                required
                disabled={paymentSaving}
              />
              <Input
                label="Descrição opcional"
                value={paymentDescription}
                onChange={(event) => setPaymentDescription(event.target.value)}
                maxLength={255}
                disabled={paymentSaving}
                placeholder="Ex.: parcela de outubro"
              />
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                Registrar o pagamento reduz somente este passivo. Nenhuma transação financeira é criada automaticamente.
                Em dívida parcelada, uma parcela paga avança o próximo vencimento mensal.
              </p>
              {paymentError && (
                <p role="alert" className="text-sm font-semibold text-[var(--expense)]">
                  {paymentError}
                </p>
              )}
              <ModalActions
                saving={paymentSaving}
                onClose={() => setPaying(null)}
                submitLabel="Registrar pagamento"
              />
            </form>
          </ModalShell>
        )}

        {historyDebt && (
          <ModalShell title={`Histórico · ${historyDebt.name}`} onClose={() => setHistoryDebt(null)} closeDisabled={historyMoreLoading}>
            {historyLoading ? (
              <p className="py-6 text-sm text-[var(--text-muted)]">Carregando histórico...</p>
            ) : !historyDebt.adjustments?.length ? (
              <p className="py-6 text-sm text-[var(--text-muted)]">Nenhum ajuste registrado.</p>
            ) : (
              <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {historyDebt.adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <strong className="text-sm text-[var(--foreground)]">
                          {adjustment.description || adjustmentKindLabel(adjustment.kind)}
                        </strong>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {adjustmentKindLabel(adjustment.kind)}
                          {adjustment.effectiveDate ? ` · efetivo em ${dateLabel(adjustment.effectiveDate)}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Registrado em {new Date(adjustment.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <strong className={adjustment.delta <= 0 ? 'text-[var(--income)]' : 'text-[var(--expense)]'}>
                        {showValues ? `${adjustment.delta > 0 ? '+' : ''}${formatCurrency(adjustment.delta, historyDebt.currency)}` : '••••'}
                      </strong>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {showValues
                        ? `${formatCurrency(adjustment.previousBalance, historyDebt.currency)} → ${formatCurrency(adjustment.newBalance, historyDebt.currency)}`
                        : '•••• → ••••'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {historyDebt.adjustmentHistory?.hasMore && !historyLoading && (
              <button
                type="button"
                onClick={() => void loadMoreHistory()}
                disabled={historyMoreLoading}
                className="mt-4 min-h-11 w-full rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold disabled:opacity-50"
              >
                {historyMoreLoading ? 'Carregando...' : 'Carregar mais'}
              </button>
            )}
          </ModalShell>
        )}

        {confirming && (
          <ModalShell
            title={confirming.kind === 'ARCHIVE' ? 'Arquivar dívida?' : 'Excluir dívida?'}
            onClose={() => setConfirming(null)}
            closeDisabled={confirmSaving}
          >
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {confirming.kind === 'ARCHIVE'
                ? 'A dívida quitada será mantida no histórico e poderá ser restaurada depois.'
                : 'A exclusão só é permitida quando não existe histórico além do saldo inicial.'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={confirmSaving}
                className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDebtAction()}
                disabled={confirmSaving}
                className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-50"
              >
                {confirmSaving
                  ? 'Salvando...'
                  : confirming.kind === 'ARCHIVE'
                    ? 'Arquivar'
                    : 'Excluir'}
              </button>
            </div>
          </ModalShell>
        )}
      </section>
    </ProtectedRoute>
  );
}

function DebtCard({
  debt,
  showValues,
  onEdit,
  onAdjust,
  onHistory,
  onPay,
  onArchive,
  onRestore,
  onRemove,
}: {
  debt: Debt;
  showValues: boolean;
  onEdit: () => void;
  onAdjust: () => void;
  onHistory: () => void;
  onPay: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onRemove: () => void;
}) {
  return (
    <article
      id={`debt-${debt.id}`}
      className="scroll-mt-24 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(debt.status)}`}>
            {statusLabel(debt.status)}
          </span>
          <h2 className="mt-3 truncate text-lg font-extrabold text-[var(--foreground)]">
            {debt.name}
          </h2>
          {debt.institution && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">{debt.institution}</p>
          )}
        </div>
        {debt.status === 'ACTIVE' && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar dívida"
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)]"
          >
            <FaEdit aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Saldo devedor
        </span>
        <strong className="mt-1 block text-3xl font-extrabold text-[var(--foreground)]">
          {showValues ? formatCurrency(debt.balance, debt.currency) : '••••'}
        </strong>
      </div>

      {debt.status === 'ACTIVE' && debt.installmentAmount !== null && debt.dueDate ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[var(--surface-raised)] p-3">
              <span className="text-xs text-[var(--text-muted)]">Próxima parcela</span>
              <strong className="mt-1 block text-[var(--foreground)]">
                {showValues ? formatCurrency(debt.installmentAmount, debt.currency) : '••••'}
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--surface-raised)] p-3">
              <span className="text-xs text-[var(--text-muted)]">Vencimento</span>
              <strong className="mt-1 block text-[var(--foreground)]">{dateLabel(debt.dueDate)}</strong>
            </div>
          </div>
          {debt.remainingInstallments !== null && (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {debt.remainingInstallments} parcelas restantes
            </p>
          )}
        </>
      ) : debt.status !== 'ACTIVE' ? (
        <p className="mt-4 rounded-xl bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
          Sem próximos compromissos enquanto a dívida estiver {debt.status === 'PAID' ? 'quitada' : 'arquivada'}.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onHistory}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-sm font-semibold"
        >
          <FaHistory aria-hidden="true" /> Histórico
        </button>

        {debt.status === 'ACTIVE' && (
          <>
            <button
              type="button"
              onClick={onAdjust}
              className="min-h-11 rounded-full border border-[var(--border-strong)] px-3 text-sm font-semibold"
            >
              Ajustar saldo
            </button>
            <button
              type="button"
              onClick={onPay}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-3 text-sm font-bold text-white"
            >
              <FaCheck aria-hidden="true" /> Registrar pagamento
            </button>
          </>
        )}

        {debt.status === 'PAID' && (
          <>
            <button
              type="button"
              onClick={onAdjust}
              className="min-h-11 rounded-full border border-[var(--border-strong)] px-3 text-sm font-semibold"
            >
              Reabrir com ajuste
            </button>
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-muted)]"
            >
              <FaArchive aria-hidden="true" /> Arquivar
            </button>
          </>
        )}

        {debt.status === 'ARCHIVED' && (
          <button
            type="button"
            onClick={onRestore}
            className="min-h-11 rounded-full border border-[var(--orbit-primary)] px-3 text-sm font-bold text-[var(--orbit-primary)]"
          >
            Restaurar
          </button>
        )}

        {debt.status !== 'ARCHIVED' && debt.adjustmentCount <= 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="grid h-11 w-11 place-items-center rounded-full text-[var(--expense)]"
            aria-label="Excluir dívida"
          >
            <FaTrash aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

function DebtFormModal({
  form,
  editing,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  form: DebtFormState;
  editing: boolean;
  saving: boolean;
  error: string;
  onChange: (value: DebtFormState) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <ModalShell title={editing ? 'Editar dívida' : 'Nova dívida'} onClose={onClose} closeDisabled={saving}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Nome" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} required maxLength={100} disabled={saving} placeholder="Ex.: Financiamento do carro" />

        {!editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Saldo devedor" value={form.balance} onChange={(event) => onChange({ ...form, balance: event.target.value })} inputMode="decimal" required disabled={saving} placeholder="25000,00" />
            <label>
              <span className="ds-label mb-2 block">Moeda</span>
              <select value={form.currency} onChange={(event) => onChange({ ...form, currency: event.target.value as SupportedCurrency })} className="ds-control min-h-11 w-full px-3" disabled={saving}>
                {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Valor da parcela opcional" value={form.installmentAmount} onChange={(event) => onChange({ ...form, installmentAmount: event.target.value })} inputMode="decimal" disabled={saving} placeholder="850,00" />
          <Input label="Próximo vencimento" type="date" value={form.dueDate} onChange={(event) => onChange({ ...form, dueDate: event.target.value })} disabled={saving} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Parcelas restantes" type="number" min={1} max={1200} value={form.remainingInstallments} onChange={(event) => onChange({ ...form, remainingInstallments: event.target.value })} disabled={saving} />
          <Input label="Instituição" value={form.institution} onChange={(event) => onChange({ ...form, institution: event.target.value })} maxLength={120} disabled={saving} placeholder="Ex.: Banco XYZ" />
        </div>

        <Input label="Descrição" value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} multiline rows={3} maxLength={500} disabled={saving} placeholder="Observações opcionais" />

        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Dívidas são passivos independentes. O cronograma, quando usado, é mensal e exige parcela, próximo vencimento e quantidade restante. Criar ou editar não movimenta contas.
        </p>
        {error && <p role="alert" className="text-sm font-semibold text-[var(--expense)]">{error}</p>}
        <ModalActions saving={saving} onClose={onClose} submitLabel={editing ? 'Salvar' : 'Criar dívida'} />
      </form>
    </ModalShell>
  );
}

function ModalActions({ saving, onClose, submitLabel }: { saving: boolean; onClose: () => void; submitLabel: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <button type="button" onClick={onClose} disabled={saving} className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold">Cancelar</button>
      <button type="submit" disabled={saving} className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-50">
        {saving ? 'Salvando...' : submitLabel}
      </button>
    </div>
  );
}
