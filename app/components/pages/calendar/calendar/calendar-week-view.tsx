'use client';

import { useState } from 'react';

import { chipTone, eventPriority } from '@/app/components/pages/calendar/calendar-grid';
import { canRescheduleEvent, isSameDate, weekDates } from '@/app/components/pages/calendar/calendar/calendar-week';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CalendarDay, CalendarEvent } from '@/app/types/calendar';

const weekDaysLong = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function amountLabel(event: CalendarEvent, showValues: boolean) {
  if (event.amount === null) return '';
  return showValues ? formatCurrency(event.amount, event.currency) : '••••';
}

/**
 * Agenda da semana (domingo a sábado): uma coluna por dia, com os eventos de cada um. Os compromissos pendentes
 * podem ser arrastados de um dia para outro para reagendar; quem não arrasta (teclado, celular) usa "Reagendar" no
 * detalhe do evento. Dias de outro mês não estão carregados e aparecem esmaecidos.
 */
export default function CalendarWeekView({
  referenceDate,
  calendarDays,
  showValues,
  busy,
  onOpenEvent,
  onReschedule,
}: {
  referenceDate: Date;
  calendarDays: CalendarDay[];
  showValues: boolean;
  busy: boolean;
  onOpenEvent: (event: CalendarEvent) => void;
  onReschedule: (event: CalendarEvent, target: Date) => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const days = weekDates(referenceDate);
  const byDate = new Map(calendarDays.map((day) => [day.date.toDateString(), day]));
  const allEvents = new Map(calendarDays.flatMap((day) => day.events.map((event) => [event.id, event] as const)));

  return (
    <section
      aria-label="Semana"
      className="grid gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2 sm:p-3 lg:grid-cols-7"
    >
      {days.map((date) => {
        const day = byDate.get(date.toDateString());
        const key = date.toDateString();
        const events = [...(day?.events ?? [])].sort((a, b) => eventPriority(a) - eventPriority(b));
        const today = isSameDate(date, new Date());
        const over = dropTarget === key;

        return (
          <div
            key={key}
            aria-label={`${weekDaysLong[date.getDay()]}, ${date.toLocaleDateString('pt-BR')}`}
            onDragOver={(event) => {
              if (!day || busy) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              if (dropTarget !== key) setDropTarget(key);
            }}
            onDragLeave={() => setDropTarget((current) => (current === key ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              setDropTarget(null);
              if (!day || busy) return;
              const dragged = allEvents.get(event.dataTransfer.getData('text/plain'));
              if (dragged && canRescheduleEvent(dragged)) onReschedule(dragged, date);
            }}
            className={`flex min-h-32 min-w-0 flex-col gap-1.5 rounded-[var(--radius-md)] border p-2 transition-colors ${
              over ? 'border-[var(--primary)] bg-[var(--primary-subtle)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'
            } ${day ? '' : 'opacity-50'}`}
          >
            <p className="flex items-baseline justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <span>{weekDaysLong[date.getDay()]}</span>
              <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-sm font-bold ${today ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--foreground)]'}`}>
                {date.getDate()}
              </span>
            </p>
            {!day ? (
              <p className="text-xs text-[var(--text-muted)]">Outro mês: use as setas para carregar.</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Sem eventos</p>
            ) : (
              <ul className="grid gap-1.5">
                {events.map((event) => {
                  const draggable = canRescheduleEvent(event) && !busy;
                  return (
                    <li
                      key={event.id}
                      draggable={draggable}
                      onDragStart={(drag) => {
                        drag.dataTransfer.setData('text/plain', event.id);
                        drag.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => setDropTarget(null)}
                      className={draggable ? 'cursor-grab active:cursor-grabbing' : ''}
                    >
                      {/* O item inteiro é arrastável, então o foco e o Enter/Espaço ficam num div com papel de botão. */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenEvent(event)}
                        onKeyDown={(key) => {
                          if (key.key === 'Enter' || key.key === ' ') {
                            key.preventDefault();
                            onOpenEvent(event);
                          }
                        }}
                        title={draggable ? 'Arraste para outro dia para reagendar' : undefined}
                        className={`block w-full min-w-0 cursor-pointer rounded-[var(--radius-sm)] px-1.5 py-1 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${chipTone(event)}`}
                      >
                        <span className="block truncate font-semibold">{event.title}</span>
                        {amountLabel(event, showValues) && <span className="money block truncate">{amountLabel(event, showValues)}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
