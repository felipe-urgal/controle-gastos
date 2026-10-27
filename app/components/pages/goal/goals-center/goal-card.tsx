'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaArchive, FaPen, FaTrash } from 'react-icons/fa';

import { dateLabel } from '@/app/components/pages/goal/goals-center/goals-helpers';
import { deadlineLabel, type GoalPace } from '@/app/components/pages/goal/goals-center/goals-model';
import { Button, IconButton, MoneyText } from '@/app/components/ui';
import { CountUp, reducedTransition } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { FinancialGoal } from '@/app/types/financial-goal';

const PACE_PILL: Record<GoalPace, { label: string; tone: string }> = {
  ON_TRACK: { label: 'No ritmo', tone: 'bg-[var(--primary-subtle)] text-[var(--income)]' },
  BEHIND: { label: 'Abaixo do ritmo', tone: 'bg-[var(--warning-subtle)] text-[var(--warning)]' },
  OVERDUE: { label: 'Prazo vencido', tone: 'bg-[var(--danger-subtle)] text-[var(--expense)]' },
};

/** Meta concluída: pontinhos saem do selo em todas as direções e somem, uma vez, quando o cartão entra na tela. */
function CompletionBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <motion.i
            key={index}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[var(--income)]"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            whileInView={{ x: Math.cos(angle) * 34, y: Math.sin(angle) * 22, scale: [0, 1.2, 0], opacity: [1, 1, 0] }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.9, ease: 'easeOut' }}
          />
        );
      })}
    </span>
  );
}

export default function GoalCard({
  index = 0,
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
  /** Posição no grid: define a altura do "degrau" de entrada. */
  index?: number;
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
  const reduce = useReducedMotion();
  const percentage = Math.max(0, Math.min(100, goal.percentage));
  const money = (amount: number) => (showValues ? formatCurrency(amount, goal.currency) : '••••');
  const completed = goal.status === 'COMPLETED';
  const archived = goal.status === 'ARCHIVED';
  const barTone = completed ? 'bg-[var(--income)]' : pace === 'OVERDUE' || pace === 'BEHIND' ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]';

  return (
    // As metas sobem como degraus (cada uma sai de um pouco mais baixo); ao sair do filtro encolhem e o grid se reorganiza.
    <motion.article
      layout="position"
      id={`goal-${goal.id}`}
      initial={reduce ? false : { opacity: 0, y: 30 + (index % 3) * 18, scale: 0.95 }}
      whileInView={{ opacity: archived ? 0.8 : 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 170, damping: 17, delay: Math.min(index, 8) * 0.07 }}
      whileHover="hover"
      className="grid min-w-0 scroll-mt-24 content-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1.5 flex min-h-[1.375rem] flex-wrap gap-1.5">
            {completed ? (
              <motion.span
                className="relative rounded-full bg-[var(--primary-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--income)]"
                initial={reduce ? false : { scale: 0.4, rotate: -12 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.8 }}
              >
                <CompletionBurst />
                ✓ Concluída
              </motion.span>
            ) : archived ? (
              <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--text-muted)]">Arquivada</span>
            ) : (
              pace && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PACE_PILL[pace].tone}`}>{PACE_PILL[pace].label}</span>
            )}
          </div>
          <motion.h2 className="break-words text-lg font-extrabold tracking-tight" variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
            {goal.name}
          </motion.h2>
          <p className="text-sm text-[var(--text-muted)]">
            {goal.targetDate ? `Prazo ${dateLabel(goal.targetDate)} · ${deadlineLabel(goal.targetDate, now)}` : 'Sem prazo definido'}
          </p>
        </div>
        {!archived && <IconButton label={`Editar ${goal.name}`} icon={<FaPen />} onClick={onEdit} />}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <motion.span className="money origin-left break-words text-2xl font-semibold" variants={{ hover: { scale: 1.06, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
          <CountUp amount={goal.currentAmount} format={money} />
        </motion.span>
        <span className="text-sm text-[var(--text-muted)]">de <span className="money">{money(goal.targetAmount)}</span></span>
      </div>

      <div className="grid gap-1.5">
        <motion.div
          className="h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
          role="img"
          aria-label={`${goal.percentage.toLocaleString('pt-BR')}% da meta ${goal.name}`}
          variants={{ hover: { scaleY: 1.5, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
        >
          {/* A barra sobe com uma mola que passa um pouco do ponto e volta. */}
          <motion.div
            className={`h-full rounded-full ${barTone}`}
            initial={reduce ? false : { width: 0 }}
            whileInView={{ width: `${percentage}%` }}
            viewport={{ once: true }}
            transition={reducedTransition(reduce, { type: 'spring', stiffness: 80, damping: 12, delay: 0.3 + Math.min(index, 8) * 0.07 })}
          />
        </motion.div>
        <div className="flex justify-between text-sm">
          <strong className={completed ? 'text-[var(--income)]' : pace === 'OVERDUE' || pace === 'BEHIND' ? 'text-[var(--warning)]' : 'text-[var(--primary)]'}>
            {goal.percentage.toLocaleString('pt-BR')}%
          </strong>
          <span className="text-[var(--text-muted)]">
            {completed ? 'Meta atingida' : <>Falta <span className="money">{money(goal.remainingAmount)}</span></>}
          </span>
        </div>
      </div>

      {goal.status === 'ACTIVE' && goal.monthlyContributionSuggestion !== null && (
        <p className="text-sm text-[var(--text-muted)]">
          <MoneyText>{`Guarde ${money(goal.monthlyContributionSuggestion)} por mês até o prazo.`}</MoneyText>
        </p>
      )}
      {pace === 'OVERDUE' && (
        <p className="text-sm font-semibold text-[var(--warning)]">O prazo passou. Edite a meta para ajustar a data.</p>
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
            <Button size="sm" onClick={onContribution}>
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
    </motion.article>
  );
}
