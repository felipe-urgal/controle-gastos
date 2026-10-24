'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { FaArrowDown, FaArrowLeft, FaArrowUp, FaExchangeAlt } from 'react-icons/fa';

import { appBarTitleClassName } from '@/app/components/base-pages/page-title';
import {
  accountShowActions,
  buildSparkline,
  filterMovements,
  groupMovementsByDay,
  investmentValueSourceLabel,
  type MovementFilter,
} from '@/app/components/pages/account/show/account-show-model';
import ReconciliationPanel from '@/app/components/pages/account/show/reconciliation-panel';
import { ChartCursor } from '@/app/components/charts/chart-cursor';
import { useChartScrub } from '@/app/components/charts/use-chart-scrub';
import { Button, Chip, IconLink, IconRenderer, ShowBelow } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { getAccountPrimaryValue } from '@/app/lib/accounts/account-presentation';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { getTransferCounterpartLabel, isTransferTransaction } from '@/app/lib/transactions/transaction-presentation';
import type { AccountModel, AccountRecentTransaction } from '@/app/types/account';

const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function todayLogical() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function Sparkline({ series, label, currency, showValues }: { series: number[]; label: string; currency: string; showValues: boolean }) {
  const shape = buildSparkline(series, 300, 64);
  const { activeIndex, handlers } = useChartScrub(shape?.points.map((point) => point.x) ?? [], 300);
  if (!shape) return null;

  const active = activeIndex === null ? null : shape.points[activeIndex];
  // A série cobre os últimos dias e termina hoje.
  const daysAgo = activeIndex === null ? 0 : series.length - 1 - activeIndex;
  const dayLabel = daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `Há ${daysAgo} dias`;

  return (
    <div>
      <p className="mb-1 min-h-5 text-xs text-[var(--text-muted)]" aria-live="polite">
        {activeIndex !== null ? (
          <>
            {dayLabel}: <strong className="money text-[var(--foreground)]">{showValues ? formatCurrency(series[activeIndex], currency) : '••••'}</strong>
          </>
        ) : (
          <>
            Saldo dos últimos {series.length} dias
            <span className="money">
              {' · '}
              {showValues ? `${formatCurrency(Math.min(...series), currency)} a ${formatCurrency(Math.max(...series), currency)}` : '••••'}
            </span>
          </>
        )}
      </p>
      <svg viewBox="0 0 300 64" className="h-16 w-full touch-pan-y" role="img" aria-label={label} {...handlers}>
        <path d={shape.area} fill="var(--account-color)" fillOpacity="0.12" />
        <path d={shape.line} fill="none" stroke="var(--account-color)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={shape.endX} cy={shape.endY} r="3.5" fill="var(--account-color)" />
        {active && <ChartCursor x={active.x} y={active.y} top={0} bottom={64} color="var(--account-color)" />}
      </svg>
    </div>
  );
}

function MovementRow({ transaction, account, showValues }: { transaction: AccountRecentTransaction; account: AccountModel; showValues: boolean }) {
  const isTransfer = isTransferTransaction(transaction);
  const isIncome = transaction.type === 'INCOME';
  const pending = transaction.status === 'PENDING';
  const reconciliation =
    transaction.status === 'COMPLETED' && transaction.reconciliationStatus === 'RECONCILED'
      ? 'Reconciliada'
      : transaction.status === 'COMPLETED' && transaction.reconciliationStatus === 'CLEARED'
        ? 'Conferida'
        : null;
  const tone = isTransfer
    ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
    : isIncome
      ? 'bg-[var(--surface-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  const amount = showValues ? formatCurrency(transaction.amount, account.currency) : '••••';

  return (
    <li>
      <Link
        href={`/transacoes/show/${transaction.id}`}
        aria-label={`Abrir transação ${transaction.description || 'sem descrição'}`}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5"
      >
        <span className={`grid h-9 w-9 place-items-center rounded-[var(--radius-md)] text-sm ${tone}`} aria-hidden="true">
          {isTransfer ? <FaExchangeAlt /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}
        </span>
        <span className="min-w-0">
          <span className="block break-words text-sm font-semibold text-[var(--foreground)]">
            {transaction.description || 'Sem descrição'}
            {pending && <span className="ml-2 align-middle text-xs font-semibold text-[var(--pending)]">pendente</span>}
            {reconciliation && <span className="ml-2 align-middle text-xs font-semibold text-[var(--orbit-primary)]">{reconciliation}</span>}
          </span>
          <span className="block truncate text-xs text-[var(--text-muted)]">
            {isTransfer ? getTransferCounterpartLabel(transaction) : transaction.category?.name ?? 'Sem categoria'}
          </span>
        </span>
        <span className={`money text-sm font-semibold ${isTransfer ? 'text-[var(--orbit-primary)]' : isIncome ? 'text-[var(--income)]' : 'text-[var(--foreground)]'}`}>
          {isIncome ? '+ ' : '− '}
          {amount}
        </span>
      </Link>
    </li>
  );
}

function Movements({ account, showValues }: { account: AccountModel; showValues: boolean }) {
  const [filter, setFilter] = useState<MovementFilter>('all');
  const transactions = account.transactions ?? [];
  const pendingCount = account.activity?.pendingCount ?? filterMovements(transactions, 'pending').length;
  const groups = groupMovementsByDay(filterMovements(transactions, filter), todayLogical());
  const filters: Array<{ key: MovementFilter; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'in', label: 'Entradas' },
    { key: 'out', label: 'Saídas' },
    { key: 'pending', label: pendingCount > 0 ? `Pendentes · ${pendingCount}` : 'Pendentes' },
  ];

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="account-movements-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
        <h2 id="account-movements-heading" className="text-base font-bold">Movimentações</h2>
        <Link
          href={`/transacoes?accountId=${encodeURIComponent(account.id)}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--orbit-primary)]"
        >
          Ver extrato completo
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5" role="group" aria-label="Filtro de movimentações">
        {filters.map((item) => (
          <Chip key={item.key} selected={filter === item.key} onClick={() => setFilter(item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5">
          {transactions.length === 0 ? 'Nenhuma movimentação nesta conta ainda.' : 'Nenhuma movimentação neste filtro.'}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="border-t border-[var(--border)]">
            <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)] sm:px-5">{group.label}</h3>
            <ul>
              {group.items.map((transaction) => (
                <MovementRow key={transaction.id} transaction={transaction} account={account} showValues={showValues} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

export default function AccountShowView({
  account,
  typeLabels,
  backUrl,
  editUrl,
  isDeleting,
  onDeleteRequest,
  onReconciliationChange,
}: {
  account: AccountModel;
  typeLabels: Record<string, string>;
  backUrl: string;
  editUrl: string;
  isDeleting: boolean;
  onDeleteRequest: () => void;
  onReconciliationChange?: () => Promise<void> | void;
}) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const money = (cents: number) => (showValues ? formatCurrency(cents, account.currency) : '••••');
  const signed = (cents: number) => `${cents > 0 ? '+ ' : cents < 0 ? '− ' : ''}${money(Math.abs(cents))}`;
  const isInvestment = account.type === 'INVESTMENT';
  const value = getAccountPrimaryValue(account);
  const activity = account.activity ?? null;
  const monthName = monthNames[new Date().getMonth()];
  const actions = accountShowActions(account);
  const series = activity?.balanceSeries ?? [];
  const sparkLabel = showValues && series.length > 1
    ? `Saldo dos últimos 30 dias: de ${formatCurrency(series[0], account.currency)} a ${formatCurrency(series[series.length - 1], account.currency)}`
    : 'Evolução do saldo nos últimos 30 dias';

  const stats = isInvestment
    ? [
        { label: 'Posições', value: String(account.investmentPositionCount ?? 0), tone: '' },
        { label: 'Base do valor', value: investmentValueSourceLabel(account.investmentValueSource), tone: '' },
        { label: 'Caixa na conta', value: money(account.balance), tone: '' },
      ]
    : [
        { label: `Entrou em ${monthName}`, value: activity ? `+ ${money(activity.monthIncome)}` : '—', tone: 'text-[var(--income)]' },
        { label: `Saiu em ${monthName}`, value: activity ? `− ${money(activity.monthExpense)}` : '—', tone: 'text-[var(--expense)]' },
        { label: 'A vir (pendentes)', value: activity ? (activity.pendingCount === 0 ? money(0) : signed(activity.pendingNet)) : '—', tone: '' },
      ];
  // Com pendentes, mostra onde o saldo chega se todas forem concluídas (não altera o saldo realizado).
  const projected = !isInvestment && activity && activity.pendingCount > 0 ? account.balance + activity.pendingNet : null;
  const hasHistory = account.hasFinancialHistory === true;

  return (
    <div className={`w-full space-y-4 pb-5 transition-opacity duration-150 ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}>
      <ShowBelow breakpoint="lg">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2">
          <IconLink label="Voltar para contas" href={backUrl} icon={<FaArrowLeft />} className="rounded-full text-lg text-[var(--foreground)]" />
          <h1 className={`text-center ${appBarTitleClassName}`}>{account.name}</h1>
          <Button as="a" href={editUrl} variant="outline" size="xs">Editar conta</Button>
        </header>
      </ShowBelow>

      <section
        aria-label="Resumo da conta"
        className="grid gap-5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--account-color)_38%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--account-color)_15%,var(--surface)),var(--surface)_70%)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
        style={{ ['--account-color' as string]: account.color || 'var(--orbit-primary)' }}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] text-white" style={{ backgroundColor: account.color || 'var(--text-muted)' }} aria-hidden="true">
            <IconRenderer iconName={account.icon || 'wallet'} size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold tracking-tight">{account.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {typeLabels[account.type]} · {account.currency}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${account.isActive ? 'bg-[var(--surface-subtle)] text-[var(--income)]' : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'}`}>
                {account.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </p>
          </div>
        </div>

        <div className="grid items-end gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <strong className={`money block break-words text-[2.125rem] font-semibold leading-none tracking-[-0.035em] sm:text-5xl ${value < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
              {money(value)}
            </strong>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {isInvestment
                ? account.investmentValueSource === 'MARKET'
                  ? 'Valor das posições, com a última cotação disponível.'
                  : 'Valor das posições; sem cotação, usa o custo investido.'
                : 'Saldo hoje, só com o que já foi concluído.'}
            </p>
            {projected !== null && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Com os pendentes concluídos: <strong className={`money ${projected < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>{money(projected)}</strong>
              </p>
            )}
            {!showValues && <p className="mt-1 text-sm text-[var(--text-subtle)]">Valores ocultos pelas suas preferências.</p>}
          </div>
          {series.length > 1 && <Sparkline series={series} label={sparkLabel} currency={account.currency} showValues={showValues} />}
        </div>

        <dl className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 sm:px-3">
              <dt className="text-xs text-[var(--text-muted)] sm:text-sm">{stat.label}</dt>
              <dd className={`money break-words text-xs font-semibold sm:text-base ${stat.tone}`}>{stat.value}</dd>
            </div>
          ))}
        </dl>

        <nav aria-label="Ações da conta" className="grid grid-cols-3 gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
              as="a"
              href={action.href}
              variant={action.primary ? 'accent' : 'outline'}
              size="xs"
              className="w-full px-1 text-center leading-tight"
            >
              {action.label}
            </Button>
          ))}
        </nav>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Movements account={account} showValues={showValues} />

        <div className="space-y-4">
          <div id="account-reconciliation">
            <ReconciliationPanel account={account} onChanged={onReconciliationChange} />
          </div>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="account-about-heading">
            <h2 id="account-about-heading" className="px-4 pb-2 pt-4 text-base font-bold sm:px-5">Sobre a conta</h2>
            <dl className="grid gap-2 px-4 pb-4 text-sm sm:px-5">
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Criada em</dt><dd>{format(new Date(account.createdAt), 'dd/MM/yyyy')}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Última atualização</dt><dd>{format(new Date(account.updatedAt), 'dd/MM/yyyy')}</dd></div>
              {account.description && <div className="flex justify-between gap-3"><dt className="text-[var(--text-muted)]">Descrição</dt><dd className="text-right">{account.description}</dd></div>}
            </dl>
            <details className="group border-t border-[var(--border)]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
                Zona de risco
              </summary>
              <div className="grid gap-3 px-4 pb-4 text-sm text-[var(--text-muted)] sm:px-5">
                <p>
                  {hasHistory
                    ? 'Esta conta tem histórico financeiro, então não pode ser excluída. Inative para guardar o histórico e tirá-la dos lançamentos novos.'
                    : 'Inativar guarda o histórico e tira a conta dos lançamentos novos. Esta conta ainda não tem movimentações e pode ser excluída.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button as="a" href={editUrl} variant="outline" size="sm">Inativar conta</Button>
                  <Button type="button" variant="danger" size="sm" onClick={onDeleteRequest} disabled={hasHistory}>Excluir conta</Button>
                </div>
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
