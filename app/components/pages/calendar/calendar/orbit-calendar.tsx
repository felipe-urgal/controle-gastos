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
import {
  getTransactionContextLabel,
  getTransferDirectionLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';
import type { CalendarDay, Transaction as CalendarTransaction } from '@/app/types/calendar';
import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

const compactWeekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const orbitActionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

function dateKey(date: Date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function transactionDateKey(transaction: CalendarTransaction) {
  if (!transaction.year || !transaction.month || !transaction.day) return null;
  return transaction.year * 10000 + transaction.month * 100 + transaction.day;
}

function transactionDate(transaction: CalendarTransaction) {
  if (!transaction.year || !transaction.month || !transaction.day) return null;
  return new Date(transaction.year, transaction.month - 1, transaction.day);
}

function transactionDateLabel(transaction: CalendarTransaction) {
  const date = transactionDate(transaction);
  if (!date) return 'Data não informada';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function displayAmount(transaction: CalendarTransaction, showValues: boolean) {
  if (!showValues) return '••••';
  const raw = Number(transaction.amount ?? 0);
  const amount = Number.isFinite(raw) ? raw : 0;
  return formatCurrency(amount, transaction.account?.currency ?? 'BRL');
}

function signedAmount(transaction: CalendarTransaction, showValues: boolean) {
  if (!showValues) return '••••';
  return `${transaction.type === 'INCOME' ? '+' : '-'}${displayAmount(transaction, true)}`;
}

function transactionsForDate(calendarDays: CalendarDay[], date: Date) {
  const target = dateKey(date);
  return calendarDays.find((day) => day.date && dateKey(day.date) === target)?.transactions ?? [];
}

function realizedTotals(transactions: CalendarTransaction[]) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.status !== 'COMPLETED') continue;
    const raw = Number(transaction.amount ?? 0);
    if (!Number.isFinite(raw)) continue;
    const currency = transaction.account?.currency ?? 'BRL';
    const signed = transaction.type === 'INCOME' ? raw : -raw;
    totals.set(currency, (totals.get(currency) ?? 0) + signed);
  }
  return [...totals.entries()];
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
    additionalData,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
  } = useCalendar();

  useCalendarPersistence(currentDate, goToDate);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<CalendarTransaction | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);

  const displayDate = selectedDate ?? currentDate;
  const dayTransactions = useMemo(
    () => transactionsForDate(calendarDays, displayDate),
    [calendarDays, displayDate],
  );

  const upcomingTransactions = useMemo(() => {
    const reference = dateKey(displayDate);
    return calendarDays
      .flatMap((day) => day.transactions ?? [])
      .filter((transaction) => {
        const key = transactionDateKey(transaction);
        return transaction.status === 'PENDING' && key !== null && key > reference;
      })
      .sort((a, b) => (transactionDateKey(a) ?? 0) - (transactionDateKey(b) ?? 0))
      .slice(0, 6);
  }, [calendarDays, displayDate]);

  useEffect(() => {
    if (!selectedTransaction) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => detailCloseRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setSelectedTransaction(null);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [selectedTransaction]);

  const selectDay = useCallback(
    (day: CalendarDay) => {
      const date = day.date;
      if (!date) return;
      setSelectedDate(date);
      if (!day.isCurrentMonth) goToDate(date);
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
  const today = () => {
    setSelectedDate(null);
    goToToday();
  };

  const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
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
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">Calendário</h1>
          <p className="mt-1 hidden text-sm text-[var(--text-muted)] sm:block">
            Compromissos, vencimentos e fluxo de caixa em uma única visão temporal.
          </p>
        </div>

        <div className={`flex flex-wrap gap-2 ${orbitActionTokens}`}>
          <Button variant="outline" size="sm" icon={<FaChevronLeft />} onClick={previousMonth} disabled={isLoading} aria-label="Mês anterior" />
          <Button variant="outline" size="sm" onClick={today} disabled={isLoading}>{monthLabel}</Button>
          <Button variant="outline" size="sm" icon={<FaChevronRight />} onClick={nextMonth} disabled={isLoading} aria-label="Próximo mês" />
          <div className="hidden w-[180px] sm:block">
            <Select ariaLabel="Filtrar por conta" options={accountOptions} value={selectedAccount} onChange={handleAccountChange} disabled={isLoading} />
          </div>
          <Link
            href="/transacoes/nova"
            className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/40 bg-[var(--orbit-primary-subtle)] px-3 text-sm font-bold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaPlus aria-hidden="true" /><span className="hidden sm:inline">Novo compromisso</span><span className="sm:hidden">Novo</span>
          </Link>
        </div>
      </header>

      <CalendarSummary isLoading={isLoading} additionalData={additionalData} upcomingCount={upcomingTransactions.length} showValues={showValues} />

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
          transactions={dayTransactions}
          showValues={showValues}
          onOpen={setSelectedTransaction}
        />
        <UpcomingAgenda
          transactions={upcomingTransactions}
          showValues={showValues}
          onOpen={setSelectedTransaction}
          className="min-[851px]:col-span-2 min-[1051px]:col-span-1"
        />
      </section>

      {selectedTransaction && (
        <TransactionDetailDrawer transaction={selectedTransaction} showValues={showValues} closeRef={detailCloseRef} onClose={() => setSelectedTransaction(null)} />
      )}
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
            <p className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs"><Icon aria-hidden="true" /> {metric.label}</p>
            {isLoading ? (
              <div className="mt-2 h-6 animate-pulse rounded bg-[var(--skeleton)]" />
            ) : additionalData.length === 0 ? (
              <strong className="mt-2 block text-lg sm:text-[23px]">—</strong>
            ) : (
              <div className="mt-2 space-y-0.5">
                {additionalData.map((summary) => {
                  const value = summary[metric.key];
                  const tone = metric.key === 'income'
                    ? 'text-[var(--income)]'
                    : metric.key === 'expense' || (metric.key === 'balance' && value < 0)
                      ? 'text-[var(--expense)]'
                      : 'text-[var(--foreground)]';
                  return <strong key={summary.currency} className={`block truncate text-[15px] font-bold sm:text-[23px] ${tone}`}>{showValues ? formatCurrency(value, summary.currency) : '••••'}</strong>;
                })}
              </div>
            )}
          </article>
        );
      })}
      <article className="col-span-3 hidden rounded-[15px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:block sm:p-4 lg:col-span-1">
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]"><FaCalendarCheck aria-hidden="true" /> Compromissos próximos</p>
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
  return (
    <aside className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${orbitActionTokens}`} aria-label="Navegação mensal">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onPrevious} disabled={isLoading} aria-label="Mês anterior" className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"><FaChevronLeft aria-hidden="true" /></button>
        <h2 className="truncate text-sm font-bold text-[var(--foreground)]">{monthLabel}</h2>
        <button type="button" onClick={onNext} disabled={isLoading} aria-label="Próximo mês" className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"><FaChevronRight aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {compactWeekDays.map((day, index) => <span key={`${day}-${index}`} className="py-1 text-center text-[10px] font-semibold text-[var(--text-muted)]">{day}</span>)}
      </div>
      <CalendarGrid compact showValues={showValues} isLoading={isLoading} calendarDays={calendarDays} selectedDate={selectedDate} onDayClick={onDayClick} />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-muted)]">
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--income)]" />Receita</span>
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--expense)]" />Despesa</span>
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rotate-45 bg-[var(--orbit-primary)]" />Transferência</span>
        <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />Pendente</span>
      </div>
    </aside>
  );
}

function FinancialTimeline({
  selectedDate,
  transactions,
  showValues,
  onOpen,
}: {
  selectedDate: Date;
  transactions: CalendarTransaction[];
  showValues: boolean;
  onOpen: (transaction: CalendarTransaction) => void;
}) {
  const totals = realizedTotals(transactions);
  return (
    <article className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 ${orbitActionTokens}`} aria-labelledby="calendar-timeline-title">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-muted)]">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          <h2 id="calendar-timeline-title" className="mt-1 text-xl font-bold text-[var(--foreground)]">{selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Saldo realizado do dia</p>
          {totals.length === 0 ? <strong className="mt-1 block text-sm">—</strong> : totals.map(([currency, value]) => (
            <strong key={currency} className={`mt-1 block text-sm font-bold ${value < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>{showValues ? `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatCurrency(Math.abs(value), currency)}` : '••••'}</strong>
          ))}
        </div>
      </header>
      {transactions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">Nenhum lançamento neste dia.</p>
      ) : (
        <div className="relative ml-1 pl-[18px] sm:pl-6">
          <span className="absolute bottom-1 left-[5px] top-1 w-px bg-[var(--border-strong)] sm:left-2" aria-hidden="true" />
          {transactions.map((transaction, index) => <TimelineEvent key={transaction.id ?? transaction._id ?? `${transaction.description}-${index}`} transaction={transaction} showValues={showValues} onOpen={onOpen} />)}
        </div>
      )}
    </article>
  );
}

function TimelineEvent({ transaction, showValues, onOpen }: { transaction: CalendarTransaction; showValues: boolean; onOpen: (transaction: CalendarTransaction) => void }) {
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = isTransferTransaction(transaction);
  const isPending = transaction.status === 'PENDING';
  const isCancelled = transaction.status === 'CANCELLED';
  const marker = isCancelled
    ? 'bg-[var(--text-subtle)]'
    : isTransfer
      ? 'bg-[var(--orbit-primary)]'
      : isPending
        ? 'bg-[var(--warning)]'
        : isIncome
          ? 'bg-[var(--income)]'
          : 'bg-[var(--expense)]';
  const statusLabel = isCancelled ? 'Cancelado' : isPending ? 'Pendente' : 'Realizado';
  const iconTone = isTransfer
    ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
    : isIncome
      ? 'bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]'
      : isPending
        ? 'bg-[var(--warning-subtle)] text-[var(--pending)]'
        : 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  const amountTone = isTransfer
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';

  return (
    <button type="button" onClick={() => onOpen(transaction)} className="relative mb-2.5 grid w-full grid-cols-[42px_34px_minmax(0,1fr)] items-center gap-2 rounded-[13px] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:grid-cols-[60px_42px_minmax(0,1fr)_auto] sm:gap-2.5 sm:p-3">
      <span className={`absolute left-[-17px] top-[21px] h-[9px] w-[9px] rounded-full border-2 border-[var(--surface)] sm:left-[-21px] sm:top-[23px] ${marker}`} aria-hidden="true" />
      <span className="text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">{statusLabel}</span>
      <span className={`grid h-[34px] w-[34px] place-items-center rounded-[11px] sm:h-[38px] sm:w-[38px] ${iconTone}`} aria-hidden="true">{isTransfer ? <FaExchangeAlt /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}</span>
      <div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p><p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{getTransactionContextLabel(transaction)}</p></div>
      <strong className={`col-start-3 justify-self-end whitespace-nowrap text-sm sm:col-start-auto ${amountTone}`}>{signedAmount(transaction, showValues)}</strong>
    </button>
  );
}

function UpcomingAgenda({ transactions, showValues, onOpen, className = '' }: { transactions: CalendarTransaction[]; showValues: boolean; onOpen: (transaction: CalendarTransaction) => void; className?: string }) {
  return (
    <aside className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${orbitActionTokens} ${className}`} aria-labelledby="calendar-upcoming-title">
      <header className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Agenda</p><h2 id="calendar-upcoming-title" className="mt-1 text-xl font-bold text-[var(--foreground)]">Próximos compromissos</h2></header>
      {transactions.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Nenhuma pendência futura neste recorte.</p> : (
        <div className="grid gap-2">
          {transactions.map((transaction, index) => {
            const date = transactionDate(transaction);
            const isTransfer = isTransferTransaction(transaction);
            const amountTone = isTransfer
              ? 'text-[var(--orbit-primary)]'
              : transaction.type === 'INCOME'
                ? 'text-[var(--income)]'
                : 'text-[var(--expense)]';
            return (
              <button key={transaction.id ?? transaction._id ?? `${transaction.description}-${index}`} type="button" onClick={() => onOpen(transaction)} className="grid grid-cols-[54px_minmax(0,1fr)_auto] gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
                <div className="text-center"><strong className="block text-base text-[var(--foreground)]">{date ? String(date.getDate()).padStart(2, '0') : '—'}</strong><small className="text-[10px] uppercase text-[var(--text-muted)]">{date ? date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : ''}</small></div>
                <div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p><p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{isTransfer ? getTransactionContextLabel(transaction) : transaction.account?.name || transactionDateLabel(transaction)}</p></div>
                <strong className={`self-center whitespace-nowrap text-xs sm:text-sm ${amountTone}`}>{signedAmount(transaction, showValues)}</strong>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function TransactionDetailDrawer({
  transaction,
  showValues,
  closeRef,
  onClose,
}: {
  transaction: CalendarTransaction;
  showValues: boolean;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const date = transactionDate(transaction);
  const isTransfer = isTransferTransaction(transaction);
  const kind = isTransfer
    ? getTransferDirectionLabel(transaction) ?? 'Transferência'
    : transaction.type === 'INCOME'
      ? 'Receita'
      : transaction.status === 'PENDING'
        ? 'Compromisso'
        : 'Despesa';
  const status = transaction.status === 'COMPLETED' ? 'Concluída' : transaction.status === 'PENDING' ? 'Pendente' : 'Cancelada';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="calendar-detail-title" className={`w-full max-w-[520px] rounded-t-[18px] border border-[var(--border-strong)] bg-[var(--background)] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[var(--shadow-surface)] ${orbitActionTokens}`}>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-xs text-[var(--text-muted)]">{kind}</p><h2 id="calendar-detail-title" className="mt-1 break-words text-xl font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar detalhe" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaTimes aria-hidden="true" /></button>
        </header>
        <dl className="mt-4 grid grid-cols-2 gap-2.5">
          <DetailBox label="Valor" value={signedAmount(transaction, showValues)} />
          <DetailBox label="Data" value={date ? date.toLocaleDateString('pt-BR') : 'Não informada'} />
          <DetailBox label="Conta" value={transaction.account?.name || 'Não informada'} />
          {isTransfer && <DetailBox label="Contraparte" value={transaction.counterpartAccount?.name || 'Contraparte indisponível'} />}
          <DetailBox label="Status" value={status} />
        </dl>
        <p className="mt-3 text-xs text-[var(--text-muted)]">{isTransfer ? 'Transferências são exibidas como movimentação interna e não compõem receitas ou despesas do calendário.' : 'Horário não é exibido porque o contrato atual da transação não fornece esse dado.'}</p>
        {transaction.id && <Link href={`/transacoes/show/${transaction.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Abrir transação</Link>}
      </section>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3"><dt className="text-xs text-[var(--text-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-[var(--foreground)]">{value}</dd></div>;
}
