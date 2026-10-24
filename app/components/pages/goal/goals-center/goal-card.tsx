'use client';

import { FaArchive, FaPen, FaTrash } from 'react-icons/fa';

import { dateLabel } from '@/app/components/pages/goal/goals-center/goals-helpers';
import { deadlineLabel, type GoalPace } from '@/app/components/pages/goal/goals-center/goals-model';
import { Button, IconButton, MoneyText } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { FinancialGoal } from '@/app/types/financial-goal';

const PACE_PILL: Record<GoalPace, { label: string; tone: string }> = {
  ON_TRACK: { label: 'No ritmo', tone: 'bg-[var(--primary-subtle)] text-[var(--income)]' },
  BEHIND: { label: 'Abaixo do ritmo', tone: 'bg-[var(--warning-subtle)] text-[var(--warning)]' },
  OVERDUE: { label: 'Prazo vencido', tone: 'bg-[var(--danger-subtle)] text-[var(--expense)]' },
};

export default function GoalCard({
  goal,
  pace,
  now,
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
  pace: GoalPace | null;
  now: Date;
  showValues: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onContribution: () => void;
  onWithdrawal: () => void;
  onArchive: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const percentage = Math.max(0, Math.min(100, goal.percentage));
  const money = (amount: number) => (showValues ? formatCurrency(amount, goal.currency) : '••••');
  const completed = goal.status === 'COMPLETED';
  const archived = goal.status === 'ARCHIVED';
  const barTone = completed ? 'bg-[var(--income)]' : pace === 'OVERDUE' || pace === 'BEHIND' ? 'bg-[var(--warning)]' : 'bg-[var(--orbit-primary)]';

  return (
    <article
      id={`goal-${goal.id}`}
      className={`grid min-w-0 scroll-mt-24 content-start gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-[18px] ${archived ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {completed ? (
              <span className="rounded-full bg-[var(--primary-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--income)]">✓ Concluída</span>
            ) : archived ? (
              <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--text-muted)]">Arquivada</span>
            ) : (
              <>
                <span className="rounded-full bg-[var(--orbit-primary-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--orbit-primary)]">Ativa</span>
                {pace && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PACE_PILL[pace].tone}`}>{PACE_PILL[pace].label}</span>}
              </>
            )}
          </div>
          <h2 className="break-words text-lg font-extrabold tracking-tight">{goal.name}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {goal.targetDate ? `Prazo ${dateLabel(goal.targetDate)} · ${deadlineLabel(goal.targetDate, now)}` : 'Sem prazo definido'}
          </p>
        </div>
        {!archived && <IconButton label={`Editar ${goal.name}`} icon={<FaPen />} onClick={onEdit} />}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="money break-words text-2xl font-semibold">{money(goal.currentAmount)}</span>
        <span className="text-sm text-[var(--text-muted)]">de <span className="money">{money(goal.targetAmount)}</span></span>
      </div>

      <div className="grid gap-1.5">
        <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${goal.percentage.toLocaleString('pt-BR')}% da meta ${goal.name}`}>
          <div className={`h-full rounded-full ${barTone}`} style={{ width: `${percentage}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <strong className={completed ? 'text-[var(--income)]' : pace === 'OVERDUE' || pace === 'BEHIND' ? 'text-[var(--warning)]' : 'text-[var(--orbit-primary)]'}>
            {goal.percentage.toLocaleString('pt-BR')}%
          </strong>
          <span className="text-[var(--text-muted)]">
            {completed ? 'Meta atingida' : <>Falta <span className="money">{money(goal.remainingAmount)}</span></>}
          </span>
        </div>
      </div>

      {goal.status === 'ACTIVE' && goal.monthlyContributionSuggestion !== null && (
        <p className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
          <MoneyText>{`Para distribuir o restante até o prazo: ${money(goal.monthlyContributionSuggestion)} por mês.`}</MoneyText>
        </p>
      )}
      {pace === 'OVERDUE' && (
        <p className="rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3 py-2.5 text-sm font-semibold text-[var(--warning)]">
          O prazo passou. Edite a meta para ajustar a data.
        </p>
      )}

      {goal.account && (
        <p className="text-xs text-[var(--text-muted)]">
          Referência: {goal.account.name} · {goal.account.currency}
          {!goal.account.isActive ? ' · conta inativa' : ''}
        </p>
      )}

      <div className="-mx-1 flex flex-wrap items-center gap-1 border-t border-[var(--border)] px-1 pt-2.5">
        {goal.status === 'ACTIVE' && (
          <>
            <Button size="sm" variant="accent" onClick={onContribution}>
              Contribuir
            </Button>
            <Button size="sm" variant="outline" onClick={onWithdrawal} disabled={goal.currentAmount <= 0}>
              Retirar
            </Button>
          </>
        )}
        {completed && (
          <Button size="sm" variant="outline" onClick={onWithdrawal}>
            Retirar
          </Button>
        )}
        {archived && (
          <Button size="sm" variant="outline" onClick={onReactivate}>
            Reativar meta
          </Button>
        )}
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onOpen}>
          Histórico
        </Button>
        {!archived && <IconButton label={`Arquivar ${goal.name}`} icon={<FaArchive />} onClick={onArchive} />}
        {goal.entryCount === 0 && <IconButton label={`Excluir ${goal.name} (sem histórico)`} icon={<FaTrash />} tone="danger" onClick={onDelete} />}
      </div>
    </article>
  );
}
