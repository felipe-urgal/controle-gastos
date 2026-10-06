'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArchive,
  FaArrowDown,
  FaArrowUp,
  FaBullseye,
  FaCalendarAlt,
  FaCheckCircle,
  FaPen,
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
import { accountService } from '@/app/services/account-service';
import {
  financialGoalService,
  type FinancialGoalInput,
} from '@/app/services/financial-goal-service';
import type { AccountModel } from '@/app/types/account';
import type {
  FinancialGoal,
  FinancialGoalEntryType,
  FinancialGoalStatus,
} from '@/app/types/financial-goal';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type GoalFilter = 'ALL' | FinancialGoalStatus;

type GoalFormState = {
  name: string;
  targetAmount: string;
  currency: SupportedCurrency;
  targetDate: string;
  description: string;
  accountId: string;
};

const emptyForm: GoalFormState = {
  name: '',
  targetAmount: '',
  currency: 'BRL',
  targetDate: '',
  description: '',
  accountId: '',
};

function moneyInputFromCents(value: number) {
  return (value / 100).toFixed(2).replace('.', ',');
}

function statusLabel(status: FinancialGoalStatus) {
  if (status === 'COMPLETED') return 'Concluída';
  if (status === 'ARCHIVED') return 'Arquivada';
  return 'Ativa';
}

function statusClasses(status: FinancialGoalStatus) {
  if (status === 'COMPLETED') {
    return 'border-[var(--income)]/30 bg-[var(--income)]/10 text-[var(--income)]';
  }
  if (status === 'ARCHIVED') {
    return 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]';
  }
  return 'border-[var(--orbit-primary)]/30 bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]';
}

function dateLabel(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function GoalsCenter() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [filter, setFilter] = useState<GoalFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [entryGoal, setEntryGoal] = useState<FinancialGoal | null>(null);
  const [entryType, setEntryType] =
    useState<FinancialGoalEntryType>('CONTRIBUTION');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryIdempotencyKey, setEntryIdempotencyKey] = useState('');

  const [detailGoal, setDetailGoal] = useState<FinancialGoal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMoreLoading, setDetailMoreLoading] = useState(false);
  const [archiveGoal, setArchiveGoal] = useState<FinancialGoal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<FinancialGoal | null>(null);

  const load = useCallback(async () => {
    const [goalsResult, accountsResult] = await Promise.allSettled([
      financialGoalService.getAll(),
      accountService.getAll(),
    ]);

    if (goalsResult.status === 'fulfilled') {
      setGoals(goalsResult.value.data.items);
      setError(null);
    } else {
      setError(
        goalsResult.reason instanceof Error
          ? goalsResult.reason.message
          : 'Não foi possível carregar as metas',
      );
    }

    if (accountsResult.status === 'fulfilled') {
      setAccounts(accountsResult.value.data.items ?? []);
      setAccountError(null);
    } else {
      setAccounts([]);
      setAccountError(
        accountsResult.reason instanceof Error
          ? accountsResult.reason.message
          : 'Contas indisponíveis no momento',
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredGoals = useMemo(
    () =>
      filter === 'ALL'
        ? goals
        : goals.filter((goal) => goal.status === filter),
    [filter, goals],
  );

  const activeGoals = goals.filter((goal) => goal.status === 'ACTIVE');
  const completedGoals = goals.filter((goal) => goal.status === 'COMPLETED');

  function openCreate() {
    setEditingGoal(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(goal: FinancialGoal) {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      targetAmount: moneyInputFromCents(goal.targetAmount),
      currency: goal.currency,
      targetDate: goal.targetDate ?? '',
      description: goal.description ?? '',
      accountId: goal.account?.id ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    const targetAmount = parseMoneyInputToCents(form.targetAmount);

    if (!targetAmount) {
      setFormError('Informe um valor alvo válido.');
      return;
    }

    const payload: FinancialGoalInput = {
      name: form.name.trim(),
      targetAmount,
      currency: form.currency,
      targetDate: form.targetDate || null,
      description: form.description.trim() || null,
      accountId: form.accountId || null,
    };

    setSaving(true);
    setFormError(null);
    try {
      if (editingGoal) {
        const updatePayload: Partial<FinancialGoalInput> = { ...payload };
        if ((editingGoal.account?.id ?? '') === form.accountId) {
          delete updatePayload.accountId;
        }
        await financialGoalService.update(editingGoal.id, updatePayload);
      } else {
        await financialGoalService.create(payload);
      }
      setFormOpen(false);
      setEditingGoal(null);
      await load();
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível salvar a meta',
      );
    } finally {
      setSaving(false);
    }
  }

  function openEntry(goal: FinancialGoal, type: FinancialGoalEntryType) {
    setEntryGoal(goal);
    setEntryType(type);
    setEntryAmount('');
    setEntryDescription('');
    setEntryError(null);
    setEntryIdempotencyKey(crypto.randomUUID());
  }

  async function submitEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!entryGoal) return;

    const amount = parseMoneyInputToCents(entryAmount);
    if (!amount) {
      setEntryError('Informe um valor válido.');
      return;
    }

    setEntrySaving(true);
    setEntryError(null);
    try {
      await financialGoalService.addEntry(
        entryGoal.id,
        {
          type: entryType,
          amount,
          description: entryDescription.trim() || null,
        },
        entryIdempotencyKey,
      );
      setEntryGoal(null);
      await load();
    } catch (requestError) {
      setEntryError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível atualizar o progresso',
      );
    } finally {
      setEntrySaving(false);
    }
  }

  async function openDetail(goal: FinancialGoal) {
    setDetailLoading(true);
    setDetailGoal(goal);
    try {
      const response = await financialGoalService.getById(goal.id, {
        page: 1,
        limit: 20,
      });
      setDetailGoal(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar o histórico da meta',
      );
      setDetailGoal(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadMoreDetail() {
    if (!detailGoal?.entryHistory?.hasMore || detailMoreLoading) return;
    setDetailMoreLoading(true);
    try {
      const response = await financialGoalService.getById(detailGoal.id, {
        page: detailGoal.entryHistory.page + 1,
        limit: detailGoal.entryHistory.limit,
      });
      setDetailGoal((current) =>
        current
          ? {
              ...response.data,
              entries: [
                ...(current.entries ?? []),
                ...(response.data.entries ?? []),
              ],
            }
          : response.data,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar mais histórico',
      );
    } finally {
      setDetailMoreLoading(false);
    }
  }

  async function confirmArchive() {
    if (!archiveGoal) return;
    setSaving(true);
    try {
      await financialGoalService.update(archiveGoal.id, {
        status: 'ARCHIVED',
      });
      setArchiveGoal(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível arquivar a meta',
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteGoal) return;
    setSaving(true);
    try {
      await financialGoalService.remove(deleteGoal.id);
      setDeleteGoal(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível excluir a meta',
      );
    } finally {
      setSaving(false);
    }
  }

  async function reactivate(goal: FinancialGoal) {
    setSaving(true);
    try {
      await financialGoalService.update(goal.id, { status: 'ACTIVE' });
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível reativar a meta',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <section className="mx-auto w-full max-w-6xl pb-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-extrabold tracking-tight text-[var(--foreground)]">
              Metas
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
              Acompanhe objetivos sem misturar planejamento com saldo financeiro.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-5 font-bold text-white"
          >
            <FaPlus aria-hidden="true" />
            Nova meta
          </button>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
          >
            {error}
          </p>
        )}
        {accountError && (
          <p
            role="status"
            className="mt-4 rounded-[14px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm text-[var(--foreground)]"
          >
            Metas continuam disponíveis, mas o vínculo opcional com contas está temporariamente indisponível.
          </p>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Ativas"
            value={String(activeGoals.length)}
            icon={<FaBullseye />}
          />
          <SummaryCard
            label="Concluídas"
            value={String(completedGoals.length)}
            icon={<FaCheckCircle />}
          />
          <SummaryCard
            label="Total de metas"
            value={String(goals.length)}
            icon={<FaCalendarAlt />}
          />
        </section>

        <nav
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
          aria-label="Filtrar metas por status"
        >
          {[
            ['ALL', 'Todas'],
            ['ACTIVE', 'Ativas'],
            ['COMPLETED', 'Concluídas'],
            ['ARCHIVED', 'Arquivadas'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as GoalFilter)}
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

        <div className="mt-5">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <GoalSkeleton />
              <GoalSkeleton />
              <GoalSkeleton />
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="ds-panel p-8 text-center">
              <FaBullseye
                className="mx-auto text-3xl text-[var(--orbit-primary)]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
                Nenhuma meta nesta visão
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Crie uma meta ou altere o filtro para acompanhar outros objetivos.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  showValues={showValues}
                  onOpen={() => void openDetail(goal)}
                  onEdit={() => openEdit(goal)}
                  onContribution={() => openEntry(goal, 'CONTRIBUTION')}
                  onWithdrawal={() => openEntry(goal, 'WITHDRAWAL')}
                  onArchive={() => setArchiveGoal(goal)}
                  onReactivate={() => void reactivate(goal)}
                  onDelete={() => setDeleteGoal(goal)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {formOpen && (
        <GoalFormModal
          form={form}
          editing={Boolean(editingGoal)}
          accounts={accounts}
          linkedAccount={editingGoal?.account ?? null}
          accountsUnavailable={Boolean(accountError)}
          saving={saving}
          error={formError}
          onChange={setForm}
          onClose={() => {
            if (!saving) setFormOpen(false);
          }}
          onSubmit={submitForm}
        />
      )}

      {entryGoal && (
        <GoalEntryModal
          goal={entryGoal}
          type={entryType}
          amount={entryAmount}
          description={entryDescription}
          saving={entrySaving}
          error={entryError}
          showValues={showValues}
          onAmountChange={setEntryAmount}
          onDescriptionChange={setEntryDescription}
          onClose={() => {
            if (!entrySaving) setEntryGoal(null);
          }}
          onSubmit={submitEntry}
        />
      )}

      {detailGoal && (
        <GoalDetailModal
          goal={detailGoal}
          loading={detailLoading}
          showValues={showValues}
          loadingMore={detailMoreLoading}
          onLoadMore={() => void loadMoreDetail()}
          onClose={() => setDetailGoal(null)}
        />
      )}

      {archiveGoal && (
        <SimpleConfirmModal
          title="Arquivar meta?"
          message="A meta e o histórico continuam disponíveis, mas novos aportes e retiradas ficam bloqueados até reativá-la."
          confirmLabel="Arquivar"
          loading={saving}
          onClose={() => {
            if (!saving) setArchiveGoal(null);
          }}
          onConfirm={() => void confirmArchive()}
        />
      )}

      {deleteGoal && (
        <SimpleConfirmModal
          title="Excluir meta?"
          message="A exclusão só é permitida quando a meta ainda não possui contribuições ou retiradas registradas."
          confirmLabel="Excluir"
          loading={saving}
          onClose={() => {
            if (!saving) setDeleteGoal(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </ProtectedRoute>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
        {icon}
      </span>
      <strong className="mt-4 block text-2xl font-extrabold text-[var(--foreground)]">
        {value}
      </strong>
      <span className="mt-1 block text-sm text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

function GoalCard({
  goal,
  showValues,
  onOpen,
  onEdit,
  onContribution,
  onWithdrawal,
  onArchive,
  onReactivate,
  onDelete,
}: {
  goal: FinancialGoal;
  showValues: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onContribution: () => void;
  onWithdrawal: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const safePercentage = Math.max(0, Math.min(100, goal.percentage));
  const money = (amount: number) =>
    showValues ? formatCurrency(amount, goal.currency) : '••••';

  return (
    <article
      id={`goal-${goal.id}`}
      className="scroll-mt-24 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(goal.status)}`}
          >
            {statusLabel(goal.status)}
          </span>
          <h2 className="mt-3 truncate text-xl font-extrabold text-[var(--foreground)]">
            {goal.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {goal.targetDate ? `Prazo ${dateLabel(goal.targetDate)}` : 'Sem prazo definido'}
          </p>
        </button>

        {goal.status !== 'ARCHIVED' && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${goal.name}`}
            className="grid h-11 w-11 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
          >
            <FaPen aria-hidden="true" />
          </button>
        )}
      </div>

      <button type="button" onClick={onOpen} className="mt-5 block w-full text-left">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Progresso
            </span>
            <strong className="mt-1 block text-2xl font-extrabold text-[var(--foreground)]">
              {money(goal.currentAmount)}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-xs text-[var(--text-muted)]">de</span>
            <strong className="ml-1 text-sm text-[var(--foreground)]">
              {money(goal.targetAmount)}
            </strong>
          </div>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <div
            className="h-full rounded-full bg-[var(--orbit-primary)]"
            style={{ width: `${safePercentage}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--orbit-primary)]">
            {goal.percentage.toLocaleString('pt-BR')}%
          </span>
          <span className="text-[var(--text-muted)]">
            Falta {money(goal.remainingAmount)}
          </span>
        </div>
      </button>

      {goal.monthlyContributionSuggestion !== null && goal.status === 'ACTIVE' && (
        <p className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
          Para distribuir o restante até o prazo: aproximadamente{' '}
          <strong className="text-[var(--foreground)]">
            {money(goal.monthlyContributionSuggestion)}
          </strong>{' '}
          por mês.
        </p>
      )}

      {goal.account && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Referência: {goal.account.name} · {goal.account.currency}
          {!goal.account.isActive ? ' · conta inativa' : ''}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {goal.status === 'ACTIVE' && (
          <>
            <button
              type="button"
              onClick={onContribution}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--orbit-primary)] px-3 text-sm font-bold text-white"
            >
              <FaArrowUp aria-hidden="true" />
              Contribuir
            </button>
            <button
              type="button"
              onClick={onWithdrawal}
              disabled={goal.currentAmount <= 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-sm font-bold text-[var(--foreground)] disabled:opacity-45"
            >
              <FaArrowDown aria-hidden="true" />
              Retirar
            </button>
            <button
              type="button"
              onClick={onArchive}
              className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-[var(--text-muted)]"
            >
              <FaArchive aria-hidden="true" />
              Arquivar meta
            </button>
          </>
        )}

        {goal.status === 'COMPLETED' && (
          <>
            <button
              type="button"
              onClick={onWithdrawal}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-sm font-bold text-[var(--foreground)]"
            >
              <FaArrowDown aria-hidden="true" />
              Retirar
            </button>
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-3 text-sm font-bold text-[var(--text-muted)]"
            >
              <FaArchive aria-hidden="true" />
              Arquivar
            </button>
          </>
        )}

        {goal.status === 'ARCHIVED' && (
          <button
            type="button"
            onClick={onReactivate}
            className="col-span-2 min-h-11 rounded-full border border-[var(--orbit-primary)] px-3 text-sm font-bold text-[var(--orbit-primary)]"
          >
            Reativar meta
          </button>
        )}

        {goal.entryCount === 0 && (
          <button
            type="button"
            onClick={onDelete}
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-[var(--expense)]"
          >
            <FaTrash aria-hidden="true" />
            Excluir meta sem histórico
          </button>
        )}
      </div>
    </article>
  );
}

function GoalFormModal({
  form,
  editing,
  accounts,
  linkedAccount,
  accountsUnavailable,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  form: GoalFormState;
  editing: boolean;
  accounts: AccountModel[];
  linkedAccount: FinancialGoal['account'];
  accountsUnavailable: boolean;
  saving: boolean;
  error: string | null;
  onChange: (value: GoalFormState) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const compatibleAccounts = accounts.filter(
    (account) =>
      account.isActive &&
      account.currency === form.currency &&
      account.type !== 'CREDIT_CARD',
  );
  const historicalLinkedAccount =
    linkedAccount &&
    linkedAccount.id === form.accountId &&
    !compatibleAccounts.some((account) => account.id === linkedAccount.id)
      ? linkedAccount
      : null;

  return (
    <ModalShell
      title={editing ? 'Editar meta' : 'Nova meta'}
      onClose={onClose}
      closeDisabled={saving}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          maxLength={100}
          required
          disabled={saving}
          placeholder="Ex.: Reserva de emergência"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Valor alvo"
            value={form.targetAmount}
            onChange={(event) =>
              onChange({ ...form, targetAmount: event.target.value })
            }
            inputMode="decimal"
            placeholder="10000,00"
            required
            disabled={saving}
          />

          <label className="block">
            <span className="ds-label mb-2 block">Moeda</span>
            <select
              value={form.currency}
              onChange={(event) =>
                onChange({
                  ...form,
                  currency: event.target.value as SupportedCurrency,
                  accountId: '',
                })
              }
              disabled={saving}
              className="ds-control min-h-11 w-full px-3"
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Input
          label="Prazo opcional"
          type="date"
          value={form.targetDate}
          onChange={(event) =>
            onChange({ ...form, targetDate: event.target.value })
          }
          disabled={saving}
        />

        <label className="block">
          <span className="ds-label mb-2 block">Conta de referência opcional</span>
          <select
            value={form.accountId}
            onChange={(event) =>
              onChange({ ...form, accountId: event.target.value })
            }
            disabled={saving || accountsUnavailable}
            className="ds-control min-h-11 w-full px-3 disabled:opacity-60"
          >
            <option value="">Sem vínculo com conta</option>
            {historicalLinkedAccount && (
              <option value={historicalLinkedAccount.id}>
                {historicalLinkedAccount.name} · {historicalLinkedAccount.currency}
                {!historicalLinkedAccount.isActive ? ' · inativa (vínculo atual)' : ' · vínculo atual'}
              </option>
            )}
            {compatibleAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-[var(--text-muted)]">
            {accountsUnavailable
              ? 'Contas indisponíveis agora. A meta pode ser salva sem alterar o vínculo atual.'
              : 'Somente contas ativas da mesma moeda; cartão de crédito não é elegível. O vínculo não movimenta saldo.'}
          </span>
        </label>

        <Input
          label="Descrição"
          value={form.description}
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
          multiline
          rows={3}
          maxLength={500}
          disabled={saving}
          placeholder="Contexto opcional para esta meta"
        />

        {error && (
          <p role="alert" className="text-sm font-semibold text-[var(--expense)]">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold text-[var(--foreground)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-50"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar meta'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function GoalEntryModal({
  goal,
  type,
  amount,
  description,
  saving,
  error,
  showValues,
  onAmountChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}: {
  goal: FinancialGoal;
  type: FinancialGoalEntryType;
  amount: string;
  description: string;
  saving: boolean;
  error: string | null;
  showValues: boolean;
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const contribution = type === 'CONTRIBUTION';

  return (
    <ModalShell
      title={contribution ? 'Contribuir para meta' : 'Retirar da meta'}
      onClose={onClose}
      closeDisabled={saving}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
          <strong className="block text-[var(--foreground)]">{goal.name}</strong>
          <span className="mt-1 block text-sm text-[var(--text-muted)]">
            Progresso atual:{' '}
            {showValues
              ? formatCurrency(goal.currentAmount, goal.currency)
              : '••••'}
          </span>
        </div>

        <Input
          label={contribution ? 'Valor da contribuição' : 'Valor da retirada'}
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          inputMode="decimal"
          placeholder="500,00"
          required
          disabled={saving}
        />

        <Input
          label="Descrição opcional"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          maxLength={255}
          disabled={saving}
          placeholder={
            contribution ? 'Ex.: Aporte de setembro' : 'Ex.: Uso parcial da reserva'
          }
        />

        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Esta ação altera somente o progresso virtual da meta. Nenhuma transação
          financeira será criada.
        </p>

        {error && (
          <p role="alert" className="text-sm font-semibold text-[var(--expense)]">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold text-[var(--foreground)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-50"
          >
            {saving
              ? 'Salvando...'
              : contribution
                ? 'Registrar contribuição'
                : 'Registrar retirada'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function GoalDetailModal({
  goal,
  loading,
  loadingMore,
  showValues,
  onLoadMore,
  onClose,
}: {
  goal: FinancialGoal;
  loading: boolean;
  loadingMore: boolean;
  showValues: boolean;
  onLoadMore: () => void;
  onClose: () => void;
}) {
  const money = (value: number) =>
    showValues ? formatCurrency(value, goal.currency) : '••••';

  return (
    <ModalShell
      title={goal.name}
      onClose={onClose}
      closeDisabled={loadingMore}
    >
      {loading ? (
        <p className="py-6 text-sm text-[var(--text-muted)]">Carregando histórico...</p>
      ) : (
        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Atual" value={money(goal.currentAmount)} />
            <MiniMetric label="Alvo" value={money(goal.targetAmount)} />
            <MiniMetric label="Restante" value={money(goal.remainingAmount)} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(goal.status)}`}>
              {statusLabel(goal.status)}
            </span>
            <span>{goal.percentage.toLocaleString('pt-BR')}% do alvo</span>
            {goal.targetDate && <span>Prazo {dateLabel(goal.targetDate)}</span>}
          </div>

          <section className="mt-6">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Histórico
            </h3>
            {!goal.entries?.length ? (
              <p className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-muted)]">
                Nenhuma contribuição ou retirada registrada.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--border)] rounded-[14px] border border-[var(--border)]">
                {goal.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--foreground)]">
                        {entry.type === 'CONTRIBUTION' ? 'Contribuição' : 'Retirada'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                        {entry.description || new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <strong
                      className={
                        entry.type === 'CONTRIBUTION'
                          ? 'text-[var(--income)]'
                          : 'text-[var(--expense)]'
                      }
                    >
                      {entry.type === 'CONTRIBUTION' ? '+' : '-'}
                      {money(entry.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {goal.entryHistory?.hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="mt-4 min-h-11 w-full rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold disabled:opacity-50"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            )}
          </section>
        </div>
      )}
    </ModalShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-base text-[var(--foreground)]">{value}</strong>
    </div>
  );
}

function SimpleConfirmModal({
  title,
  message,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title={title} onClose={onClose} closeDisabled={loading}>
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">{message}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold text-[var(--foreground)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="min-h-12 rounded-full bg-[var(--orbit-primary)] font-extrabold text-white disabled:opacity-50"
        >
          {loading ? 'Salvando...' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function GoalSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface)]" />
  );
}
