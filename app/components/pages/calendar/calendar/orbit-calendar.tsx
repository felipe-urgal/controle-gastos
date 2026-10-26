'use client';

import { PageTitle } from '@/app/components/base-pages';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { useCallback, useMemo, useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarCheck,
  FaExchangeAlt,
  FaRedo,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { CalendarGrid } from '@/app/components/pages/calendar';
import { Button, PeriodSwitcher, Select, ShowBelow, ShowFrom } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useCalendar } from '@/app/hooks/calendar/use-calendar';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { summarizeCommitments, type CommitmentTotals } from '@/app/lib/calendar/commitment-totals';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  CalendarDay,
  CalendarEvent,
} from '@/app/types/calendar';
import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const weekDaysLong = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
    goToDate,
    handleAccountChange,
    retry,
  } = useCalendar();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const displayDate = selectedDate ?? currentDate;
  const selectedDay = useMemo(
    () => dayForDate(calendarDays, displayDate),
    [calendarDays, displayDate],
  );
  const totals = useMemo(() => summarizeCommitments(commitments), [commitments]);

  const selectDay = useCallback(
    (day: CalendarDay) => {
      setSelectedDate(day.date);
      if (!day.isCurrentMonth) goToDate(day.date);
    },
    [goToDate],
  );

  const previousMonth = () => {
    setSelectedDate(null);
    goToPreviousMonth();
  };

  const nextMonth = () => {
    setSelectedDate(null);
    goToNextMonth();
  };

  const accountOptions = [
    { value: 'all', label: 'Todas as contas' },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.name,
    })),
  ];

  // Com uma conta só o filtro não filtra nada: some para liberar espaço.
  const headerControls = (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
      <PeriodSwitcher
        className="w-full sm:w-auto"
        month={currentDate.getMonth() + 1}
        year={currentDate.getFullYear()}
        onPrevious={previousMonth}
        onNext={nextMonth}
      />
      {accounts.length > 1 && (
        <div className="w-full sm:w-[190px]">
          <Select
            ariaLabel="Filtrar por conta"
            options={accountOptions}
            value={selectedAccount}
            onChange={handleAccountChange}
          />
        </div>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <PageTitle title="Calendário" sidebarAligned actions={<ShowFrom breakpoint="lg">{headerControls}</ShowFrom>} />
      <ShowBelow breakpoint="lg">
        <div className="mt-4">{headerControls}</div>
      </ShowBelow>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3"
        >
          <p className="text-sm font-semibold text-[var(--expense)]">{error}</p>
          <Button variant="outline" size="sm" icon={<FaRedo />} onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}

      <CalendarSummary
        isLoading={isLoading}
        balances={summary}
        totals={totals}
        overdueCount={overdueCount}
        showValues={showValues}
      />

      <section className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <MonthGrid
          calendarDays={calendarDays}
          selectedDate={displayDate}
          isLoading={isLoading}
          isDesktop={isDesktop}
          showValues={showValues}
          onDayClick={selectDay}
        />
        <div className="grid gap-3.5">
          <FinancialTimeline
            selectedDate={displayDate}
            isToday={selectedDay?.isToday ?? false}
            events={selectedDay?.events ?? []}
            summaries={selectedDay?.summaries ?? []}
            showValues={showValues}
            onOpen={setSelectedEvent}
          />
          <CommitmentsAgenda
            commitments={commitments}
            total={commitmentCount}
            showValues={showValues}
            onOpen={setSelectedEvent}
          />
        </div>
      </section>

      {selectedEvent && (
        <EventDetailDrawer
          event={selectedEvent}
          showValues={showValues}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </ProtectedRoute>
  );
}

function money(value: number, currency: CommitmentTotals['currency'], showValues: boolean) {
  return showValues ? formatCurrency(value, currency) : '••••';
}

function CalendarSummary({
  isLoading,
  balances,
  totals,
  overdueCount,
  showValues,
}: {
  isLoading: boolean;
  balances: CurrencyFinancialSummary[];
  totals: CommitmentTotals[];
  overdueCount: number;
  showValues: boolean;
}) {
  const overdue = totals.filter((total) => total.overduePayable > 0);

  const metrics = [
    {
      label: 'Resultado do mês',
      rows: balances.map((item) => ({
        key: item.currency,
        text: money(item.balance, item.currency, showValues),
        tone: item.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
      })),
    },
    {
      label: 'A pagar',
      rows: totals
        .filter((total) => total.payable > 0)
        .map((total) => ({
          key: total.currency,
          text: money(total.payable, total.currency, showValues),
          tone: 'text-[var(--expense)]',
        })),
    },
    {
      label: 'A receber',
      rows: totals
        .filter((total) => total.receivable > 0)
        .map((total) => ({
          key: total.currency,
          text: money(total.receivable, total.currency, showValues),
          tone: 'text-[var(--income)]',
        })),
    },
  ];
  const withoutAmount = totals.reduce((sum, total) => sum + total.withoutAmount, 0);

  return (
    <section className="my-4 grid gap-2 lg:my-5" aria-label="Resumo do calendário">
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 lg:p-4"
          >
            <p className="truncate text-xs font-semibold text-[var(--text-muted)]">{metric.label}</p>
            {isLoading ? (
              <div className="mt-2 h-5 animate-pulse rounded bg-[var(--skeleton)]" />
            ) : metric.rows.length === 0 ? (
              <strong className="mt-2 block text-sm text-[var(--text-muted)] lg:text-lg">—</strong>
            ) : (
              <div className="mt-2 space-y-0.5">
                {metric.rows.map((row) => (
                  <strong
                    key={row.key}
                    className={`money block truncate text-sm font-bold lg:text-xl ${row.tone}`}
                  >
                    {row.text}
                  </strong>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {!isLoading && overdueCount > 0 && (
        <a
          href="#calendar-agenda"
          className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--expense)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span>
            {overdueCount} {overdueCount === 1 ? 'vencido' : 'vencidos'}
            {overdue.length > 0 && (
              <span className="money">
                {' · '}
                {overdue.map((total) => money(total.overduePayable, total.currency, showValues)).join(' + ')}
              </span>
            )}
          </span>
          <span className="shrink-0 text-xs">Ver agenda</span>
        </a>
      )}
      {!isLoading && withoutAmount > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {withoutAmount} {withoutAmount === 1 ? 'compromisso sem valor' : 'compromissos sem valor'} fora dos totais.
        </p>
      )}
    </section>
  );
}

function MonthGrid({
  calendarDays,
  selectedDate,
  isLoading,
  isDesktop,
  showValues,
  onDayClick,
}: {
  calendarDays: CalendarDay[];
  selectedDate: Date;
  isLoading: boolean;
  isDesktop: boolean;
  showValues: boolean;
  onDayClick: (day: CalendarDay) => void;
}) {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-1 py-2 lg:p-0"
      aria-label="Dias do mês"
    >
      <div className="grid grid-cols-7 gap-0" aria-hidden="true">
        {(isDesktop ? weekDaysLong : weekDays).map((day, index) => (
          <span
            key={`${day}-${index}`}
            className="py-2 text-center text-xs font-semibold text-[var(--text-muted)] lg:border-b lg:border-[var(--border)]"
          >
            {day}
          </span>
        ))}
      </div>
      <CalendarGrid
        compact={!isDesktop}
        showValues={showValues}
        isLoading={isLoading}
        calendarDays={calendarDays}
        selectedDate={selectedDate}
        onDayClick={onDayClick}
      />
      {!isDesktop && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] px-3 pb-1 pt-3 text-xs text-[var(--text-muted)]">
          <span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--expense)]" />Vencido</span>
          <span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />Pendente</span>
          <span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />Realizado</span>
        </div>
      )}
    </section>
  );
}

function FinancialTimeline({
  selectedDate,
  isToday,
  events,
  summaries,
  showValues,
  onOpen,
}: {
  selectedDate: Date;
  isToday: boolean;
  events: CalendarEvent[];
  summaries: CurrencyFinancialSummary[];
  showValues: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  return (
    <article
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
      aria-labelledby="calendar-timeline-title"
    >
      <header className="mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div>
          {isToday && <p className="text-xs font-semibold text-[var(--primary)]">Hoje</p>}
          <h2
            id="calendar-timeline-title"
            className="text-lg font-bold first-letter:uppercase text-[var(--foreground)]"
          >
            {selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </h2>
        </div>
        {summaries.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Realizado no dia</p>
            {summaries.map((summary) => (
              <strong
                key={summary.currency}
                className={`money block text-sm font-bold ${summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}
              >
                {showValues
                  ? `${summary.balance > 0 ? '+' : summary.balance < 0 ? '-' : ''}${formatCurrency(Math.abs(summary.balance), summary.currency)}`
                  : '••••'}
              </strong>
            ))}
          </div>
        )}
      </header>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
          Nenhum evento financeiro neste dia.
        </p>
      ) : (
        <div className="grid gap-2">
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
  const isOverdue = event.commitmentState === 'OVERDUE';

  const iconTone = isMilestone
    ? 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
    : isTransfer
      ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
      : isIncome
        ? 'bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]'
        : isPending
          ? 'bg-[var(--warning-subtle)] text-[var(--pending)]'
          : 'bg-[var(--danger-subtle)] text-[var(--expense)]';

  const amountTone = isMilestone
    ? 'text-[var(--text-muted)]'
    : isTransfer
      ? 'text-[var(--primary)]'
      : isIncome
        ? 'text-[var(--income)]'
        : 'text-[var(--expense)]';

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <span
        className={`grid h-[38px] w-[38px] place-items-center rounded-[var(--radius-md)] ${iconTone}`}
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
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{event.title}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          <span className={isOverdue ? 'font-semibold text-[var(--expense)]' : isPending ? 'text-[var(--pending)]' : ''}>
            {eventStatusLabel(event)}
          </span>
          {' · '}
          {eventContextLabel(event)}
        </p>
      </div>
      <strong className={`money whitespace-nowrap text-sm ${amountTone}`}>
        {signedAmount(event, showValues)}
      </strong>
    </button>
  );
}

const AGENDA_PREVIEW = 6;

function CommitmentsAgenda({
  commitments,
  total,
  showValues,
  onOpen,
}: {
  commitments: CalendarEvent[];
  total: number;
  showValues: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? commitments : commitments.slice(0, AGENDA_PREVIEW);

  return (
    <aside
      id="calendar-agenda"
      className="scroll-mt-20 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
      aria-labelledby="calendar-upcoming-title"
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="calendar-upcoming-title" className="text-lg font-bold text-[var(--foreground)]">
          Agenda do mês
        </h2>
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {total} {total === 1 ? 'item' : 'itens'}
        </span>
      </header>

      {commitments.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nenhuma pendência ou marco neste período.</p>
      ) : (
        <div className="grid gap-2">
          {visible.map((event) => {
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
                className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                <div className="text-center">
                  <strong className="block text-base text-[var(--foreground)]">
                    {String(date.getDate()).padStart(2, '0')}
                  </strong>
                  <small className={`text-xs uppercase ${isOverdue ? 'font-bold text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}>
                    {isOverdue
                      ? 'venc.'
                      : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                  </small>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{event.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {eventKindLabel(event)} · {event.account?.name ?? eventDateLabel(event)}
                  </p>
                </div>
                <strong className={`money whitespace-nowrap text-sm ${amountTone}`}>
                  {signedAmount(event, showValues)}
                </strong>
              </button>
            );
          })}
        </div>
      )}

      {commitments.length > AGENDA_PREVIEW && (
        <Button className="mt-3" variant="outline" size="sm" fullWidth onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Mostrar menos' : `Ver todos (${commitments.length})`}
        </Button>
      )}
    </aside>
  );
}

function EventDetailDrawer({
  event,
  showValues,
  onClose,
}: {
  event: CalendarEvent;
  showValues: boolean;
  onClose: () => void;
}) {
  const date = eventDate(event);

  return (
    <ModalShell
      title={event.title}
      description={eventKindLabel(event)}
      closeLabel="Fechar detalhe"
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <dl className=" grid grid-cols-2 gap-2.5">
        <DetailBox label="Valor" value={signedAmount(event, showValues)} mono />
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

      <Button as="a" href={event.href} className="mt-4" variant="outline" size="sm">
        Abrir origem
      </Button>
    </ModalShell>
  );
}

function DetailBox({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className={`${mono ? 'money ' : ''}mt-1 break-words text-sm font-bold text-[var(--foreground)]`}>
        {value}
      </dd>
    </div>
  );
}
