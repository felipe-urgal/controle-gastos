'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

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
import CalendarWeekView from '@/app/components/pages/calendar/calendar/calendar-week-view';
import { addDays, canRescheduleEvent, rescheduleBody } from '@/app/components/pages/calendar/calendar/calendar-week';
import { dropIn, riseInView, slideInRow } from '@/app/components/pages/calendar/calendar-motion';
import { Button, Chip, Input, PeriodSwitcher, Select, ShowBelow, ShowFrom } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { transactionService } from '@/app/services/transaction-service';
import { CARD_EASE, CountUp, reducedTransition } from '@/app/components/ui/motion';
import { useAuth } from '@/app/context';
import { useCalendar } from '@/app/hooks/calendar/use-calendar';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { summarizeCommitments, type CommitmentTotals } from '@/app/lib/calendar/commitment-totals';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import {
  isInvestmentEvent,
  type CalendarDay,
  type CalendarEvent,
  type CalendarInvestmentIncome,
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
  if (event.sourceKind === 'INVESTMENT_BUY') return 'Compra de ativo';
  if (event.sourceKind === 'INVESTMENT_SELL') return 'Venda de ativo';
  if (event.sourceKind === 'INVESTMENT_INCOME') return 'Provento recebido';
  if (event.seriesType === 'RECURRING') return 'Recorrência';
  if (event.seriesType === 'INSTALLMENT') return 'Parcela';
  return event.direction === 'INCOME' ? 'Receita' : 'Despesa';
}

function eventStatusLabel(event: CalendarEvent) {
  if (event.commitmentState === 'OVERDUE') return 'Vencido';
  if (isInvestmentEvent(event)) return 'Realizado';
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

export default function CalendarPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    currentDate,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    summary,
    investmentIncome,
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
  const reduce = useReducedMotion();

  // Como a tela troca de dados: o mês desliza na direção do clique; a conta cai de cima.
  // Nulo na primeira carga: só a troca de mês ou de conta anima a entrada dos dados.
  const [swap, setSwap] = useState<{ axis: 'x' | 'y'; dir: 1 | -1 } | null>(null);
  const dataKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${selectedAccount}`;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // Investimentos são informativos; o chip só aparece quando o mês tem algum.
  const [showInvestments, setShowInvestments] = useState(true);
  const hasInvestmentEvents = useMemo(
    () => calendarDays.some((day) => day.events.some(isInvestmentEvent)),
    [calendarDays],
  );
  const visibleDays = useMemo(
    () =>
      showInvestments
        ? calendarDays
        : calendarDays.map((day) => ({ ...day, events: day.events.filter((event) => !isInvestmentEvent(event)) })),
    [calendarDays, showInvestments],
  );

  const displayDate = selectedDate ?? currentDate;
  const selectedDay = useMemo(
    () => dayForDate(visibleDays, displayDate),
    [visibleDays, displayDate],
  );
  const totals = useMemo(() => summarizeCommitments(commitments), [commitments]);

  const selectDay = useCallback(
    (day: CalendarDay) => {
      setSelectedDate(day.date);
      if (!day.isCurrentMonth) goToDate(day.date);
    },
    [goToDate],
  );

  // Reagendar um compromisso pendente (arrastando na semana ou escolhendo a data no detalhe). O servidor aplica as
  // mesmas regras da edição (mês travado, fatura de cartão paga); a mensagem dele aparece aqui.
  const reschedule = useCallback(
    async (event: CalendarEvent, target: Date) => {
      const body = canRescheduleEvent(event) ? rescheduleBody(event, target) : null;
      if (!body) return;
      setRescheduling(true);
      setRescheduleError('');
      try {
        await transactionService.update(event.sourceId, body);
        setSelectedEvent(null);
        retry();
      } catch (cause) {
        setRescheduleError(errorMessage(cause, 'Não foi possível reagendar.'));
      } finally {
        setRescheduling(false);
      }
    },
    [retry],
  );

  const shiftWeek = (direction: -1 | 1) => {
    const target = addDays(displayDate, direction * 7);
    setSelectedDate(target);
    if (target.getMonth() !== currentDate.getMonth() || target.getFullYear() !== currentDate.getFullYear()) goToDate(target);
  };

  const previousMonth = () => {
    setSwap({ axis: 'x', dir: -1 });
    setSelectedDate(null);
    goToPreviousMonth();
  };

  const nextMonth = () => {
    setSwap({ axis: 'x', dir: 1 });
    setSelectedDate(null);
    goToNextMonth();
  };

  const selectMonth = (month: number, year: number) => {
    const target = new Date(year, month - 1, 1);
    setSwap({ axis: 'x', dir: target > currentDate ? 1 : -1 });
    setSelectedDate(null);
    goToDate(target);
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
    <motion.div
      className="flex w-full flex-wrap gap-2 sm:w-auto"
      initial={reduce ? false : { opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE, delay: 0.3 })}
    >
      <PeriodSwitcher
        animated="flip"
        className="w-full sm:w-auto"
        month={currentDate.getMonth() + 1}
        year={currentDate.getFullYear()}
        onPrevious={previousMonth}
        onNext={nextMonth}
        onSelect={selectMonth}
      />
      {accounts.length > 1 && (
        <div className="w-full sm:w-[190px]">
          <Select
            ariaLabel="Filtrar por conta"
            animated
            options={accountOptions}
            value={selectedAccount}
            onChange={(value) => {
              setSwap({ axis: 'y', dir: 1 });
              handleAccountChange(value);
            }}
          />
        </div>
      )}
      <div className="flex gap-2" role="group" aria-label="Visão do calendário">
        <Chip selected={view === 'month'} onClick={() => setView('month')}>Mês</Chip>
        <Chip selected={view === 'week'} onClick={() => setView('week')}>Semana</Chip>
      </div>
      {hasInvestmentEvents && (
        <button
          type="button"
          aria-pressed={showInvestments}
          onClick={() => setShowInvestments((value) => !value)}
          className={`inline-flex h-10 items-center rounded-[var(--radius-md)] border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
            showInvestments
              ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
          }`}
        >
          Investimentos
        </button>
      )}
    </motion.div>
  );

  return (
    <ProtectedRoute>
      <PageTitle title="Calendário" sidebarAligned animated="flip" loading={isLoading} actions={<ShowFrom breakpoint="lg">{headerControls}</ShowFrom>} />
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
        investmentIncome={investmentIncome}
        totals={totals}
        overdueCount={overdueCount}
        showValues={showValues}
      />

      {rescheduleError && (
        <div role="alert" className="mt-4 rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm font-semibold text-[var(--expense)]">
          {rescheduleError}
        </div>
      )}

      {view === 'week' ? (
        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>Semana anterior</Button>
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Semana de {addDays(displayDate, -displayDate.getDay()).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </p>
            <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>Próxima semana</Button>
          </div>
          <CalendarWeekView
            referenceDate={displayDate}
            calendarDays={visibleDays}
            showValues={showValues}
            busy={rescheduling || isLoading}
            onOpenEvent={setSelectedEvent}
            onReschedule={(event, target) => void reschedule(event, target)}
          />
        </div>
      ) : (
      <motion.section
        // A chave é mês + conta: trocar qualquer um refaz a entrada, deslizando na direção do mês ou caindo para a conta.
        key={dataKey}
        className="grid items-stretch gap-3.5 lg:grid-cols-[minmax(0,1fr)_380px]"
        initial={
          reduce || !swap
            ? false
            : swap.axis === 'x'
              ? { opacity: 0, x: swap.dir * 80 }
              : { opacity: 0, y: -28, scale: 0.97 }
        }
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 18, mass: 1.1, delay: 0.15 }}
      >
        <MonthGrid
          calendarDays={visibleDays}
          selectedDate={displayDate}
          isLoading={isLoading}
          isDesktop={isDesktop}
          showValues={showValues}
          onDayClick={selectDay}
        />
        {/* No desktop a coluna tem a altura do calendário (o conteúdo fica absoluto e não empurra a linha); a linha do tempo e a agenda rolam por dentro. */}
        <div className="relative lg:min-h-0">
          <div className="grid gap-3.5 lg:absolute lg:inset-0 lg:flex lg:flex-col">
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
        </div>
      </motion.section>
      )}

      {selectedEvent && (
        <EventDetailDrawer
          event={selectedEvent}
          showValues={showValues}
          busy={rescheduling}
          onReschedule={canRescheduleEvent(selectedEvent) ? (target) => void reschedule(selectedEvent, target) : undefined}
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
  investmentIncome,
  totals,
  overdueCount,
  showValues,
}: {
  isLoading: boolean;
  balances: CurrencyFinancialSummary[];
  investmentIncome: CalendarInvestmentIncome[];
  totals: CommitmentTotals[];
  overdueCount: number;
  showValues: boolean;
}) {
  const reduce = useReducedMotion();
  const overdue = totals.filter((total) => total.overduePayable > 0);

  const metrics = [
    {
      label: 'Resultado do mês',
      rows: balances.map((item) => ({
        key: item.currency,
        amount: item.balance,
        currency: item.currency,
        tone: item.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
      })),
    },
    {
      label: 'A pagar',
      rows: totals
        .filter((total) => total.payable > 0)
        .map((total) => ({
          key: total.currency,
          amount: total.payable,
          currency: total.currency,
          tone: 'text-[var(--expense)]',
        })),
    },
    {
      label: 'A receber',
      rows: totals
        .filter((total) => total.receivable > 0)
        .map((total) => ({
          key: total.currency,
          amount: total.receivable,
          currency: total.currency,
          tone: 'text-[var(--income)]',
        })),
    },
    {
      label: 'Proventos do mês',
      rows: investmentIncome.map((item) => ({
        key: item.currency,
        amount: item.amount,
        currency: item.currency,
        tone: 'text-[var(--income)]',
      })),
    },
  ];
  const withoutAmount = totals.reduce((sum, total) => sum + total.withoutAmount, 0);

  return (
    <section className="my-4 grid gap-2 lg:my-5" aria-label="Resumo do calendário">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {metrics.map((metric, index) => (
          <motion.article
            key={metric.label}
            {...dropIn(index, reduce)}
            whileHover="hover"
            whileTap={{ scale: 0.96, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
            className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 lg:p-4"
          >
            {/* O cartão em si não se mexe; o rótulo e o valor reagem ao hover e ao toque. */}
            <motion.p
              className="truncate text-xs font-semibold text-[var(--text-muted)]"
              variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 20 } } }}
            >
              {metric.label}
            </motion.p>
            {isLoading ? (
              <div className="mt-2 h-5 animate-pulse rounded bg-[var(--skeleton)]" />
            ) : metric.rows.length === 0 ? (
              <strong className="mt-2 block text-sm text-[var(--text-muted)] lg:text-lg">—</strong>
            ) : (
              <div className="mt-2 space-y-0.5">
                {metric.rows.map((row) => (
                  <motion.strong
                    key={row.key}
                    className={`money block origin-left truncate text-sm font-bold lg:text-xl ${row.tone}`}
                    variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}
                  >
                    {/* Os números sobem de zero até o valor e acompanham a troca de mês. */}
                    <CountUp amount={row.amount} format={(cents) => money(cents, row.currency, showValues)} />
                  </motion.strong>
                ))}
              </div>
            )}
          </motion.article>
        ))}
      </div>

      {!isLoading && overdueCount > 0 && (
        <motion.a
          href="#calendar-agenda"
          // Entra de lado e dá uma tremida curta, como um alerta batendo na porta.
          initial={reduce ? false : { opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: reduce ? 0 : [-50, 0, -7, 5, -2, 0], transition: { duration: 0.8, delay: 0.7, ease: 'easeOut' } }}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--expense)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-[var(--expense)]" />
              {!reduce && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-[var(--expense)]"
                  animate={{ scale: [1, 2.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </span>
            <span>
            {overdueCount} {overdueCount === 1 ? 'vencido' : 'vencidos'}
            {overdue.length > 0 && (
              <span className="money">
                {' · '}
                {overdue.map((total) => money(total.overduePayable, total.currency, showValues)).join(' + ')}
              </span>
            )}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs">
            Ver agenda
            <motion.span className="inline-block" aria-hidden="true" variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
              →
            </motion.span>
          </span>
        </motion.a>
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
  const reduce = useReducedMotion();

  return (
    <motion.section
      {...riseInView(reduce, 0.05)}
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-1 py-2 lg:p-0"
      aria-label="Dias do mês"
    >
      <div className="grid grid-cols-7 gap-0" aria-hidden="true">
        {(isDesktop ? weekDaysLong : weekDays).map((day, index) => (
          // Os dias da semana caem um depois do outro; no hover (ou toque) a letra salta.
          <motion.span
            key={`${day}-${index}`}
            className="py-2 text-center text-xs font-semibold text-[var(--text-muted)] lg:border-b lg:border-[var(--border)]"
            initial={reduce ? false : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0, transition: reducedTransition(reduce, { type: 'spring', stiffness: 380, damping: 16, delay: 0.2 + index * 0.05 }) }}
            whileHover={{ y: -3, scale: 1.2, color: 'var(--foreground)', transition: { type: 'spring', stiffness: 500, damping: 14 } }}
            whileTap={{ y: -3, scale: 1.2, transition: { type: 'spring', stiffness: 500, damping: 14 } }}
          >
            {day}
          </motion.span>
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
          {[
            ['bg-[var(--expense)]', 'Vencido'],
            ['bg-[var(--warning)]', 'Pendente'],
            ['bg-[var(--text-muted)]', 'Realizado'],
          ].map(([tone, label], index) => (
            <motion.span
              key={label}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.9 + index * 0.08 } }}
              whileTap={{ scale: 1.15 }}
            >
              <i className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${tone}`} />
              {label}
            </motion.span>
          ))}
        </div>
      )}
    </motion.section>
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
  const reduce = useReducedMotion();
  const dayKey = selectedDate.toDateString();

  return (
    <motion.article
      {...riseInView(reduce, 0.1)}
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 lg:flex lg:max-h-[55%] lg:shrink-0 lg:flex-col"
      aria-labelledby="calendar-timeline-title"
    >
      <header className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="overflow-hidden">
          {isToday && (
            <motion.p
              className="text-xs font-semibold text-[var(--primary)]"
              initial={reduce ? false : { opacity: 0, scale: 0.4, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              style={{ transformOrigin: 'left center' }}
            >
              Hoje
            </motion.p>
          )}
          {/* Trocar de dia: a data nova sobe e a antiga some, como virar uma folha. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={dayKey}
              id="calendar-timeline-title"
              className="text-lg font-bold first-letter:uppercase text-[var(--foreground)]"
              initial={reduce ? false : { opacity: 0, y: 18, rotateX: -50 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -18, rotateX: 50 }}
              transition={{ duration: 0.22, ease: CARD_EASE }}
              style={{ transformPerspective: 500 }}
            >
              {selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </motion.h2>
          </AnimatePresence>
        </div>
        {summaries.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Realizado no dia</p>
            {summaries.map((summary) => (
              <motion.strong
                key={`${summary.currency}-${dayKey}`}
                className={`money block text-sm font-bold ${summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.25 }}
              >
                {showValues
                  ? `${summary.balance > 0 ? '+' : summary.balance < 0 ? '-' : ''}${formatCurrency(Math.abs(summary.balance), summary.currency)}`
                  : '••••'}
              </motion.strong>
            ))}
          </div>
        )}
      </header>

      {events.length === 0 ? (
        <motion.p
          key={`empty-${dayKey}`}
          className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]"
          initial={reduce ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: CARD_EASE, delay: 0.1 }}
        >
          Nenhum evento financeiro neste dia.
        </motion.p>
      ) : (
        // A chave é o dia: ao trocar de dia a lista recomeça e os eventos entram em sequência.
        <div key={dayKey} className="grid gap-2 overflow-x-hidden lg:min-h-0 lg:overflow-y-auto lg:pr-2">
          {events.map((event, index) => (
            <TimelineEvent
              key={event.id}
              event={event}
              index={index}
              showValues={showValues}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </motion.article>
  );
}

function TimelineEvent({
  event,
  index,
  showValues,
  onOpen,
}: {
  event: CalendarEvent;
  index: number;
  showValues: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  const isIncome = event.direction === 'INCOME';
  const isTransfer = event.direction === 'TRANSFER';
  const isMilestone = event.direction === 'MILESTONE';
  const isPending = event.status === 'PENDING';
  const isOverdue = event.commitmentState === 'OVERDUE';
  const reduce = useReducedMotion();
  // No hover (ou toque) o ícone se move no sentido do evento: receita sobe, despesa desce, transferência balança, marco gira.
  const iconHover = isMilestone
    ? { rotate: 360, transition: { duration: 0.6 } }
    : isTransfer
      ? { x: [0, 5, -5, 0], transition: { duration: 0.5 } }
      : { y: isIncome ? [0, -6, 0] : [0, 6, 0], scale: [1, 1.15, 1], transition: { duration: 0.5 } };

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
    <motion.button
      type="button"
      onClick={() => onOpen(event)}
      {...slideInRow(index, reduce, 36)}
      whileHover="hover"
      whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
      variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}
      className="grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <motion.span
        className={`grid h-[38px] w-[38px] place-items-center rounded-[var(--radius-md)] ${iconTone}`}
        aria-hidden="true"
        variants={{ hover: iconHover }}
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
      </motion.span>
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
      <motion.strong
        className={`money origin-right whitespace-nowrap text-sm ${amountTone}`}
        variants={{ hover: { scale: 1.12, transition: { type: 'spring', stiffness: 400, damping: 14 } } }}
      >
        {signedAmount(event, showValues)}
      </motion.strong>
    </motion.button>
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
  const reduce = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? commitments : commitments.slice(0, AGENDA_PREVIEW);

  return (
    <motion.aside
      id="calendar-agenda"
      {...riseInView(reduce, 0.15)}
      className="scroll-mt-20 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 lg:flex lg:min-h-[12rem] lg:flex-1 lg:flex-col"
      aria-labelledby="calendar-upcoming-title"
    >
      <header className="mb-3 flex shrink-0 items-baseline justify-between gap-2">
        <h2 id="calendar-upcoming-title" className="text-lg font-bold text-[var(--foreground)]">
          Agenda do mês
        </h2>
        <motion.span
          key={total}
          className="text-xs font-semibold text-[var(--text-muted)]"
          initial={reduce ? false : { scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        >
          {total} {total === 1 ? 'item' : 'itens'}
        </motion.span>
      </header>

      {commitments.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nenhuma pendência ou marco neste período.</p>
      ) : (
        <div className="grid gap-2 overflow-x-hidden lg:min-h-0 lg:flex-1 lg:content-start lg:overflow-y-auto lg:pr-2">
          <AnimatePresence initial={false}>
          {visible.map((event, index) => {
            const date = eventDate(event);
            const isOverdue = event.commitmentState === 'OVERDUE';
            const amountTone =
              event.direction === 'MILESTONE'
                ? 'text-[var(--text-muted)]'
                : event.direction === 'INCOME'
                  ? 'text-[var(--income)]'
                  : 'text-[var(--expense)]';

            return (
              <motion.button
                key={event.id}
                type="button"
                onClick={() => onOpen(event)}
                {...slideInRow(index >= AGENDA_PREVIEW ? index - AGENDA_PREVIEW : index, reduce, 36)}
                exit={{ opacity: 0, x: 36, transition: { duration: 0.15 } }}
                whileHover="hover"
                whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
                variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}
                className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                {/* A data vira como uma folha no hover (ou toque); o vencido pulsa. */}
                <motion.div
                  className="text-center"
                  style={{ transformPerspective: 400 }}
                  variants={{ hover: { rotateX: [0, -360], transition: { duration: 0.7, ease: 'easeInOut' } } }}
                >
                  <strong className="block text-base text-[var(--foreground)]">
                    {String(date.getDate()).padStart(2, '0')}
                  </strong>
                  <motion.small
                    className={`block text-xs uppercase ${isOverdue ? 'font-bold text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}
                    animate={isOverdue && !reduce ? { opacity: [1, 0.45, 1] } : undefined}
                    transition={isOverdue ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
                  >
                    {isOverdue
                      ? 'venc.'
                      : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                  </motion.small>
                </motion.div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{event.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {eventKindLabel(event)} · {event.account?.name ?? eventDateLabel(event)}
                  </p>
                </div>
                <motion.strong
                  className={`money origin-right whitespace-nowrap text-sm ${amountTone}`}
                  variants={{ hover: { scale: 1.12, transition: { type: 'spring', stiffness: 400, damping: 14 } } }}
                >
                  {signedAmount(event, showValues)}
                </motion.strong>
              </motion.button>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      {commitments.length > AGENDA_PREVIEW && (
        <motion.div className="mt-3 shrink-0" whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}>
          <Button variant="outline" size="sm" fullWidth onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Mostrar menos' : `Ver todos (${commitments.length})`}
          </Button>
        </motion.div>
      )}
    </motion.aside>
  );
}

function EventDetailDrawer({
  event,
  showValues,
  busy,
  onReschedule,
  onClose,
}: {
  event: CalendarEvent;
  showValues: boolean;
  busy: boolean;
  /** Só para compromisso pendente: muda a data sem precisar arrastar (teclado, celular). */
  onReschedule?: (target: Date) => void;
  onClose: () => void;
}) {
  const date = eventDate(event);
  const [newDate, setNewDate] = useState('');

  return (
    <ModalShell
      title={event.title}
      description={eventKindLabel(event)}
      closeLabel="Fechar detalhe"
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <motion.dl
        className="grid grid-cols-2 gap-2.5"
        initial="hidden"
        animate="shown"
        variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
      >
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
      </motion.dl>

      {onReschedule && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Input label="Reagendar para" type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} disabled={busy} />
          <Button
            type="button"
            size="sm"
            disabled={busy || !newDate}
            isLoading={busy}
            onClick={() => {
              const [year, month, day] = newDate.split('-').map(Number);
              if (year && month && day) onReschedule(new Date(year, month - 1, day));
            }}
          >
            Reagendar
          </Button>
        </div>
      )}

      <motion.div
        className="mt-4 inline-flex"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.5 }}
      >
        <Button as="a" href={event.href} variant="outline" size="sm">
          Abrir origem
        </Button>
      </motion.div>
    </ModalShell>
  );
}

function DetailBox({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <motion.div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3"
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.9 },
        shown: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 20 } },
      }}
      whileTap={{ scale: 0.96 }}
    >
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className={`${mono ? 'money ' : ''}mt-1 break-words text-sm font-bold text-[var(--foreground)]`}>
        {value}
      </dd>
    </motion.div>
  );
}
