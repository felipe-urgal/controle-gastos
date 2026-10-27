'use client';

import { motion, useReducedMotion } from 'framer-motion';

import {
  buildLede,
  currencyTotals,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import { Chip, MoneyText } from '@/app/components/ui';
import { CARD_EASE, CountUp } from '@/app/components/ui/motion';
import { circleReveal, spinPop } from '@/app/components/ui/motion-presets';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { RecurrenceLogicalDate, RecurrencesData } from '@/app/types/recurrence';

export default function RecurrencesHero({
  data,
  showValues,
  today,
  currency,
  onCurrency,
  reviewCount,
}: {
  data: RecurrencesData;
  showValues: boolean;
  today: RecurrenceLogicalDate;
  currency: string;
  onCurrency: (currency: string) => void;
  reviewCount: number;
}) {
  const reduce = useReducedMotion();
  const money = (cents: number, code: string = currency) => (showValues ? formatCurrency(cents, code) : '••••');
  const { recurrences, subscriptions } = currencyTotals(data, currency);
  const currencies = [...new Set([...data.totals.map((item) => item.currency), ...data.subscriptions.totals.map((item) => item.currency)])];

  return (
    <motion.section
      {...circleReveal(reduce)}
      aria-labelledby="recurrences-hero-label"
      className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6"
    >
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id="recurrences-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">Seu custo fixo por mês</p>
          {currencies.length > 1 && (
            <div className="flex gap-2" role="group" aria-label="Moeda">
              {currencies.map((code) => (
                <Chip key={code} layoutId="recurrences-currency" selected={code === currency} onClick={() => onCurrency(code)}>
                  {code}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <strong className="money break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
          <CountUp amount={recurrences?.monthlyEquivalent ?? 0} format={(cents) => money(cents)} />
          <motion.span
            className="ml-2 inline-block text-base font-semibold tracking-normal text-[var(--text-muted)]"
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: CARD_EASE, delay: 0.9 }}
          >
            / mês
          </motion.span>
        </strong>
        <p className="mt-2 max-w-[64ch] text-sm text-[var(--text-muted)]">
          <MoneyText>
            {`${recurrences ? `${money(recurrences.annualEquivalent)} por ano. ` : ''}${buildLede({ formal: data.formal, today, money })}`}
          </MoneyText>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Stat index={0} label="Assinaturas ativas" value={money(subscriptions?.monthlyEquivalent ?? 0)} detail="por mês · detectadas no histórico" />
        <Stat
          index={1}
          pulse={reviewCount > 0}
          label="Para revisar"
          value={String(reviewCount)}
          detail={reviewCount === 0 ? 'tudo em dia' : 'ver sugestões e preços'}
          href={reviewCount === 0 ? undefined : '#recorrencias-revisar'}
        />
      </div>
    </motion.section>
  );
}

function Stat({ index, pulse = false, label, value, detail, href }: { index: number; pulse?: boolean; label: string; value: string; detail: string; href?: string }) {
  const reduce = useReducedMotion();
  const className = 'relative grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-4 sm:py-3.5';
  // Entra girando; no hover (ou toque) o valor cresce. "Para revisar" com itens ganha um anel que pulsa chamando o clique.
  const content = (
    <>
      {pulse && !reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-md)] border-2 border-[var(--primary)]"
          animate={{ scale: [1, 1.06], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{label}</span>
      <motion.span className="money origin-left truncate text-base font-semibold sm:text-xl" variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
        {value}
      </motion.span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </>
  );
  const motionProps = { ...spinPop(index, reduce, 0.8), whileHover: 'hover', whileTap: 'hover' } as const;
  return href ? (
    <motion.a href={href} {...motionProps} className={`${className} hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`}>
      {content}
    </motion.a>
  ) : (
    <motion.div {...motionProps} className={className}>{content}</motion.div>
  );
}
