'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { CalendarDaysSkeleton } from '@/app/components/pages/calendar';
import { reducedTransition } from '@/app/components/ui/motion';
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

/** Dia de hoje: um anel que se expande e some, em loop, para o olho achar o dia logo de cara. */
function TodayPulse({ reduce }: { reduce: boolean | null }) {
  if (reduce) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--primary)]"
      initial={{ scale: 1, opacity: 0.6 }}
      animate={{ scale: 1.7, opacity: 0 }}
      transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }}
    />
  );
}

/** Destaque do dia escolhido: um só elemento que desliza de um dia para o outro (`layoutId`). */
function SelectedMark({ layoutId, className }: { layoutId: string; className: string }) {
  return (
    <motion.span
      aria-hidden="true"
      layoutId={layoutId}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
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
  const reduce = useReducedMotion();

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
  // Completa a última semana com quadrados vazios, como os do começo do mês (só no grid grande, que tem bordas).
  const trailingCells = compact ? 0 : (7 - ((emptyCells + calendarDays.length) % 7)) % 7;
  const blankCell = 'border-b border-r border-[var(--border)] bg-[var(--surface-raised)]';

  return (
    <div
      className={
        compact
          ? 'grid grid-cols-7 gap-0 py-2'
          : 'grid grid-cols-7 auto-rows-[7.5rem] -mb-px -mr-px'
      }
      aria-label="Dias do mês"
    >
      {Array.from({ length: emptyCells }).map((_, index) => (
        <motion.div
          key={`empty-${index}`}
          aria-hidden="true"
          className={compact ? 'min-h-12' : blankCell}
          initial={reduce || compact ? false : { opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.1 + index * 0.03 } }}
        />
      ))}

      {calendarDays.map((day, index) => {
        const { date, events, isToday } = day;
        const selected = isSameDay(date, selectedDate);
        const state = dayState(events);
        // Onda diagonal: o atraso cresce com coluna + linha, então o mês "escorre" do canto de cima à esquerda.
        const cell = index + emptyCells;
        const wave = (cell % 7) + Math.floor(cell / 7);
        const enter = reducedTransition(reduce, { type: 'spring', stiffness: 240, damping: 18, delay: 0.1 + wave * 0.03 });
        const common = {
          type: 'button' as const,
          onClick: () => onDayClick(day),
          'aria-label': dayAriaLabel(day, showValues),
          'aria-pressed': selected,
          'aria-current': isToday ? ('date' as const) : undefined,
        };

        if (compact) {
          return (
            <motion.button
              key={date.toISOString()}
              {...common}
              initial={reduce ? false : { opacity: 0, scale: 0.4, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: enter }}
              whileTap={{ scale: 0.82, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
              className={`relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-transparent text-center transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                selected ? '' : 'hover:bg-[var(--surface-hover)]'
              }`}
            >
              {selected && (
                <SelectedMark
                  layoutId="calendar-selected-compact"
                  className="rounded-[var(--radius-md)] border border-[var(--primary)] bg-[var(--primary-subtle)]"
                />
              )}
              <span
                className={`relative grid h-7 w-7 place-items-center rounded-full text-sm font-bold leading-none ${
                  isToday ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--foreground)]'
                }`}
              >
                {isToday && <TodayPulse reduce={reduce} />}
                {date.getDate()}
              </span>
              {state === 'empty' ? (
                <span className="relative h-1.5 w-1.5" aria-hidden="true" />
              ) : (
                <motion.span
                  key={state}
                  className={`relative h-1.5 w-1.5 rounded-full ${dotTone[state]}`}
                  aria-hidden="true"
                  initial={reduce ? false : { scale: 0 }}
                  // Vencido pulsa sem parar: é o que pede ação.
                  animate={
                    state === 'overdue' && !reduce
                      ? { scale: [1, 1.7, 1], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } }
                      : { scale: 1, transition: { type: 'spring', stiffness: 500, damping: 12, delay: 0.4 + wave * 0.03 } }
                  }
                />
              )}
            </motion.button>
          );
        }

        const sorted = [...events].sort((a, b) => eventPriority(a) - eventPriority(b));
        const hidden = sorted.length - VISIBLE_CHIPS;

        return (
          <motion.button
            key={date.toISOString()}
            {...common}
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: enter }}
            whileHover="hover"
            whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
            className={`relative flex min-w-0 flex-col gap-1 overflow-hidden border-b border-r border-[var(--border)] p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] ${
              selected ? 'bg-[var(--surface)]' : 'bg-[var(--surface)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            {selected && (
              <SelectedMark
                layoutId="calendar-selected"
                className="bg-[var(--primary-subtle)] shadow-[inset_0_0_0_2px_var(--primary)]"
              />
            )}
            {/* No hover o número gira e cresce, e os chips deslizam de lado. */}
            <motion.span
              className={`relative grid h-7 min-w-7 place-items-center self-start rounded-full px-1 text-sm font-bold ${
                isToday ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--foreground)]'
              }`}
              variants={{ hover: { scale: 1.2, rotate: [0, -10, 8, 0], transition: { duration: 0.5 } } }}
            >
              {isToday && <TodayPulse reduce={reduce} />}
              {date.getDate()}
            </motion.span>
            <span className="relative flex min-w-0 flex-col gap-1" aria-hidden="true">
              {sorted.slice(0, VISIBLE_CHIPS).map((event, chipIndex) => (
                <motion.span
                  key={event.id}
                  className={`block truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs ${chipTone(event)}`}
                  initial={reduce ? false : { opacity: 0, x: -14 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: reducedTransition(reduce, { type: 'spring', stiffness: 300, damping: 22, delay: 0.3 + wave * 0.03 + chipIndex * 0.08 }),
                  }}
                  variants={{ hover: { x: 4 + chipIndex * 2, transition: { type: 'spring', stiffness: 400, damping: 20 } } }}
                >
                  {event.title}
                </motion.span>
              ))}
              {hidden > 0 && (
                <motion.span
                  className="px-1.5 text-xs font-semibold text-[var(--text-muted)]"
                  variants={{ hover: { scale: [1, 1.15, 1], transition: { duration: 0.4 } } }}
                >
                  +{hidden} mais
                </motion.span>
              )}
            </span>
          </motion.button>
        );
      })}

      {Array.from({ length: trailingCells }).map((_, index) => {
        const cell = emptyCells + calendarDays.length + index;
        const wave = (cell % 7) + Math.floor(cell / 7);
        return (
          <motion.div
            key={`trailing-${index}`}
            aria-hidden="true"
            className={blankCell}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.1 + wave * 0.03 } }}
          />
        );
      })}
    </div>
  );
}
