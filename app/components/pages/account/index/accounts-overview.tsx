'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { FaCheckCircle, FaChevronRight, FaExclamationCircle } from 'react-icons/fa';

import { accountAttentionMessage, type AttentionTone } from '@/app/components/pages/account/index/account-attention-messages';
import { flipIn } from '@/app/components/pages/account/account-motion';
import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';
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

const MotionLink = motion.create(Link);

const toneStyles: Record<AttentionTone, string> = {
  urgent: 'bg-[var(--danger-subtle)] text-[var(--expense)]',
  warning: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  info: 'bg-[var(--primary-subtle)] text-[var(--primary)]',
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
  const reduce = useReducedMotion();
  const money = (cents: number) => (showValues ? formatCurrency(cents, totals.currency) : '••••');
  const rows = [
    { label: 'Correntes', value: money(totals.available), color: 'var(--income)' },
    { label: 'Investido', value: money(totals.invested), color: 'var(--primary)' },
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
        <motion.strong
          initial={reduce ? false : { opacity: 0, scale: 0.88, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={reducedTransition(reduce, { duration: 0.8, ease: CARD_EASE, delay: 0.3 })}
          style={{ transformOrigin: 'left center' }}
          className={`money mt-2 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl ${
            totals.available < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
          }`}
        >
          {money(totals.available)}
        </motion.strong>
      </div>

      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {rows.map((row, index) => (
          <motion.div
            key={row.label}
            className="flex items-center justify-between gap-3"
            whileHover="hover"
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE, delay: 0.5 + index * 0.08 })}
          >
            <dt className="flex items-center gap-2 text-[var(--text-muted)]">
              <motion.span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ background: row.color }}
                aria-hidden="true"
                variants={{ hover: { rotate: 135, scale: 1.6 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 14 }}
              />
              {row.label}
            </dt>
            <dd className="money text-sm font-medium text-[var(--foreground)]">{row.value}</dd>
          </motion.div>
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
  const reduce = useReducedMotion();
  const totals = summary ? buildCurrencyTotals(summary) : [];
  const attention = summary?.attention ?? [];

  return (
    <section
      aria-label={ariaLabel}
      className={`grid gap-[14px] ${attention.length > 0 ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}
    >
      <motion.article
        {...flipIn(0, reduce)}
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5"
      >
        {loading || !summary ? (
          <div className="h-36 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando resumo das contas" />
        ) : totals.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nenhuma conta ativa ainda. Crie uma conta para ver seu dinheiro aqui.</p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-6 divide-y divide-[var(--border)] [&>*:not(:first-child)]:pt-6">
              {totals.map((item) => (
                <CurrencyHero
                  key={item.currency}
                  totals={item}
                  showValues={showValues}
                  showCurrency={totals.length > 1}
                />
              ))}
            </div>
            <div className="space-y-2 border-t border-[var(--border)] pt-4">
              {totals.length > 1 && <p className="text-xs text-[var(--text-muted)]">Sem conversão entre moedas.</p>}
              {attention.length === 0 && (
                <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <motion.span
                  className="flex shrink-0"
                  initial={reduce ? false : { scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={reducedTransition(reduce, { type: 'spring', stiffness: 380, damping: 12, delay: 0.9 })}
                >
                  <FaCheckCircle className="text-[var(--income)]" aria-hidden="true" />
                </motion.span>
                  Nenhuma conta precisa de atenção.
                </p>
              )}
              <Link href="/patrimonio" className="inline-flex text-xs font-semibold text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
                Ver patrimônio
              </Link>
            </div>
          </div>
        )}
      </motion.article>

      {attention.length > 0 && (
      <motion.article
        {...flipIn(1, reduce)}
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5" aria-labelledby={`${ariaLabel}-attention`.replace(/\s+/g, '-')}>
        <div className="flex items-center justify-between gap-3">
          <h2 id={`${ariaLabel}-attention`.replace(/\s+/g, '-')} className="text-lg font-bold">Precisa de atenção</h2>
          {attention.length > 0 && (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">{attention.length}</span>
          )}
        </div>

        <ul className="mt-3 space-y-2">
            {attention.map((item, index) => {
              const message = accountAttentionMessage(item, showValues);
              return (
                <motion.li
                  key={`${item.kind}-${item.accountId}-${item.dueDate?.month ?? ''}-${item.dueDate?.day ?? ''}`}
                  initial={reduce ? false : { opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={reducedTransition(reduce, { type: 'spring', stiffness: 260, damping: 22, delay: 0.45 + index * 0.1 })}
                >
                  <MotionLink
                    whileHover="hover"
                    whileTap={{ scale: 0.985 }}
                    variants={{ hover: { x: -4 } }}
                    href={`/contas/show/${encodeURIComponent(item.accountId)}`}
                    className="flex min-h-[56px] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                  >
                    <motion.span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] ${toneStyles[message.tone]}`}
                      variants={{ hover: { rotate: [0, -14, 12, -6, 0], transition: { duration: 0.55 } } }}
                    >
                      <FaExclamationCircle aria-hidden="true" />
                    </motion.span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm leading-snug text-[var(--foreground)]">{message.title}</strong>
                      <span className="money mt-0.5 block text-xs text-[var(--text-muted)]">{message.detail}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                      {message.action}
                      <motion.span className="flex" variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                        <FaChevronRight className="text-xs" aria-hidden="true" />
                      </motion.span>
                    </span>
                  </MotionLink>
                </motion.li>
              );
            })}
        </ul>
      </motion.article>
      )}
    </section>
  );
}
