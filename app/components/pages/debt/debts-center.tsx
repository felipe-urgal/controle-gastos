'use client';

import { ListPageHeader, PageContainer } from '@/app/components/base-pages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArchive,
  FaCheck,
  FaEdit,
  FaHistory,
  FaSlidersH,
  FaTrash,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Alert, PageEmpty } from '@/app/components/feedback';
import { Button, IconButton, Input, MoneyInput, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { debtService, type DebtInput } from '@/app/services/debt-service';
import { DebtsDues } from '@/app/components/pages/debt/debts-dues';
import { DebtsSummaryPanel, InstallmentLoadPanel } from '@/app/components/pages/debt/debts-summary';
import { owedCurrencies, summarizeDebts } from '@/app/components/pages/debt/debts-model';
import { logicalDateFromUtcInstant } from '@/app/lib/date/logical-date';
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
  return 'border-[var(--primary)]/35 text-[var(--primary)]';
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

export default function DebtsCenter({ focusDebtId }: { focusDebtId?: string }) {
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

  useEffect(() => {
    if (!focusDebtId) return;
    let cancelled = false;
    void debtService.getById(focusDebtId).then(({ data }) => {
      if (cancelled) return;
      setEditing(data);
      setForm({
        name: data.name,
        currency: data.currency,
        balance: moneyInput(data.balance),
        installmentAmount: moneyInput(data.installmentAmount),
        dueDate: data.dueDate ?? '',
        remainingInstallments: data.remainingInstallments?.toString() ?? '',
        institution: data.institution ?? '',
        description: data.description ?? '',
      });
      setFormError('');
      setFormOpen(true);
    }).catch(() => {
      // Unauthorized and missing IDs resolve to the regular page.
    });
    return () => { cancelled = true; };
  }, [focusDebtId]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? items : items.filter((item) => item.status === filter)).slice().sort((left, right) => right.balance - left.balance),
    [filter, items],
  );

  // Dia lógico de hoje, fixo durante a sessão da página (evita chamada impura a cada render).
  const [today] = useState(() => logicalDateFromUtcInstant(new Date()));
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('BRL');
  const currencies = useMemo(() => owedCurrencies(items), [items]);
  const activeCurrency = currencies.includes(selectedCurrency) ? selectedCurrency : (currencies[0] ?? selectedCurrency);
  const summary = useMemo(() => (items.length > 0 ? summarizeDebts(items, activeCurrency, today) : null), [items, activeCurrency, today]);

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
      <PageContainer as="section">
        <ListPageHeader
          title="Dívidas"
          onCreate={openCreate}
          createLabel="Nova dívida"
          controls={
            <div className="w-[10.5rem]">
              <Select
                ariaLabel="Filtrar dívidas"
                value={filter}
                onChange={(value) => setFilter(value as DebtFilter)}
                options={[
                  { value: 'ALL', label: 'Todas' },
                  { value: 'ACTIVE', label: 'Ativas' },
                  { value: 'PAID', label: 'Quitadas' },
                  { value: 'ARCHIVED', label: 'Arquivadas' },
                ]}
              />
            </div>
          }
        />

        {error && (
          <div className="mt-4">
            <Alert variant="error" message={error} />
          </div>
        )}

        {!loading && summary && (
          <div className="mt-5 grid gap-4">
            <DebtsSummaryPanel summary={summary} currencies={currencies} onCurrency={setSelectedCurrency} showValues={showValues} />
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <DebtsDues debts={items.filter((debt) => debt.currency === summary.currency)} today={today} showValues={showValues} onPay={openPayment} />
              <InstallmentLoadPanel debts={items} currency={summary.currency} today={today} withoutInstallmentCount={summary.withoutInstallmentCount} showValues={showValues} />
            </div>
          </div>
        )}

        <section className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-[var(--skeleton)]" />
              <div className="h-64 animate-pulse rounded-2xl bg-[var(--skeleton)]" />
            </div>
          ) : filtered.length === 0 ? (
            <PageEmpty
              title="Nenhuma dívida neste filtro"
              description="Cadastre passivos que você quer acompanhar manualmente."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  share={summary?.currency === debt.currency ? (summary.weights.find((weight) => weight.debt.id === debt.id)?.share ?? null) : null}
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
              <MoneyInput label="Novo saldo devedor" currency={adjusting.currency} value={newBalance} onValueChange={setNewBalance} required disabled={adjustmentSaving} />
              <Input label="Motivo do ajuste" value={adjustmentDescription} onChange={(event) => setAdjustmentDescription(event.target.value)} maxLength={255} disabled={adjustmentSaving} placeholder="Ex.: correção do saldo após renegociação" />
              <p className="text-xs text-[var(--text-muted)]">Ajuste manual corrige o passivo e não avança parcelas nem cria transação financeira.</p>
              {adjustmentError && <Alert variant="error" message={adjustmentError} />}
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
              <MoneyInput
                label="Valor pago"
                currency={paying.currency}
                value={paymentAmount}
                onValueChange={setPaymentAmount}
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
              {paymentError && <Alert variant="error" message={paymentError} />}
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
                        <span className="money">{showValues ? `${adjustment.delta > 0 ? '+' : ''}${formatCurrency(adjustment.delta, historyDebt.currency)}` : '••••'}</span>
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
              <Button
                variant="outline"
                fullWidth
                className="mt-4"
                onClick={() => void loadMoreHistory()}
                disabled={historyMoreLoading}
              >
                {historyMoreLoading ? 'Carregando...' : 'Carregar mais'}
              </Button>
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
              <Button variant="outline" size="lg" onClick={() => setConfirming(null)} disabled={confirmSaving}>
                Cancelar
              </Button>
              <Button size="lg" onClick={() => void confirmDebtAction()} disabled={confirmSaving}>
                {confirmSaving
                  ? 'Salvando...'
                  : confirming.kind === 'ARCHIVE'
                    ? 'Arquivar'
                    : 'Excluir'}
              </Button>
            </div>
          </ModalShell>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}

function DebtCard({
  debt,
  share,
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
  /** Participação no saldo devedor da moeda (0–100); `null` quando a dívida não entra na soma. */
  share: number | null;
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
      className="grid min-w-0 scroll-mt-24 content-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {debt.status !== 'ACTIVE' && (
            <span className={`mb-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClass(debt.status)}`}>
              {statusLabel(debt.status)}
            </span>
          )}
          <h2 className="truncate text-lg font-extrabold text-[var(--foreground)]">{debt.name}</h2>
          {debt.institution && <p className="text-xs text-[var(--text-muted)]">{debt.institution}</p>}
        </div>
        {debt.status === 'ACTIVE' && (
          <IconButton
            label={`Editar ${debt.name}`}
            icon={<FaEdit />}
            onClick={onEdit}
            className="rounded-full border border-[var(--border)]"
          />
        )}
      </div>

      <div>
        <strong className="block break-words text-2xl font-extrabold tabular-nums text-[var(--foreground)]">
          <span className="money">{showValues ? formatCurrency(debt.balance, debt.currency) : '••••'}</span>
        </strong>
        <span className="text-xs text-[var(--text-muted)]">
          saldo devedor{share !== null ? ` · ${share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total` : ''}
        </span>
      </div>

      {debt.status === 'ACTIVE' && debt.installmentAmount !== null && debt.dueDate ? (
        <p className="text-sm text-[var(--text-muted)]">
          Parcela{' '}
          <span className="money font-semibold text-[var(--foreground)]">{showValues ? formatCurrency(debt.installmentAmount, debt.currency) : '••••'}</span>
          {' · vence '}
          <span className="font-semibold text-[var(--foreground)]">{dateLabel(debt.dueDate)}</span>
          {debt.remainingInstallments !== null && (
            <> · {debt.remainingInstallments} {debt.remainingInstallments === 1 ? 'restante' : 'restantes'}</>
          )}
        </p>
      ) : debt.status !== 'ACTIVE' ? (
        <p className="text-xs text-[var(--text-muted)]">
          Sem próximos compromissos enquanto a dívida estiver {debt.status === 'PAID' ? 'quitada' : 'arquivada'}.
        </p>
      ) : null}

      <div className="-mx-1 flex flex-wrap items-center gap-1 border-t border-[var(--border)] px-1 pt-3">
        {debt.status === 'ACTIVE' && (
          <Button size="sm" icon={<FaCheck aria-hidden="true" />} aria-label={`Registrar pagamento de ${debt.name}`} onClick={onPay}>
            Pagar
          </Button>
        )}
        {debt.status === 'PAID' && (
          <>
            <Button variant="outline" size="sm" onClick={onAdjust}>
              Reabrir com ajuste
            </Button>
            <Button variant="outline" size="sm" icon={<FaArchive aria-hidden="true" />} onClick={onArchive}>
              Arquivar
            </Button>
          </>
        )}
        {debt.status === 'ARCHIVED' && (
          <Button variant="outline" size="sm" onClick={onRestore}>
            Restaurar
          </Button>
        )}
        <span className="flex-1" />
        <IconButton label={`Histórico de ${debt.name}`} icon={<FaHistory />} onClick={onHistory} />
        {debt.status === 'ACTIVE' && <IconButton label={`Ajustar saldo de ${debt.name}`} icon={<FaSlidersH />} onClick={onAdjust} />}
        {debt.status !== 'ARCHIVED' && debt.adjustmentCount <= 1 && (
          <IconButton label={`Excluir ${debt.name}`} icon={<FaTrash />} tone="danger" onClick={onRemove} />
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
            <MoneyInput label="Saldo devedor" currency={form.currency} value={form.balance} onValueChange={(balance) => onChange({ ...form, balance })} required disabled={saving} placeholder="25.000,00" />
            <Select
              label="Moeda"
              value={form.currency}
              onChange={(value) => onChange({ ...form, currency: value as SupportedCurrency })}
              options={currencyOptions.map((option) => ({ value: option.value, label: option.label }))}
              disabled={saving}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput label="Valor da parcela opcional" currency={form.currency} value={form.installmentAmount} onValueChange={(installmentAmount) => onChange({ ...form, installmentAmount })} disabled={saving} placeholder="850,00" />
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
        {error && <Alert variant="error" message={error} />}
        <ModalActions saving={saving} onClose={onClose} submitLabel={editing ? 'Salvar' : 'Criar dívida'} />
      </form>
    </ModalShell>
  );
}

function ModalActions({ saving, onClose, submitLabel }: { saving: boolean; onClose: () => void; submitLabel: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <Button variant="outline" size="lg" onClick={onClose} disabled={saving}>
        Cancelar
      </Button>
      <Button type="submit" size="lg" disabled={saving}>
        {saving ? 'Salvando...' : submitLabel}
      </Button>
    </div>
  );
}
