'use client';

import Link from 'next/link';
import { FaCheckCircle, FaChevronRight, FaExclamationCircle } from 'react-icons/fa';

import { accountAttentionMessage, type AttentionTone } from '@/app/components/pages/account/index/account-attention-messages';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { AccountListSummary } from '@/app/types/account';

type CurrencyTotals = {
  currency: string;
  available: number;
  invested: number;
  statements: number;
};

/** Um bloco por moeda, sem converter: BRL primeiro, depois as demais em ordem alfabética. */
export function buildCurrencyTotals(summary: AccountListSummary): CurrencyTotals[] {
  const byCurrency = new Map<string, CurrencyTotals>();
  const entry = (currency: string) => {
    const existing = byCurrency.get(currency);
    if (existing) return existing;
    const created = { currency, available: 0, invested: 0, statements: 0 };
    byCurrency.set(currency, created);
    return created;
  };

  for (const item of summary.bankBalancesByCurrency) entry(item.currency).available += item.value;
  for (const item of summary.investmentBalancesByCurrency) entry(item.currency).invested += item.value;
  for (const item of summary.openStatementsByCurrency ?? []) entry(item.currency).statements += item.value;

  return [...byCurrency.values()].sort(
    (left, right) =>
      Number(right.currency === 'BRL') - Number(left.currency === 'BRL') || left.currency.localeCompare(right.currency),
  );
}

const toneStyles: Record<AttentionTone, string> = {
  urgent: 'bg-[var(--danger-subtle)] text-[var(--expense)]',
  warning: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  info: 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]',
};

function CurrencyHero({
  totals,
  showValues,
  showCurrency,
}: {
  totals: CurrencyTotals;
  showValues: boolean;
  showCurrency: boolean;
}) {
  const money = (cents: number) => (showValues ? formatCurrency(cents, totals.currency) : '••••');
  const rows = [
    { label: 'Correntes', value: money(totals.available), color: 'var(--income)' },
    { label: 'Investido', value: money(totals.invested), color: 'var(--orbit-primary)' },
    ...(totals.statements > 0
      ? [
          { label: 'Faturas abertas', value: `− ${money(totals.statements)}`, color: 'var(--warning)' },
          // Liquidez depois de pagar as faturas abertas; patrimônio fica em /patrimonio.
          { label: 'Disponível após faturas', value: money(totals.available - totals.statements), color: 'var(--text-subtle)' },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text-muted)]">
          Disponível nas contas correntes{showCurrency ? ` · ${totals.currency}` : ''}
        </p>
        <strong
          className={`money mt-2 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl ${
            totals.available < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
          }`}
        >
          {money(totals.available)}
        </strong>
      </div>

      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-[var(--text-muted)]">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: row.color }} aria-hidden="true" />
              {row.label}
            </dt>
            <dd className="money text-sm font-medium text-[var(--foreground)]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function AccountsOverview({
  summary,
  loading,
  showValues,
  ariaLabel,
}: {
  summary: AccountListSummary | undefined;
  loading: boolean;
  showValues: boolean;
  ariaLabel: string;
}) {
  const totals = summary ? buildCurrencyTotals(summary) : [];
  const attention = summary?.attention ?? [];

  return (
    <section
      aria-label={ariaLabel}
      className={`grid gap-[14px] ${attention.length > 0 ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}
    >
      <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5">
        {loading || !summary ? (
          <div className="h-36 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando resumo das contas" />
        ) : totals.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhuma conta ativa ainda. Crie uma conta para ver seu dinheiro aqui.</p>
        ) : (
          <div className="space-y-6 divide-y divide-[var(--border)] [&>*:not(:first-child)]:pt-6">
            {totals.map((item) => (
              <CurrencyHero
                key={item.currency}
                totals={item}
                showValues={showValues}
                showCurrency={totals.length > 1}
              />
            ))}
            {totals.length > 1 && <p className="text-xs text-[var(--text-muted)]">Sem conversão entre moedas.</p>}
            <Link href="/patrimonio" className="inline-flex text-xs font-semibold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
              Ver patrimônio
            </Link>
            {attention.length === 0 && (
              <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <FaCheckCircle className="shrink-0 text-[var(--income)]" aria-hidden="true" />
                Nenhuma conta precisa de atenção.
              </p>
            )}
          </div>
        )}
      </article>

      {attention.length > 0 && (
      <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5" aria-labelledby={`${ariaLabel}-attention`.replace(/\s+/g, '-')}>
        <div className="flex items-center justify-between gap-3">
          <h2 id={`${ariaLabel}-attention`.replace(/\s+/g, '-')} className="text-lg font-bold">Precisa de atenção</h2>
          {attention.length > 0 && (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">{attention.length}</span>
          )}
        </div>

        <ul className="mt-3 space-y-2">
            {attention.map((item) => {
              const message = accountAttentionMessage(item, showValues);
              return (
                <li key={`${item.kind}-${item.accountId}-${item.dueDate?.month ?? ''}-${item.dueDate?.day ?? ''}`}>
                  <Link
                    href={`/contas/show/${encodeURIComponent(item.accountId)}`}
                    className="flex min-h-[56px] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] ${toneStyles[message.tone]}`}>
                      <FaExclamationCircle aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm leading-snug text-[var(--foreground)]">{message.title}</strong>
                      <span className="money mt-0.5 block text-xs text-[var(--text-muted)]">{message.detail}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--orbit-primary)]">
                      {message.action}
                      <FaChevronRight className="text-xs" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </article>
      )}
    </section>
  );
}
