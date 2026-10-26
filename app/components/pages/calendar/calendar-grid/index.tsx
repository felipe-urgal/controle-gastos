'use client';

import { CalendarDaysSkeleton } from '@/app/components/pages/calendar';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CalendarDay, CalendarEvent } from '@/app/types/calendar';

interface CalendarGridProps {
  isLoading: boolean;
  calendarDays: CalendarDay[];
  selectedDate?: Date | null;
  onDayClick: (day: CalendarDay) => void;
  /** Mobile: um ponto por dia. Desktop (padrão): chips com os eventos de cada dia. */
  compact?: boolean;
  showValues?: boolean;
}

/** Quantos eventos aparecem como chip em cada dia do grid grande. */
const VISIBLE_CHIPS = 2;

type DayState = 'overdue' | 'pending' | 'done' | 'empty';

function isSameDay(left?: Date | null, right?: Date | null) {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

const isOverdue = (event: CalendarEvent) => event.commitmentState === 'OVERDUE';
const isPending = (event: CalendarEvent) => event.status === 'PENDING';

/** Vencido > pendente > realizado: o que exige ação aparece primeiro. */
function eventPriority(event: CalendarEvent) {
  if (isOverdue(event)) return 0;
  if (isPending(event)) return 1;
  if (event.status === 'CANCELLED') return 3;
  return 2;
}

function dayState(events: CalendarEvent[]): DayState {
  if (events.length === 0) return 'empty';
  if (events.some(isOverdue)) return 'overdue';
  if (events.some(isPending)) return 'pending';
  return 'done';
}

const dotTone: Record<DayState, string> = {
  overdue: 'bg-[var(--expense)]',
  pending: 'bg-[var(--warning)]',
  done: 'bg-[var(--text-muted)]',
  empty: '',
};

function chipTone(event: CalendarEvent) {
  if (event.status === 'CANCELLED') return 'text-[var(--text-subtle)] line-through';
  if (isOverdue(event)) return 'bg-[var(--danger-subtle)] font-semibold text-[var(--expense)]';
  if (isPending(event)) return 'bg-[var(--warning-subtle)] text-[var(--pending)]';
  if (event.direction === 'INCOME') return 'bg-[var(--surface-subtle)] text-[var(--income)]';
  if (event.direction === 'TRANSFER') return 'bg-[var(--primary-subtle)] text-[var(--primary)]';
  return 'bg-[var(--surface-subtle)] text-[var(--foreground)]';
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function dayAriaLabel(day: CalendarDay, showValues: boolean) {
  const { date, events, summaries, isToday } = day;
  const count = (predicate: (event: CalendarEvent) => boolean) => events.filter(predicate).length;
  const overdue = count(isOverdue);
  const pending = count(isPending);
  const transfers = count((event) => event.direction === 'TRANSFER');
  const milestones = count((event) => event.direction === 'MILESTONE');
  const cancelled = count((event) => event.status === 'CANCELLED');

  const parts = [
    plural(events.length, 'evento', 'eventos'),
    ...summaries.flatMap((summary) => [
      summary.income > 0
        ? `receitas realizadas em ${summary.currency}${showValues ? ` ${formatCurrency(summary.income, summary.currency)}` : ''}`
        : null,
      summary.expense > 0
        ? `despesas realizadas em ${summary.currency}${showValues ? ` ${formatCurrency(summary.expense, summary.currency)}` : ''}`
        : null,
    ]),
    transfers > 0 ? plural(transfers, 'transferência', 'transferências') : null,
    pending > 0 ? plural(pending, 'pendente', 'pendentes') : null,
    overdue > 0 ? plural(overdue, 'vencido', 'vencidos') : null,
    milestones > 0 ? plural(milestones, 'marco', 'marcos') : null,
    cancelled > 0 ? plural(cancelled, 'cancelado', 'cancelados') : null,
  ].filter(Boolean);

  const dateLabel = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `${date.getDate()}${isToday ? ' Hoje' : ''}. ${dateLabel}. ${parts.join('. ')}.`;
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
      <div className="grid grid-cols-7 gap-0 px-0 py-2" aria-hidden="true">
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={index}
            className="min-h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-subtle)]"
          />
        ))}
      </div>
    );
  }

  const emptyCells = calendarDays[0]?.date.getDay() ?? 0;

  return (
    <div
      className={
        compact
          ? 'grid grid-cols-7 gap-0 py-2'
          : 'grid grid-cols-7 auto-rows-[7.5rem] border-l border-t border-[var(--border)]'
      }
      aria-label="Dias do mês"
    >
      {Array.from({ length: emptyCells }).map((_, index) => (
        <div
          key={`empty-${index}`}
          aria-hidden="true"
          className={compact ? 'min-h-12' : 'border-b border-r border-[var(--border)] bg-[var(--surface-raised)]'}
        />
      ))}

      {calendarDays.map((day) => {
        const { date, events, isToday } = day;
        const selected = isSameDay(date, selectedDate);
        const state = dayState(events);
        const common = {
          type: 'button' as const,
          onClick: () => onDayClick(day),
          'aria-label': dayAriaLabel(day, showValues),
          'aria-pressed': selected,
          'aria-current': isToday ? ('date' as const) : undefined,
        };

        if (compact) {
          return (
            <button
              key={date.toISOString()}
              {...common}
              className={`relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border text-center transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                selected
                  ? 'border-[var(--primary)] bg-[var(--primary-subtle)]'
                  : 'border-transparent hover:bg-[var(--surface-hover)]'
              }`}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold leading-none ${
                  isToday ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--foreground)]'
                }`}
              >
                {date.getDate()}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${dotTone[state]}`} aria-hidden="true" />
            </button>
          );
        }

        const sorted = [...events].sort((a, b) => eventPriority(a) - eventPriority(b));
        const hidden = sorted.length - VISIBLE_CHIPS;

        return (
          <button
            key={date.toISOString()}
            {...common}
            className={`flex min-w-0 flex-col gap-1 overflow-hidden border-b border-r border-[var(--border)] p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] ${
              selected
                ? 'bg-[var(--primary-subtle)] shadow-[inset_0_0_0_2px_var(--primary)]'
                : 'bg-[var(--surface)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <span
              className={`grid h-7 min-w-7 place-items-center self-start rounded-full px-1 text-sm font-bold ${
                isToday ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--foreground)]'
              }`}
            >
              {date.getDate()}
            </span>
            <span className="flex min-w-0 flex-col gap-1" aria-hidden="true">
              {sorted.slice(0, VISIBLE_CHIPS).map((event) => (
                <span
                  key={event.id}
                  className={`block truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs ${chipTone(event)}`}
                >
                  {event.title}
                </span>
              ))}
              {hidden > 0 && (
                <span className="px-1.5 text-xs font-semibold text-[var(--text-muted)]">+{hidden} mais</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
