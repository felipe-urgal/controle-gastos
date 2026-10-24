'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';

import { Alert } from '@/app/components/feedback';
import { Button, Chip, ChipRow } from '@/app/components/ui';
import { useAuth } from '@/app/context';

import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { accountService } from '@/app/services/account-service';
import { financialGoalService, type FinancialGoalInput } from '@/app/services/financial-goal-service';
import type { AccountModel } from '@/app/types/account';
import type { FinancialGoal, FinancialGoalEntryType } from '@/app/types/financial-goal';

import { GoalFilter, GoalFormState, emptyForm, moneyInputFromCents } from '@/app/components/pages/goal/goals-center/goals-helpers';
import { GoalDetailModal, GoalEntryModal, GoalFormModal, GoalSkeleton, SimpleConfirmModal } from '@/app/components/pages/goal/goals-center/goal-modals';
import GoalCard from '@/app/components/pages/goal/goals-center/goal-card';
import GoalsHero from '@/app/components/pages/goal/goals-center/goals-hero';
import { activeCurrencies, countByStatus, goalPace, sortGoals } from '@/app/components/pages/goal/goals-center/goals-model';

export default function GoalsCenter({ focusGoalId }: { focusGoalId?: string }) {
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

  useEffect(() => {
    if (!focusGoalId) return;
    let cancelled = false;
    void financialGoalService.getById(focusGoalId).then(({ data }) => {
      if (!cancelled) setDetailGoal(data);
    }).catch(() => {
      // No visible difference between an unknown and inaccessible goal.
    });
    return () => { cancelled = true; };
  }, [focusGoalId]);

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
    let cancelled = false;

    Promise.allSettled([
      financialGoalService.getAll(),
      accountService.getAll(),
    ]).then(([goalsResult, accountsResult]) => {
      if (cancelled) return;

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
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const [heroCurrency, setHeroCurrency] = useState<string | null>(null);

  const filteredGoals = useMemo(
    () =>
      sortGoals(
        filter === 'ALL'
          ? goals
          : goals.filter((goal) => goal.status === filter),
      ),
    [filter, goals],
  );
  const counts = useMemo(() => countByStatus(goals), [goals]);
  const currencies = useMemo(() => activeCurrencies(goals), [goals]);
  const currency = currencies.find((item) => item === heroCurrency) ?? currencies[0] ?? 'BRL';

  function openCreate(name = '') {
    setEditingGoal(null);
    setForm({ ...emptyForm, name });
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
      <PageContainer as="section">
        <PageTitle
          title="Metas"
          description="Acompanhe objetivos sem misturar planejamento com saldo financeiro."
          actions={
            <Button pill icon={<FaPlus aria-hidden="true" />} onClick={() => openCreate()}>
              Nova meta
            </Button>
          }
        />

        {error && (
          <div className="mt-4">
            <Alert variant="error" message={error} />
          </div>
        )}
        {accountError && (
          <div className="mt-4">
            <Alert
              variant="info"
              message="Metas continuam disponíveis, mas o vínculo opcional com contas está temporariamente indisponível."
            />
          </div>
        )}

        {goals.length > 0 && (
          <div className="mt-5">
            <GoalsHero
              goals={goals}
              currency={currency}
              currencies={currencies}
              onCurrency={setHeroCurrency}
              completedCount={counts.COMPLETED}
              now={now}
              showValues={showValues}
            />
          </div>
        )}

        {goals.length > 0 && (
          <ChipRow label="Filtrar metas por status" className="mt-5">
            {[
              ['ALL', 'Todas'],
              ['ACTIVE', 'Ativas'],
              ['COMPLETED', 'Concluídas'],
              ['ARCHIVED', 'Arquivadas'],
            ].map(([value, label]) => (
              <Chip key={value} selected={filter === value} onClick={() => setFilter(value as GoalFilter)}>
                {label} <span className="text-xs opacity-80">{counts[value as keyof typeof counts]}</span>
              </Chip>
            ))}
          </ChipRow>
        )}

        <div className="mt-5">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <GoalSkeleton />
              <GoalSkeleton />
              <GoalSkeleton />
            </div>
          ) : goals.length === 0 ? (
            <section className="grid justify-items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-11 text-center">
              <h2 className="text-lg font-bold">Nenhuma meta ainda</h2>
              <p className="max-w-[52ch] text-sm text-[var(--text-muted)]">
                Metas guardam um objetivo e o progresso até ele, sem mexer no saldo das suas contas. Comece por uma destas ou crie a sua.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Reserva de emergência', 'Viagem', 'Entrada de imóvel'].map((name) => (
                  <Chip key={name} onClick={() => openCreate(name)}>
                    {name}
                  </Chip>
                ))}
              </div>
              <Button pill icon={<FaPlus aria-hidden="true" />} onClick={() => openCreate()}>
                Criar meta
              </Button>
            </section>
          ) : filteredGoals.length === 0 ? (
            <p className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">
              Nenhuma meta nesta visão. Altere o filtro para acompanhar outros objetivos.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  pace={goalPace(goal, now)}
                  now={now}
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
      </PageContainer>

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
