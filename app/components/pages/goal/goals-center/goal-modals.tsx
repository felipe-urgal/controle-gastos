'use client';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Alert } from '@/app/components/feedback';
import { Button, Input, MoneyInput, Select } from '@/app/components/ui';
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
          <MoneyInput
            label="Valor alvo"
            currency={form.currency}
            value={form.targetAmount}
            onValueChange={(targetAmount) => onChange({ ...form, targetAmount })}
            placeholder="10.000,00"
            required
            disabled={saving}
          />

          <Select
            label="Moeda"
            value={form.currency}
            onChange={(value) =>
              onChange({
                ...form,
                currency: value as SupportedCurrency,
                accountId: '',
              })
            }
            options={currencyOptions.map((option) => ({ value: option.value, label: option.label }))}
            disabled={saving}
          />
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

        <div>
          <Select
            label="Conta de referência opcional"
            value={form.accountId}
            onChange={(value) => onChange({ ...form, accountId: String(value) })}
            options={[
              { value: '', label: 'Sem vínculo com conta' },
              ...(historicalLinkedAccount
                ? [
                    {
                      value: historicalLinkedAccount.id,
                      label: `${historicalLinkedAccount.name} · ${historicalLinkedAccount.currency}${
                        !historicalLinkedAccount.isActive ? ' · inativa (vínculo atual)' : ' · vínculo atual'
                      }`,
                    },
                  ]
                : []),
              ...compatibleAccounts.map((account) => ({
                value: account.id,
                label: `${account.name} · ${account.currency}`,
              })),
            ]}
            disabled={saving || accountsUnavailable}
          />
          <span className="mt-1.5 block text-xs text-[var(--text-muted)]">
            {accountsUnavailable
              ? 'Contas indisponíveis agora. A meta pode ser salva sem alterar o vínculo atual.'
              : 'Somente contas ativas da mesma moeda; cartão de crédito não é elegível. O vínculo não movimenta saldo.'}
          </span>
        </div>

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

        {error && <Alert variant="error" message={error} />}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" size="lg" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar meta'}
          </Button>
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
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-4">
          <strong className="block text-[var(--foreground)]">{goal.name}</strong>
          <span className="mt-1 block text-sm text-[var(--text-muted)]">
            Progresso atual:{' '}
            {showValues
              ? formatCurrency(goal.currentAmount, goal.currency)
              : '••••'}
          </span>
        </div>

        <MoneyInput
          label={contribution ? 'Valor da contribuição' : 'Valor da retirada'}
          currency={goal.currency}
          value={amount}
          onValueChange={onAmountChange}
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

        {error && <Alert variant="error" message={error} />}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" size="lg" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving
              ? 'Salvando...'
              : contribution
                ? 'Registrar contribuição'
                : 'Registrar retirada'}
          </Button>
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
              <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-muted)]">
                Nenhuma contribuição ou retirada registrada.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)]">
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
                      <span className="money">{money(entry.amount)}</span>
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {goal.entryHistory?.hasMore && (
              <Button variant="outline" fullWidth className="mt-4" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </Button>
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
        <Button variant="outline" size="lg" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button size="lg" onClick={onConfirm} disabled={loading}>
          {loading ? 'Salvando...' : confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="money mt-1 block text-base text-[var(--foreground)]">{value}</strong>
    </div>
  );
}

export function GoalSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" />
  );
}
