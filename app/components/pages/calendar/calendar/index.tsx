'use client';

import { useCallback, useMemo } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { PageHeader } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import {
  CalendarGrid,
  CalendarHeader,
  DayModal,
  MonthlySummary,
  WeekDaysHeader,
} from '@/app/components/pages/calendar';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useCalendar } from '@/app/hooks/calendar/use-calendar';
import { useCalendarModal } from '@/app/hooks/calendar/use-calendar-modal';
import { useCalendarPersistence } from '@/app/hooks/calendar/use-calendar-persistence';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthNames } from '@/app/lib/date/constants';
import type { CalendarDay, Transaction as CalendarTransaction } from '@/app/types/calendar';

function dateKeyFromDate(date: Date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function transactionDateKey(transaction: CalendarTransaction) {
  if (!transaction.year || !transaction.month || !transaction.day) return null;
  return transaction.year * 10000 + transaction.month * 100 + transaction.day;
}

function transactionDateLabel(transaction: CalendarTransaction) {
  if (!transaction.year || !transaction.month || !transaction.day) return 'Data não informada';
  return new Date(transaction.year, transaction.month - 1, transaction.day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function displayTransactionAmount(transaction: CalendarTransaction, showValues: boolean) {
  if (!showValues) return '••••';
  const amount = Number(transaction.amount ?? 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0, transaction.account?.currency ?? 'BRL');
}

export default function Calendar() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    currentDate,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    additionalData,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    fetchMonthTransactions,
    refreshAccounts,
  } = useCalendar();

  useCalendarPersistence(currentDate, goToDate);

  const refetchTransactions = useCallback(async () => {
    await fetchMonthTransactions(currentDate, selectedAccount);
    await refreshAccounts();
  }, [currentDate, selectedAccount, fetchMonthTransactions, refreshAccounts]);

  const {
    selectedDate,
    isModalOpen,
    handleDayClick,
    closeModal,
    dayTransactions,
  } = useCalendarModal(calendarDays, goToDate);

  const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const upcomingTransactions = useMemo(() => {
    const reference = dateKeyFromDate(selectedDate ?? currentDate);

    return calendarDays
      .flatMap((day) => day.transactions ?? [])
      .filter((transaction) => {
        const key = transactionDateKey(transaction);
        return transaction.status === 'PENDING' && key !== null && key > reference;
      })
      .sort((a, b) => (transactionDateKey(a) ?? 0) - (transactionDateKey(b) ?? 0))
      .slice(0, 6);
  }, [calendarDays, currentDate, selectedDate]);

  return (
    <ProtectedRoute>
      <PageHeader
        title="Calendário"
        description="Use o mês como contexto, escolha um dia e leia a linha do tempo sem transformar pendências em valores realizados."
      />

      <CalendarHeader
        isLoading={isLoading}
        selectedAccount={selectedAccount}
        accounts={accounts}
        onGoToToday={goToToday}
        onAccountChange={handleAccountChange}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.62fr)]">
        <section
          className="ds-panel overflow-hidden bg-[var(--surface)]"
          aria-labelledby="calendar-month-heading"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-3 sm:px-5 sm:py-4">
            <Button
              variant="ghost"
              size="sm"
              icon={<FaChevronLeft />}
              onClick={goToPreviousMonth}
              disabled={isLoading}
              aria-label="Mês anterior"
            />

            <div className="min-w-0 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">
                Contexto mensal
              </p>
              <h2
                id="calendar-month-heading"
                className="mt-0.5 truncate text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
              >
                {monthLabel}
              </h2>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<FaChevronRight />}
              onClick={goToNextMonth}
              disabled={isLoading}
              aria-label="Próximo mês"
            />
          </div>

          <MonthlySummary isLoading={isLoading} additionalData={additionalData} />
          <WeekDaysHeader />
          <CalendarGrid
            isLoading={isLoading}
            calendarDays={calendarDays}
            selectedDate={selectedDate}
            onDayClick={handleDayClick}
          />
        </section>

        <aside className="space-y-5" aria-label="Linha do tempo financeira">
          <DayTimeline
            selectedDate={selectedDate}
            transactions={dayTransactions}
            showValues={showValues}
          />
          <UpcomingCommitments
            transactions={upcomingTransactions}
            showValues={showValues}
            selectedDate={selectedDate}
          />
        </aside>
      </div>

      <DayModal
        isOpen={isModalOpen}
        onClose={closeModal}
        selectedDate={selectedDate ?? undefined}
        transactions={dayTransactions}
        isLoading={false}
        onRefreshCalendar={refetchTransactions}
      />
    </ProtectedRoute>
  );
}

function DayTimeline({
  selectedDate,
  transactions,
  showValues,
}: {
  selectedDate: Date | null;
  transactions: CalendarTransaction[];
  showValues: boolean;
}) {
  const completed = transactions.filter((transaction) => transaction.status === 'COMPLETED');
  const pending = transactions.filter((transaction) => transaction.status === 'PENDING');
  const cancelled = transactions.filter((transaction) => transaction.status === 'CANCELLED');

  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="calendar-timeline-title">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
        Dia selecionado
      </p>
      <h2 id="calendar-timeline-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
        {selectedDate
          ? selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })
          : 'Escolha um dia'}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        {selectedDate
          ? 'O detalhe continua separando realizado, pendente e cancelado. Fechar o modal mantém este dia selecionado.'
          : 'Selecione um dia no calendário para manter a linha do tempo visível enquanto você navega.'}
      </p>

      {!selectedDate ? (
        <p className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
          Nenhum dia selecionado.
        </p>
      ) : transactions.length === 0 ? (
        <p className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
          Nenhum lançamento neste dia.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <TimelineGroup title="Realizado" transactions={completed} showValues={showValues} tone="completed" />
          <TimelineGroup title="Pendente" transactions={pending} showValues={showValues} tone="pending" />
          <TimelineGroup title="Cancelado" transactions={cancelled} showValues={showValues} tone="cancelled" />
        </div>
      )}
    </section>
  );
}

function TimelineGroup({
  title,
  transactions,
  showValues,
  tone,
}: {
  title: string;
  transactions: CalendarTransaction[];
  showValues: boolean;
  tone: 'completed' | 'pending' | 'cancelled';
}) {
  if (transactions.length === 0) return null;

  const toneClass =
    tone === 'completed'
      ? 'bg-[var(--income)]'
      : tone === 'pending'
        ? 'bg-[var(--warning)]'
        : 'bg-[var(--text-subtle)]';

  return (
    <section aria-label={`${title}: ${transactions.length} lançamentos`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${toneClass}`} aria-hidden="true" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{title}</h3>
      </div>
      <ul className="mt-2 space-y-2">
        {transactions.map((transaction, index) => {
          const isIncome = transaction.type === 'INCOME';
          return (
            <li
              key={transaction.id ?? transaction._id ?? `${transaction.description}-${index}`}
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-[var(--foreground)]">
                    {transaction.description || 'Sem descrição'}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {transaction.account?.name || 'Conta'} · {transaction.category?.name || 'Categoria'}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-right text-base font-bold ${
                    isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'
                  }`}
                >
                  {isIncome ? '+' : '-'}{displayTransactionAmount(transaction, showValues)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function UpcomingCommitments({
  transactions,
  showValues,
  selectedDate,
}: {
  transactions: CalendarTransaction[];
  showValues: boolean;
  selectedDate: Date | null;
}) {
  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="calendar-upcoming-title">
      <h2 id="calendar-upcoming-title" className="text-lg font-semibold text-[var(--foreground)]">
        Próximos compromissos
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Pendências posteriores {selectedDate ? 'ao dia selecionado' : 'à data de referência'} dentro do mês carregado. Não entram no realizado.
      </p>

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma pendência futura neste recorte.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {transactions.map((transaction, index) => {
            const isIncome = transaction.type === 'INCOME';
            return (
              <li
                key={transaction.id ?? transaction._id ?? `${transaction.description}-${index}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-[var(--foreground)]">
                    {transaction.description || 'Sem descrição'}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {transactionDateLabel(transaction)} · {transaction.account?.name || 'Conta'}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-right text-sm font-bold ${
                    isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'
                  }`}
                >
                  {isIncome ? '+' : '-'}{displayTransactionAmount(transaction, showValues)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
