'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarCheck,
  FaChevronLeft,
  FaChevronRight,
  FaExchangeAlt,
  FaPlus,
  FaRedo,
  FaTimes,
  FaWallet,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { CalendarGrid } from '@/app/components/pages/calendar';
import { Button, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useCalendar } from '@/app/hooks/calendar/use-calendar';
import { useCalendarPersistence } from '@/app/hooks/calendar/use-calendar-persistence';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthNames } from '@/app/lib/date/constants';
import type {
  CalendarDay,
  CalendarEvent,
} from '@/app/types/calendar';
import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

const compactWeekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const orbitActionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

function dateKey(date: Date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function eventDate(event: CalendarEvent) {
  return new Date(event.date.year, event.date.month - 1, event.date.day);
}

function eventDateLabel(event: CalendarEvent) {
  return eventDate(event).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function displayAmount(event: CalendarEvent, showValues: boolean) {
  if (event.amount === null) return '—';
  if (!showValues) return '••••';
  return formatCurrency(event.amount, event.currency);
}

function signedAmount(event: CalendarEvent, showValues: boolean) {
  if (event.direction === 'MILESTONE') return 'Marco';
  if (!showValues) return '••••';

  const value = displayAmount(event, true);
  if (event.direction === 'INCOME') return `+${value}`;
  if (event.direction === 'EXPENSE') return `-${value}`;
  return value;
}

function eventKindLabel(event: CalendarEvent) {
  if (event.sourceKind === 'TRANSFER') {
    if (event.transferRole === 'SOURCE') return 'Transferência enviada';
    if (event.transferRole === 'DESTINATION') return 'Transferência recebida';
    return 'Transferência';
  }
  if (event.sourceKind === 'CARD_PAYMENT') return 'Pagamento de fatura';
  if (event.sourceKind === 'CARD_STATEMENT') return 'Fatura do cartão';
  if (event.sourceKind === 'DEBT_INSTALLMENT') return 'Parcela de dívida';
  if (event.sourceKind === 'GOAL_DEADLINE') return 'Marco de meta';
  if (event.seriesType === 'RECURRING') return 'Recorrência';
  if (event.seriesType === 'INSTALLMENT') return 'Parcela';
  return event.direction === 'INCOME' ? 'Receita' : 'Despesa';
}

function eventStatusLabel(event: CalendarEvent) {
  if (event.commitmentState === 'OVERDUE') return 'Vencido';
  if (event.direction === 'MILESTONE') return 'Marco';
  if (event.status === 'CANCELLED') return 'Cancelado';
  if (event.status === 'PENDING') return 'Pendente';
  if (event.status === 'COMPLETED') return 'Realizado';
  return 'Próximo';
}

function eventContextLabel(event: CalendarEvent) {
  if (event.sourceKind === 'TRANSFER') {
    const counterpart = event.counterpartAccount?.name;
    if (event.transferRole === 'SOURCE') {
      return counterpart
        ? `Para ${counterpart} · ${event.account?.name ?? 'Sem conta'}`
        : event.account?.name ?? 'Transferência';
    }
    if (event.transferRole === 'DESTINATION') {
      return counterpart
        ? `De ${counterpart} · ${event.account?.name ?? 'Sem conta'}`
        : event.account?.name ?? 'Transferência';
    }
  }

  return [
    event.category?.name,
    event.account?.name,
  ].filter(Boolean).join(' · ') || eventKindLabel(event);
}

function dayForDate(calendarDays: CalendarDay[], date: Date) {
  const target = dateKey(date);
  return calendarDays.find((day) => dateKey(day.date) === target) ?? null;
}

export default function OrbitCalendar() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    currentDate,
    periodReady,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    summary,
    commitments,
    commitmentCount,
    overdueCount,
    error,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    retry,
  } = useCalendar();

  useCalendarPersistence(currentDate, periodReady);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAllCommitments, setShowAllCommitments] = useState(false);
  const detailCloseRef = useRef<HTMLButtonElement>(null);

  const displayDate = selectedDate ?? currentDate;
  const selectedDay = useMemo(
    () => dayForDate(calendarDays, displayDate),
    [calendarDays, displayDate],
  );
  const dayEvents = selectedDay?.events ?? [];
  const daySummaries = selectedDay?.summaries ?? [];

  useEffect(() => {
    if (!selectedEvent) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() =>
      detailCloseRef.current?.focus(),
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setSelectedEvent(null);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [selectedEvent]);

  const selectDay = useCallback(
    (day: CalendarDay) => {
      setSelectedDate(day.date);
      if (!day.isCurrentMonth) goToDate(day.date);
    },
    [goToDate],
  );

  const previousMonth = () => {
    setSelectedDate(null);
    setShowAllCommitments(false);
    goToPreviousMonth();
  };

  const nextMonth = () => {
    setSelectedDate(null);
    setShowAllCommitments(false);
    goToNextMonth();
  };

  const today = () => {
    setSelectedDate(null);
    setShowAllCommitments(false);
    goToToday();
  };

  const changeAccount = (value: string | number) => {
    setShowAllCommitments(false);
    handleAccountChange(value);
  };

  const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const accountOptions = [
    { value: 'all', label: 'Todas as contas' },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.name,
    })),
  ];

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] sm:block">
            Linha do tempo financeira
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">
            Calendário
          </h1>
          <p className="mt-1 hidden text-sm text-[var(--text-muted)] sm:block">
            Movimentos, vencimentos e marcos financeiros em uma única visão temporal.
          </p>
        </div>

        <div className={`grid w-full grid-cols-[auto_1fr_auto] gap-2 sm:flex sm:w-auto sm:flex-wrap ${orbitActionTokens}`}>
          <Button
            variant="outline"
            size="sm"
            icon={<FaChevronLeft />}
            onClick={previousMonth}
            aria-label="Mês anterior"
          />
          <Button variant="outline" size="sm" onClick={today}>
            {monthLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FaChevronRight />}
            onClick={nextMonth}
            aria-label="Próximo mês"
          />
          <div className="col-span-3 w-full sm:col-span-1 sm:w-[190px]">
            <Select
              ariaLabel="Filtrar por conta"
              options={accountOptions}
              value={selectedAccount}
              onChange={changeAccount}
            />
          </div>
          <Link
            href="/transacoes/nova"
            className="col-span-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/40 bg-[var(--orbit-primary-subtle)] px-3 text-sm font-bold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:col-span-1"
          >
            <FaPlus aria-hidden="true" />
            Nova transação
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 ${orbitActionTokens}`}
        >
          <p className="text-sm font-semibold text-[var(--expense)]">{error}</p>
          <Button
            variant="outline"
            size="sm"
            icon={<FaRedo />}
            onClick={retry}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <CalendarSummary
        isLoading={isLoading}
        summaries={summary}
        commitmentCount={commitmentCount}
        overdueCount={overdueCount}
        showValues={showValues}
      />

      <section className="grid items-start gap-3.5 min-[851px]:grid-cols-[250px_minmax(0,1fr)] min-[1051px]:grid-cols-[280px_minmax(420px,1fr)_360px]">
        <MonthNavigator
          monthLabel={monthLabel}
          calendarDays={calendarDays}
          selectedDate={displayDate}
          isLoading={isLoading}
          showValues={showValues}
          onPrevious={previousMonth}
          onNext={nextMonth}
          onDayClick={selectDay}
        />
        <FinancialTimeline
          selectedDate={displayDate}
          events={dayEvents}
          summaries={daySummaries}
          showValues={showValues}
          onOpen={setSelectedEvent}
        />
        <CommitmentsAgenda
          commitments={
            showAllCommitments ? commitments : commitments.slice(0, 6)
          }
          total={commitmentCount}
          showAll={showAllCommitments}
          showValues={showValues}
          onOpen={setSelectedEvent}
          onToggleAll={() => setShowAllCommitments((value) => !value)}
          className="min-[851px]:col-span-2 min-[1051px]:col-span-1"
        />
      </section>

      {selectedEvent && (
        <EventDetailDrawer
          event={selectedEvent}
          showValues={showValues}
          closeRef={detailCloseRef}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </ProtectedRoute>
  );
}

function CalendarSummary({
  isLoading,
  summaries,
  commitmentCount,
  overdueCount,
  showValues,
}: {
  isLoading: boolean;
  summaries: CurrencyFinancialSummary[];
  commitmentCount: number;
  overdueCount: number;
  showValues: boolean;
}) {
  const metrics = [
    { key: 'balance' as const, label: 'Resultado do mês', icon: FaWallet },
    { key: 'income' as const, label: 'Receitas realizadas', icon: FaArrowUp },
    { key: 'expense' as const, label: 'Despesas realizadas', icon: FaArrowDown },
  ];

  return (
    <section
      className="my-[22px] grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3"
      aria-label="Resumo do calendário"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article
            key={metric.key}
            className="rounded-[15px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4"
          >
            <p className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">
              <Icon aria-hidden="true" /> {metric.label}
            </p>
            {isLoading ? (
              <div className="mt-2 h-6 animate-pulse rounded bg-[var(--skeleton)]" />
            ) : summaries.length === 0 ? (
              <strong className="mt-2 block text-lg sm:text-[23px]">—</strong>
            ) : (
              <div className="mt-2 space-y-0.5">
                {summaries.map((summary) => {
                  const value = summary[metric.key];
                  const tone =
                    metric.key === 'income'
                      ? 'text-[var(--income)]'
                      : metric.key === 'expense' ||
                          (metric.key === 'balance' && value < 0)
                        ? 'text-[var(--expense)]'
                        : 'text-[var(--foreground)]';

                  return (
                    <strong
                      key={summary.currency}
                      className={`block truncate text-[15px] font-bold sm:text-[23px] ${tone}`}
                    >
                      {showValues
                        ? formatCurrency(value, summary.currency)
                        : '••••'}
                    </strong>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}

      <article className="rounded-[15px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">
          <FaCalendarCheck aria-hidden="true" /> Compromissos do período
        </p>
        <strong className="mt-2 block text-lg font-bold text-[var(--foreground)] sm:text-[23px]">
          {isLoading ? '—' : `${commitmentCount} itens`}
        </strong>
        {!isLoading && overdueCount > 0 && (
          <span className="mt-1 block text-xs font-semibold text-[var(--expense)]">
            {overdueCount} vencido{overdueCount === 1 ? '' : 's'}
          </span>
        )}
      </article>
    </section>
  );
}

function MonthNavigator({
  monthLabel,
  calendarDays,
  selectedDate,
  isLoading,
  showValues,
  onPrevious,
  onNext,
  onDayClick,
}: {
  monthLabel: string;
  calendarDays: CalendarDay[];
  selectedDate: Date;
  isLoading: boolean;
  showValues: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onDayClick: (day: CalendarDay) => void;
}) {
  return (
    <aside
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${orbitActionTokens}`}
      aria-label="Navegação mensal"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Mês anterior"
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <FaChevronLeft aria-hidden="true" />
        </button>
        <h2 className="truncate text-sm font-bold text-[var(--foreground)]">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={onNext}
          aria-label="Próximo mês"
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {compactWeekDays.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className="py-1 text-center text-[10px] font-semibold text-[var(--text-muted)]"
          >
            {day}
          </span>
        ))}
      </div>
      <CalendarGrid
        compact
        showValues={showValues}
        isLoading={isLoading}
        calendarDays={calendarDays}
        selectedDate={selectedDate}
        onDayClick={onDayClick}
      />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-muted)]">
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--income)]" />Receita</span>
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--expense)]" />Despesa</span>
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rotate-45 bg-[var(--orbit-primary)]" />Transferência</span>
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />Pendente</span>
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />Marco</span>
      </div>
    </aside>
  );
}

function FinancialTimeline({
  selectedDate,
  events,
  summaries,
  showValues,
  onOpen,
}: {
  selectedDate: Date;
  events: CalendarEvent[];
  summaries: CurrencyFinancialSummary[];
  showValues: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  return (
    <article
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 ${orbitActionTokens}`}
      aria-labelledby="calendar-timeline-title"
    >
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-muted)]">
            {selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </p>
          <h2
            id="calendar-timeline-title"
            className="mt-1 text-xl font-bold text-[var(--foreground)]"
          >
            {selectedDate.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
            })}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">
            Resultado realizado do dia
          </p>
          {summaries.length === 0 ? (
            <strong className="mt-1 block text-sm">—</strong>
          ) : (
            summaries.map((summary) => (
              <strong
                key={summary.currency}
                className={`mt-1 block text-sm font-bold ${summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}
              >
                {showValues
                  ? `${summary.balance > 0 ? '+' : summary.balance < 0 ? '-' : ''}${formatCurrency(Math.abs(summary.balance), summary.currency)}`
                  : '••••'}
              </strong>
            ))
          )}
        </div>
      </header>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
          Nenhum evento financeiro neste dia.
        </p>
      ) : (
        <div className="relative ml-1 pl-[18px] sm:pl-6">
          <span
            className="absolute bottom-1 left-[5px] top-1 w-px bg-[var(--border-strong)] sm:left-2"
            aria-hidden="true"
          />
          {events.map((event) => (
            <TimelineEvent
              key={event.id}
              event={event}
              showValues={showValues}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function TimelineEvent({
  event,
  showValues,
  onOpen,
}: {
  event: CalendarEvent;
  showValues: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  const isIncome = event.direction === 'INCOME';
  const isTransfer = event.direction === 'TRANSFER';
  const isMilestone = event.direction === 'MILESTONE';
  const isPending = event.status === 'PENDING';
  const isCancelled = event.status === 'CANCELLED';
  const isOverdue = event.commitmentState === 'OVERDUE';

  const marker = isCancelled
    ? 'bg-[var(--text-subtle)]'
    : isOverdue
      ? 'bg-[var(--expense)]'
      : isMilestone
        ? 'bg-[var(--text-muted)]'
        : isTransfer
          ? 'bg-[var(--orbit-primary)]'
          : isPending
            ? 'bg-[var(--warning)]'
            : isIncome
              ? 'bg-[var(--income)]'
              : 'bg-[var(--expense)]';

  const iconTone = isMilestone
    ? 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
    : isTransfer
      ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
      : isIncome
        ? 'bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]'
        : isPending
          ? 'bg-[var(--warning-subtle)] text-[var(--pending)]'
          : 'bg-[var(--danger-subtle)] text-[var(--expense)]';

  const amountTone = isMilestone
    ? 'text-[var(--text-muted)]'
    : isTransfer
      ? 'text-[var(--orbit-primary)]'
      : isIncome
        ? 'text-[var(--income)]'
        : 'text-[var(--expense)]';

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="relative mb-2.5 grid w-full grid-cols-[54px_34px_minmax(0,1fr)] items-center gap-2 rounded-[13px] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:grid-cols-[68px_42px_minmax(0,1fr)_auto] sm:gap-2.5 sm:p-3"
    >
      <span
        className={`absolute left-[-17px] top-[21px] h-[9px] w-[9px] rounded-full border-2 border-[var(--surface)] sm:left-[-21px] sm:top-[23px] ${marker}`}
        aria-hidden="true"
      />
      <span className={`text-[10px] font-semibold sm:text-xs ${isOverdue ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}>
        {eventStatusLabel(event)}
      </span>
      <span
        className={`grid h-[34px] w-[34px] place-items-center rounded-[11px] sm:h-[38px] sm:w-[38px] ${iconTone}`}
        aria-hidden="true"
      >
        {isMilestone ? (
          <FaCalendarCheck />
        ) : isTransfer ? (
          <FaExchangeAlt />
        ) : isIncome ? (
          <FaArrowUp />
        ) : (
          <FaArrowDown />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--foreground)]">
          {event.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {eventContextLabel(event)}
        </p>
      </div>
      <strong className={`col-start-3 justify-self-end whitespace-nowrap text-sm sm:col-start-auto ${amountTone}`}>
        {signedAmount(event, showValues)}
      </strong>
    </button>
  );
}

function CommitmentsAgenda({
  commitments,
  total,
  showAll,
  showValues,
  onOpen,
  onToggleAll,
  className = '',
}: {
  commitments: CalendarEvent[];
  total: number;
  showAll: boolean;
  showValues: boolean;
  onOpen: (event: CalendarEvent) => void;
  onToggleAll: () => void;
  className?: string;
}) {
  return (
    <aside
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${orbitActionTokens} ${className}`}
      aria-labelledby="calendar-upcoming-title"
    >
      <header className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Agenda
          </p>
          <h2
            id="calendar-upcoming-title"
            className="mt-1 text-xl font-bold text-[var(--foreground)]"
          >
            Compromissos do período
          </h2>
        </div>
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {total} {total === 1 ? 'item' : 'itens'}
        </span>
      </header>

      {commitments.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma pendência ou marco neste período.
        </p>
      ) : (
        <div className="grid gap-2">
          {commitments.map((event) => {
            const date = eventDate(event);
            const isOverdue = event.commitmentState === 'OVERDUE';
            const amountTone =
              event.direction === 'MILESTONE'
                ? 'text-[var(--text-muted)]'
                : event.direction === 'INCOME'
                  ? 'text-[var(--income)]'
                  : 'text-[var(--expense)]';

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onOpen(event)}
                className="grid grid-cols-[54px_minmax(0,1fr)_auto] gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                <div className="text-center">
                  <strong className="block text-base text-[var(--foreground)]">
                    {String(date.getDate()).padStart(2, '0')}
                  </strong>
                  <small className={`text-[10px] uppercase ${isOverdue ? 'font-bold text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}>
                    {isOverdue
                      ? 'venc.'
                      : date
                          .toLocaleDateString('pt-BR', { weekday: 'short' })
                          .replace('.', '')}
                  </small>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">
                    {event.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {eventKindLabel(event)} · {event.account?.name ?? eventDateLabel(event)}
                  </p>
                </div>
                <strong className={`self-center whitespace-nowrap text-xs sm:text-sm ${amountTone}`}>
                  {signedAmount(event, showValues)}
                </strong>
              </button>
            );
          })}
        </div>
      )}

      {total > 6 && (
        <button
          type="button"
          onClick={onToggleAll}
          className="mt-3 min-h-11 w-full rounded-[10px] border border-[var(--border)] px-3 text-sm font-bold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          {showAll ? 'Mostrar menos' : `Ver todos (${total})`}
        </button>
      )}
    </aside>
  );
}

function EventDetailDrawer({
  event,
  showValues,
  closeRef,
  onClose,
}: {
  event: CalendarEvent;
  showValues: boolean;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const date = eventDate(event);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)]"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-detail-title"
        className={`w-full max-w-[520px] rounded-t-[18px] border border-[var(--border-strong)] bg-[var(--background)] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[var(--shadow-surface)] ${orbitActionTokens}`}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)]">
              {eventKindLabel(event)}
            </p>
            <h2
              id="calendar-detail-title"
              className="mt-1 break-words text-xl font-bold text-[var(--foreground)]"
            >
              {event.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhe"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-2.5">
          <DetailBox label="Valor" value={signedAmount(event, showValues)} />
          <DetailBox label="Data" value={date.toLocaleDateString('pt-BR')} />
          <DetailBox
            label="Conta"
            value={event.account?.name ?? 'Não se aplica'}
          />
          {event.counterpartAccount && (
            <DetailBox
              label="Contraparte"
              value={event.counterpartAccount.name}
            />
          )}
          <DetailBox label="Status" value={eventStatusLabel(event)} />
          <DetailBox label="Origem" value={eventKindLabel(event)} />
        </dl>

        <Link
          href={event.href}
          className="mt-4 inline-flex min-h-11 items-center rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          Abrir origem
        </Link>
      </section>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}
