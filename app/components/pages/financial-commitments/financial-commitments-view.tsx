'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FaArrowDown, FaArrowUp, FaFlag } from 'react-icons/fa';

import {
  buildLede,
  filterItems,
  formatDate,
  groupByDay,
  overdueLabel,
  payableShare,
  signedAmount,
  splitCommitments,
  weekBuckets,
  type CommitmentFilter,
} from '@/app/components/pages/financial-commitments/financial-commitments-model';
import { Chip, MoneyText } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  FinancialCommitment,
  FinancialCommitmentDirection,
  FinancialCommitmentsData,
  FinancialCommitmentType,
} from '@/app/types/financial-commitment';

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';

const TYPE_LABEL: Record<FinancialCommitmentType, string> = {
  PENDING: 'Pendente',
  RECURRING: 'Recorrência',
  INSTALLMENT: 'Parcela',
  CARD_STATEMENT: 'Fatura',
  DEBT_INSTALLMENT: 'Dívida',
  GOAL_DEADLINE: 'Meta',
};

const FILTERS: Array<{ key: CommitmentFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'PAYABLE', label: 'A pagar' },
  { key: 'RECEIVABLE', label: 'A receber' },
  { key: 'MILESTONE', label: 'Marcos' },
];

const ICON_TONE: Record<FinancialCommitmentDirection, string> = {
  PAYABLE: 'bg-[var(--danger-subtle)] text-[var(--expense)]',
  RECEIVABLE: 'bg-[var(--primary-subtle)] text-[var(--income)]',
  MILESTONE: 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]',
};

export default function FinancialCommitmentsView({
  data,
  showValues,
}: {
  data: FinancialCommitmentsData;
  showValues: boolean;
}) {
  const [filter, setFilter] = useState<CommitmentFilter>('all');
  const money = (cents: number) => (showValues ? formatCurrency(cents, data.currency) : '••••');
  const { payable, receivable, milestoneCount, overdueCount } = data.totals;
  const { overdue, upcoming } = splitCommitments(data.items);
  const days = groupByDay(filterItems(upcoming, filter), data.asOf);
  const weeks = weekBuckets(data.items, data.asOf);
  const share = payableShare(data.totals);
  const hasAnything = data.items.length > 0 || payable.count > 0 || receivable.count > 0 || milestoneCount > 0;

  return (
    <div className="space-y-4">
      <section aria-labelledby="commitments-hero-label" className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
        <div className="grid gap-1.5">
          <p id="commitments-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">A pagar até {formatDate(data.through)}</p>
          <strong className="money break-words text-[2.125rem] font-semibold leading-none tracking-[-0.035em] text-[var(--expense)] sm:text-5xl">
            {money(payable.amount)}
          </strong>
          <p className="mt-2 max-w-[62ch] text-[15px] text-[var(--text-muted)]">
            <MoneyText>{buildLede(data, money)}</MoneyText>
          </p>
        </div>

        {hasAnything && (
          <div className="grid gap-3">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${share}% do movimento previsto é a pagar`}>
              <span className="h-full bg-[var(--expense)]" style={{ width: share + '%' }} />
              <span className="h-full bg-[var(--income)]" style={{ width: 100 - share + '%' }} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Legend dot="var(--expense)" label="A pagar" value={money(payable.amount)} detail={`${payable.count} compromisso${payable.count === 1 ? '' : 's'}`} />
              <Legend dot="var(--income)" label="A receber" value={money(receivable.amount)} detail={`${receivable.count} entrada${receivable.count === 1 ? '' : 's'}`} />
              <Legend dot="var(--orbit-primary)" label="Marcos" value={String(milestoneCount)} detail="sem valor monetário" />
            </div>
          </div>
        )}
      </section>

      {overdue.length > 0 && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--expense)] bg-[var(--danger-subtle)]" aria-labelledby="commitments-overdue-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1.5 pt-3.5 text-[var(--expense)] sm:px-5">
            <h2 id="commitments-overdue-heading" className="text-base font-bold">Vencidos · resolva primeiro</h2>
            <p className="text-xs font-semibold">{overdueCount} {overdueCount === 1 ? 'item ainda pendente' : 'itens ainda pendentes'}</p>
          </div>
          <ul>
            {overdue.map((item) => (
              <li key={item.id}>
                <CommitmentRow item={item} money={money} lateLabel={overdueLabel(item.date, data.asOf)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasAnything ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <section className={`${cardClassName} min-w-0 overflow-hidden`} aria-labelledby="commitments-timeline-heading">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
              <h2 id="commitments-timeline-heading" className="text-base font-bold">Linha do tempo</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
                {FILTERS.map((option) => (
                  <Chip key={option.key} selected={filter === option.key} onClick={() => setFilter(option.key)}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
            {days.length === 0 ? (
              <p className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5">Nenhum compromisso deste tipo no horizonte selecionado.</p>
            ) : (
              days.map((day) => (
                <div key={day.key} className="border-t border-[var(--border)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 bg-[var(--surface-raised)] px-4 pb-1 pt-3 sm:px-5">
                    <h3 className="text-[13px] font-bold">{day.label}</h3>
                    {day.net !== null && (
                      <span className="money text-xs text-[var(--text-muted)]">{day.net > 0 ? '+ ' : day.net < 0 ? '− ' : ''}{money(Math.abs(day.net))}</span>
                    )}
                  </div>
                  <ul>
                    {day.items.map((item) => (
                      <li key={item.id} className="border-t border-[var(--border)] first:border-t-0">
                        <CommitmentRow item={item} money={money} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          <section className={cardClassName} aria-labelledby="commitments-weeks-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
              <h2 id="commitments-weeks-heading" className="text-base font-bold">Quando pesa mais</h2>
              <p className="text-xs text-[var(--text-muted)]">por semana</p>
            </div>
            {weeks.length === 0 ? (
              <p className="px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">Sem valores a pagar ou a receber no horizonte.</p>
            ) : (
              <ul className="grid gap-3.5 px-4 pb-5 sm:px-5">
                {weeks.map((week) => (
                  <li key={week.key} className="grid gap-1.5">
                    <div className="flex flex-wrap justify-between gap-x-2 text-[13px]">
                      <span className="font-semibold">{week.label}</span>
                      <span className="money text-[var(--text-muted)]">
                        {week.payable > 0 ? `− ${money(week.payable)}` : ''}
                        {week.payable > 0 && week.receivable > 0 ? ' · ' : ''}
                        {week.receivable > 0 ? `+ ${money(week.receivable)}` : ''}
                      </span>
                    </div>
                    <div className="grid gap-[3px]" aria-hidden="true">
                      {week.payable > 0 && <span className="block h-2 rounded-full bg-[var(--expense)]" style={{ width: week.payableWidth + '%' }} />}
                      {week.receivable > 0 && <span className="block h-2 rounded-full bg-[var(--income)]" style={{ width: week.receivableWidth + '%' }} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)] sm:px-5">
              Valores só da moeda escolhida; moedas diferentes nunca são somadas. Itens sem valor definido aparecem com “—”.
            </p>
          </section>
        </div>
      ) : (
        <section className={`${cardClassName} grid justify-items-center gap-2.5 px-4 py-10 text-center`}>
          <h2 className="text-lg font-bold">Nenhum compromisso nos próximos {data.days} dias</h2>
          <p className="max-w-[48ch] text-sm text-[var(--text-muted)]">Que tal olhar mais adiante? Ou registre uma conta a pagar para ela aparecer aqui.</p>
          <Link href="/transacoes/nova" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 text-[13px] font-bold hover:bg-[var(--surface-hover)]">
            Nova transação
          </Link>
        </section>
      )}
    </div>
  );
}

function CommitmentRow({ item, money, lateLabel }: { item: FinancialCommitment; money: (cents: number) => string; lateLabel?: string }) {
  const signed = signedAmount(item);
  const Icon = item.direction === 'PAYABLE' ? FaArrowUp : item.direction === 'RECEIVABLE' ? FaArrowDown : FaFlag;
  return (
    <Link
      href={item.href}
      className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5"
    >
      <span className={`grid h-9 w-9 place-items-center rounded-[var(--radius-md)] text-sm ${ICON_TONE[item.direction]}`} aria-hidden="true">
        <Icon />
      </span>
      <span className="min-w-0">
        <strong className="block break-words text-sm">{item.title}</strong>
        <small className="block text-xs text-[var(--text-muted)]">
          {TYPE_LABEL[item.type]}
          {item.accountName ? ` · ${item.accountName}` : ''}
          {lateLabel ? ` · venceu em ${formatDate(item.date)}` : ''}
          {lateLabel && <span className="ml-1.5 rounded-full bg-[var(--danger-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--expense)]">{lateLabel}</span>}
        </small>
      </span>
      <strong className={`money text-sm font-semibold ${signed === null ? 'text-[var(--text-muted)]' : signed < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
        {signed === null ? '—' : `${signed < 0 ? '− ' : '+ '}${money(Math.abs(signed))}`}
      </strong>
    </Link>
  );
}

function Legend({ dot, label, value, detail }: { dot: string; label: string; value: string; detail: string }) {
  return (
    <div className="grid gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-4 py-3.5">
      <span className="text-[13px] font-semibold text-[var(--text-muted)]">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
        {label}
      </span>
      <span className="money break-words text-xl font-semibold">{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </div>
  );
}
