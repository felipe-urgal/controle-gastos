'use client';

import { FaArchive, FaArrowDown, FaArrowUp, FaPen, FaTrash } from 'react-icons/fa';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Input } from '@/app/components/ui';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { AccountModel } from '@/app/types/account';
import { FinancialGoal, FinancialGoalEntryType } from '@/app/types/financial-goal';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { GoalFormState, dateLabel, statusClasses, statusLabel } from '@/app/components/pages/goal/goals-center/goals-helpers';

export function GoalFormModal({
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

export function GoalEntryModal({
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

export function GoalDetailModal({
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

export function SimpleConfirmModal({
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

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-base text-[var(--foreground)]">{value}</strong>
    </div>
  );
}

export function GoalCard({
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

export function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
      <span className="hidden h-11 w-11 place-items-center rounded-[12px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)] sm:grid">
        {icon}
      </span>
      <strong className="block text-2xl font-extrabold text-[var(--foreground)] sm:mt-4">
        {value}
      </strong>
      <span className="mt-1 block text-xs text-[var(--text-muted)] sm:text-sm">{label}</span>
    </div>
  );
}

export function GoalSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface)]" />
  );
}
