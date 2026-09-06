'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarCheck,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaWallet,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { CalendarGrid, DayModal } from '@/app/components/pages/calendar';
import { Button, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useCalendar } from '@/app/hooks/calendar/use-calendar';
import { useCalendarModal } from '@/app/hooks/calendar/use-calendar-modal';
import { useCalendarPersistence } from '@/app/hooks/calendar/use-calendar-persistence';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthNames } from '@/app/lib/date/constants';
import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';
import type { CalendarDay, Transaction as CalendarTransaction } from '@/app/types/calendar';

const compactWeekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

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

function signedAmount(transaction: CalendarTransaction, showValues: boolean) {
  const amount = displayTransactionAmount(transaction, showValues);
  if (!showValues) return amount;
  return `${transaction.type === 'INCOME' ? '+' : '-'}${amount}`;
}

function getTransactionsForDate(calendarDays: CalendarDay[], date: Date) {
  const key = dateKeyFromDate(date);
  return (
    calendarDays.find((day) => day.date && dateKeyFromDate(day.date) === key)?.transactions ?? []
  );
}

function realizedDayTotals(transactions: CalendarTransaction[]) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.status !== 'COMPLETED') continue;
    const amount = Number(transaction.amount ?? 0);
    if (!Number.isFinite(amount)) continue;
    const currency = transaction.account?.currency ?? 'BRL';
    const signed = transaction.type === 'INCOME' ? amount : -amount;
    totals.set(currency, (totals.get(currency) ?? 0) + signed);
  }

  return Array.from(totals.entries());
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

  const displayDate = selectedDate ?? currentDate;
  const displayDayTransactions = selectedDate
    ? dayTransactions
    : getTransactionsForDate(calendarDays, currentDate);
  const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const upcomingTransactions = useMemo(() => {
    const reference = dateKeyFromDate(displayDate);

    return calendarDays
      .flatMap((day) => day.transactions ?? [])
      .filter((transaction) => {
        const key = transactionDateKey(transaction);
        return transaction.status === 'PENDING' && key !== null && key > reference;
      })
      .sort((a, b) => (transactionDateKey(a) ?? 0) - (transactionDateKey(b) ?? 0))
      .slice(0, 6);
  }, [calendarDays, displayDate]);

  const accountOptions = [
    { value: 'all', label: 'Todas as contas' },
    ...accounts.map((account) => ({ value: account.id, label: account.name || 'Conta' })),
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
            Compromissos, vencimentos e fluxo de caixa em uma única visão temporal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FaChevronLeft />}
            onClick={goToPreviousMonth}
            disabled={isLoading}
            aria-label="Mês anterior"
          />
          <Button variant="outline" size="sm" onClick={goToToday} disabled={isLoading}>
            {monthLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FaChevronRight />}
            onClick={goToNextMonth}
            disabled={isLoading}
            aria-label="Próximo mês"
          />
          <div className="hidden w-[180px] sm:block">
            <Select
              ariaLabel="Filtrar por conta"
              options={accountOptions}
              value={selectedAccount}
              onChange={handleAccountChange}
              disabled={isLoading}
            />
          </div>
          <Link
            href="/transacoes/nova"
            className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/40 bg-[var(--primary-subtle)] px-3 text-sm font-bold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaPlus aria-hidden="true" />
            <span className="hidden sm:inline">Novo compromisso</span>
            <span className="sm:hidden">Novo</span>
          </Link>
        </div>
      </header>

      <CalendarSummary
        isLoading={isLoading}
        additionalData={additionalData}
        upcomingCount={upcomingTransactions.length}
        showValues={showValues}
      />

      <section className="grid items-start gap-3.5 min-[851px]:grid-cols-[250px_minmax(0,1fr)] min-[1051px]:grid-cols-[280px_minmax(420px,1fr)_360px]">
        <MonthNavigator
          monthLabel={monthLabel}
          calendarDays={calendarDays}
          selectedDate={displayDate}
          isLoading={isLoading}
          showValues={showValues}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onDayClick={handleDayClick}
        />

        <FinancialTimeline
          selectedDate={displayDate}
          transactions={displayDayTransactions}
          showValues={showValues}
        />

        <UpcomingAgenda
          transactions={upcomingTransactions}
          showValues={showValues}
          className="min-[851px]:col-span-2 min-[1051px]:col-span-1"
        />
      </section>

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

function CalendarSummary({
  isLoading,
  additionalData,
  upcomingCount,
  showValues,
}: {
  isLoading: boolean;
  additionalData: CurrencyFinancialSummary[];
  upcomingCount: number;
  showValues: boolean;
}) {
  const metrics = [
    { key: 'balance' as const, label: 'Saldo do mês', icon: FaWallet },
    { key: 'income' as const, label: 'Receitas', icon: FaArrowUp },
    { key: 'expense' as const, label: 'Despesas', icon: FaArrowDown },
  ];

  return (
    <section className="my-[22px] grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-3" aria-label="Resumo do calendário">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.key} className="rounded-[15px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
            <p className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">
              <Icon aria-hidden="true" /> {metric.label}
            </p>
            {isLoading ? (
              <div className="mt-2 h-6 animate-pulse rounded bg-[var(--skeleton)]" />
            ) : additionalData.length === 0 ? (
              <strong className="mt-2 block text-lg sm:text-[23px]">—</strong>
            ) : (
              <div className="mt-2 space-y-0.5">
                {additionalData.map((summary) => {
                  const value = summary[metric.key];
                  const tone =
                    metric.key === 'income'
                      ? 'text-[var(--income)]'
                      : metric.key === 'expense' || (metric.key === 'balance' && value < 0)
                        ? 'text-[var(--expense)]'
                        : 'text-[var(--foreground)]';
                  return (
                    <strong key={summary.currency} className={`block truncate text-[15px] font-bold sm:text-[23px] ${tone}`}>
                      {showValues ? formatCurrency(value, summary.currency) : '••••'}
                    </strong>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}

      <article className="col-span-3 hidden rounded-[15px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:block sm:p-4 lg:col-span-1">
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          <FaCalendarCheck aria-hidden="true" /> Compromissos próximos
        </p>
        <strong className="mt-2 block text-[23px] font-bold text-[var(--foreground)]">{isLoading ? '—' : `${upcomingCount} itens`}</strong>
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
  const maxCount = Math.max(1, ...calendarDays.map((day) => day.transactions?.length ?? 0));

  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Navegação mensal">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isLoading}
          aria-label="Mês anterior"
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
        >
          <FaChevronLeft aria-hidden="true" />
        </button>
        <h2 className="truncate text-sm font-bold text-[var(--foreground)]">{monthLabel}</h2>
        <button
          type="button"
          onClick={onNext}
          disabled={isLoading}
          aria-label="Próximo mês"
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
        >
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {compactWeekDays.map((day, index) => (
          <span key={`${day}-${index}`} className="py-1 text-center text-[10px] font-semibold text-[var(--text-muted)]">{day}</span>
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
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--orbit-primary)]" />Pendente</span>
      </div>

      <div className="mt-[18px] hidden border-t border-[var(--border)] pt-3 min-[1051px]:block" aria-label="Atividade do mês por quantidade de lançamentos">
        <p className="text-xs text-[var(--text-muted)]">Visão rápida do mês</p>
        <div className="mt-2 flex h-[120px] items-end gap-1" aria-hidden="true">
          {calendarDays.map((day, index) => {
            const count = day.transactions?.length ?? 0;
            const height = count === 0 ? 8 : Math.max(12, (count / maxCount) * 100);
            const hasIncome = day.transactions?.some((transaction) => transaction.type === 'INCOME');
            const hasExpense = day.transactions?.some((transaction) => transaction.type === 'EXPENSE');
            return (
              <span
                key={day.date?.toISOString() ?? index}
                className={`min-w-[2px] flex-1 rounded-t ${
                  hasIncome && !hasExpense
                    ? 'bg-[var(--income)]'
                    : hasExpense && !hasIncome
                      ? 'bg-[var(--expense)]'
                      : 'bg-[var(--border-strong)]'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function FinancialTimeline({
  selectedDate,
  transactions,
  showValues,
}: {
  selectedDate: Date;
  transactions: CalendarTransaction[];
  showValues: boolean;
}) {
  const totals = realizedDayTotals(transactions);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5" aria-labelledby="calendar-timeline-title">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-muted)]">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <h2 id="calendar-timeline-title" className="mt-1 text-xl font-bold text-[var(--foreground)]">
            {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Saldo realizado do dia</p>
          {totals.length === 0 ? (
            <strong className="mt-1 block text-sm text-[var(--foreground)]">—</strong>
          ) : (
            totals.map(([currency, value]) => (
              <strong key={currency} className={`mt-1 block text-sm font-bold ${value < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
                {showValues ? `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatCurrency(Math.abs(value), currency)}` : '••••'}
              </strong>
            ))
          )}
        </div>
      </header>

      {transactions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">Nenhum lançamento neste dia.</p>
      ) : (
        <div className="relative ml-1 pl-[18px] sm:pl-6">
          <span className="absolute bottom-1 left-[5px] top-1 w-px bg-[var(--border-strong)] sm:left-2" aria-hidden="true" />
          {transactions.map((transaction, index) => (
            <TimelineEvent key={transaction.id ?? transaction._id ?? `${transaction.description}-${index}`} transaction={transaction} showValues={showValues} />
          ))}
        </div>
      )}
    </article>
  );
}

function TimelineEvent({ transaction, showValues }: { transaction: CalendarTransaction; showValues: boolean }) {
  const isIncome = transaction.type === 'INCOME';
  const isPending = transaction.status === 'PENDING';
  const isCancelled = transaction.status === 'CANCELLED';
  const marker = isCancelled
    ? 'bg-[var(--text-subtle)]'
    : isPending
      ? 'bg-[var(--orbit-primary)]'
      : isIncome
        ? 'bg-[var(--income)]'
        : 'bg-[var(--expense)]';
  const statusLabel = isCancelled ? 'Cancelado' : isPending ? 'Pendente' : 'Realizado';

  return (
    <div className="relative mb-2.5 grid grid-cols-[42px_34px_minmax(0,1fr)] items-center gap-2 rounded-[13px] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 sm:grid-cols-[60px_42px_minmax(0,1fr)_auto] sm:gap-2.5 sm:p-3">
      <span className={`absolute left-[-17px] top-[21px] h-[9px] w-[9px] rounded-full border-2 border-[var(--surface)] sm:left-[-21px] sm:top-[23px] ${marker}`} aria-hidden="true" />
      <span className="text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">{statusLabel}</span>
      <span className={`grid h-[34px] w-[34px] place-items-center rounded-[11px] sm:h-[38px] sm:w-[38px] ${isIncome ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : isPending ? 'bg-[var(--primary-subtle)] text-[var(--orbit-primary)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`} aria-hidden="true">
        {isIncome ? <FaArrowUp /> : <FaArrowDown />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{transaction.category?.name || 'Categoria'} · {transaction.account?.name || 'Conta'}</p>
      </div>
      <strong className={`col-start-3 justify-self-end whitespace-nowrap text-sm sm:col-start-auto ${isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
        {signedAmount(transaction, showValues)}
      </strong>
    </div>
  );
}

function UpcomingAgenda({
  transactions,
  showValues,
  className = '',
}: {
  transactions: CalendarTransaction[];
  showValues: boolean;
  className?: string;
}) {
  return (
    <aside className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`} aria-labelledby="calendar-upcoming-title">
      <header className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Agenda</p>
          <h2 id="calendar-upcoming-title" className="mt-1 text-xl font-bold text-[var(--foreground)]">Próximos compromissos</h2>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">Todos</span>
      </header>

      {transactions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nenhuma pendência futura neste recorte.</p>
      ) : (
        <div className="grid gap-2">
          {transactions.map((transaction, index) => {
            const isIncome = transaction.type === 'INCOME';
            const date = transaction.year && transaction.month && transaction.day
              ? new Date(transaction.year, transaction.month - 1, transaction.day)
              : null;
            return (
              <div key={transaction.id ?? transaction._id ?? `${transaction.description}-${index}`} className="grid grid-cols-[54px_minmax(0,1fr)_auto] gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5">
                <div className="text-center">
                  <strong className="block text-base text-[var(--foreground)]">{date ? String(date.getDate()).padStart(2, '0') : '—'}</strong>
                  <small className="text-[10px] uppercase text-[var(--text-muted)]">{date ? date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : ''}</small>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{transaction.account?.name || transactionDateLabel(transaction)}</p>
                </div>
                <strong className={`self-center whitespace-nowrap text-xs sm:text-sm ${isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                  {signedAmount(transaction, showValues)}
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
