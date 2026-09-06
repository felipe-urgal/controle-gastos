'use client';

import { CalendarDaysSkeleton } from '@/app/components/pages/calendar';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { CalendarDay } from '@/app/types/calendar';

interface CalendarGridProps {
  isLoading: boolean;
  calendarDays: CalendarDay[];
  selectedDate?: Date | null;
  onDayClick: (day: CalendarDay) => void;
  compact?: boolean;
  showValues?: boolean;
}

function isSameDay(left?: Date | null, right?: Date | null) {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function CalendarGrid({
  isLoading,
  calendarDays,
  selectedDate,
  onDayClick,
  compact = false,
  showValues = true,
}: CalendarGridProps) {
  if (isLoading) {
    if (!compact) return <CalendarDaysSkeleton />;

    return (
      <div className="grid grid-cols-7 gap-1 p-2" aria-hidden="true">
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={index} className="min-h-10 animate-pulse rounded-[9px] bg-[var(--surface-subtle)]" />
        ))}
      </div>
    );
  }

  const firstDay = calendarDays[0]?.date;
  const emptyCells = firstDay ? firstDay.getDay() : 0;

  return (
    <div
      className={
        compact
          ? 'grid grid-cols-7 gap-1 p-2'
          : 'grid grid-cols-7 auto-rows-[88px] bg-[var(--border)] md:auto-rows-[118px]'
      }
      aria-label="Dias do mês"
    >
      {Array.from({ length: emptyCells }).map((_, index) => (
        <div
          key={`empty-${index}`}
          aria-hidden="true"
          className={
            compact
              ? 'min-h-10 rounded-[9px]'
              : 'border-b border-r border-[var(--border)] bg-[var(--surface-raised)]'
          }
        />
      ))}

      {calendarDays.map((day) => {
        const date = day.date;
        if (!date) return null;

        const summaries = day.summaries ?? [];
        const transactions = day.transactions || [];
        const transactionCount = transactions.length;
        const pendingCount = transactions.filter((transaction) => transaction.status === 'PENDING').length;
        const cancelledCount = transactions.filter((transaction) => transaction.status === 'CANCELLED').length;
        const hasIncome = transactions.some((transaction) => transaction.type === 'INCOME');
        const hasExpense = transactions.some((transaction) => transaction.type === 'EXPENSE');
        const selected = isSameDay(date, selectedDate);

        const dateLabel = date.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const summaryParts = [
          `${transactionCount} ${transactionCount === 1 ? 'transação' : 'transações'}`,
          ...summaries.flatMap((summary) => [
            summary.income > 0
              ? showValues
                ? `receitas concluídas em ${summary.currency} ${formatCurrency(summary.income, summary.currency)}`
                : `receitas concluídas em ${summary.currency}`
              : null,
            summary.expense > 0
              ? showValues
                ? `despesas concluídas em ${summary.currency} ${formatCurrency(summary.expense, summary.currency)}`
                : `despesas concluídas em ${summary.currency}`
              : null,
          ]),
          pendingCount > 0 ? `${pendingCount} pendente${pendingCount === 1 ? '' : 's'}` : null,
          cancelledCount > 0 ? `${cancelledCount} cancelada${cancelledCount === 1 ? '' : 's'}` : null,
        ].filter(Boolean);

        const visibleDateLabel = `${date.getDate()}${day.isToday ? ' Hoje' : ''}`;

        if (compact) {
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              aria-label={`${visibleDateLabel}. ${dateLabel}. ${summaryParts.join('. ')}.`}
              aria-pressed={selected}
              aria-current={day.isToday ? 'date' : undefined}
              className={`relative min-h-10 min-w-0 rounded-[9px] border px-1 py-1 text-center transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                selected
                  ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)] text-[var(--foreground)]'
                  : day.isToday
                    ? 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--orbit-primary)]'
                    : 'border-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <span className="block text-sm font-bold leading-none">{date.getDate()}</span>
              <span className="mt-1 flex min-h-1.5 items-center justify-center gap-0.5" aria-hidden="true">
                {hasIncome && <span className="h-1 w-1 rounded-full bg-[var(--income)]" />}
                {hasExpense && <span className="h-1 w-1 rounded-full bg-[var(--expense)]" />}
                {pendingCount > 0 && <span className="h-1 w-1 rounded-full bg-[var(--orbit-primary)]" />}
              </span>
            </button>
          );
        }

        return (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => onDayClick(day)}
            aria-label={`${visibleDateLabel}. ${dateLabel}. ${summaryParts.join('. ')}.`}
            aria-pressed={selected}
            aria-current={day.isToday ? 'date' : undefined}
            className={`
              group relative min-w-0 overflow-hidden border-b border-r border-[var(--border)] p-1.5 text-left
              transition-[background-color,box-shadow] duration-150 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]
              md:p-2.5
              ${
                selected
                  ? 'bg-[var(--primary-subtle)] shadow-[inset_0_0_0_1px_var(--primary)]'
                  : day.isToday
                    ? 'bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]'
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-raised)]'
              }
            `}
          >
            <div className="flex min-w-0 items-start justify-between gap-1">
              <span
                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-base font-bold ${
                  day.isToday
                    ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-sm'
                    : 'text-[var(--foreground)]'
                }`}
              >
                {date.getDate()}
              </span>

              {transactionCount > 0 && (
                <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-1.5 py-0.5 text-sm font-bold leading-none text-[var(--foreground)] shadow-sm">
                  {transactionCount}
                </span>
              )}
            </div>

            {day.isToday && (
              <span className="mt-1 block truncate text-sm font-bold text-[var(--primary)]">Hoje</span>
            )}

            {transactionCount > 0 && (
              <div className="mt-1.5 space-y-1 md:mt-2">
                <div className="flex flex-wrap gap-1 md:hidden" aria-hidden="true">
                  {summaries.map((summary) => (
                    <span key={summary.currency} className="rounded border border-[var(--border-strong)] bg-[var(--surface-raised)] px-1 py-0.5 text-sm font-bold text-[var(--foreground)]">
                      {summary.currency}
                    </span>
                  ))}
                  {pendingCount > 0 && (
                    <span className="rounded bg-[var(--warning-subtle)] px-1 py-0.5 text-sm font-bold text-[var(--pending)]">P{pendingCount}</span>
                  )}
                </div>

                <div className="hidden min-w-0 space-y-1 md:block" aria-hidden="true">
                  {summaries.map((summary) => (
                    <p key={summary.currency} className="truncate text-sm font-bold text-[var(--foreground)]">
                      <span className="text-[var(--text-muted)]">{summary.currency}</span>{' '}
                      {showValues && summary.income > 0 && (
                        <span className="text-[var(--income)]">+ {formatCurrency(summary.income, summary.currency)}</span>
                      )}
                      {showValues && summary.income > 0 && summary.expense > 0 ? ' · ' : ''}
                      {showValues && summary.expense > 0 && (
                        <span className="text-[var(--expense)]">− {formatCurrency(summary.expense, summary.currency)}</span>
                      )}
                      {!showValues && (summary.income > 0 || summary.expense > 0) && (
                        <span className="text-[var(--text-muted)]">••••</span>
                      )}
                    </p>
                  ))}
                  {(pendingCount > 0 || cancelledCount > 0) && (
                    <p className="truncate text-sm font-medium text-[var(--text-muted)]">
                      {pendingCount > 0 ? `${pendingCount} pend.` : ''}
                      {pendingCount > 0 && cancelledCount > 0 ? ' • ' : ''}
                      {cancelledCount > 0 ? `${cancelledCount} canc.` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
