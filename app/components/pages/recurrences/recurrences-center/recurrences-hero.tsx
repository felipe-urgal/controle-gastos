'use client';

import {
  buildLede,
  currencyTotals,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import { Chip, MoneyText } from '@/app/components/ui';
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
  const money = (cents: number, code: string = currency) => (showValues ? formatCurrency(cents, code) : '••••');
  const { recurrences, subscriptions } = currencyTotals(data, currency);
  const currencies = [...new Set([...data.totals.map((item) => item.currency), ...data.subscriptions.totals.map((item) => item.currency)])];

  return (
    <section aria-labelledby="recurrences-hero-label" className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id="recurrences-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">Seu custo fixo por mês</p>
          {currencies.length > 1 && (
            <div className="flex gap-2" role="group" aria-label="Moeda">
              {currencies.map((code) => (
                <Chip key={code} selected={code === currency} onClick={() => onCurrency(code)}>
                  {code}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <strong className="money break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
          {money(recurrences?.monthlyEquivalent ?? 0)}
          <span className="ml-2 text-base font-semibold tracking-normal text-[var(--text-muted)]">/ mês</span>
        </strong>
        <p className="mt-2 max-w-[64ch] text-sm text-[var(--text-muted)]">
          <MoneyText>
            {`${recurrences ? `${money(recurrences.annualEquivalent)} por ano. ` : ''}${buildLede({ formal: data.formal, today, money })}`}
          </MoneyText>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Stat label="Assinaturas ativas" value={money(subscriptions?.monthlyEquivalent ?? 0)} detail="por mês · detectadas no histórico" />
        <Stat
          label="Para revisar"
          value={String(reviewCount)}
          detail={reviewCount === 0 ? 'tudo em dia' : 'ver sugestões e preços'}
          href={reviewCount === 0 ? undefined : '#recorrencias-revisar'}
        />
      </div>
    </section>
  );
}

function Stat({ label, value, detail, href }: { label: string; value: string; detail: string; href?: string }) {
  const className = 'grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-4 sm:py-3.5';
  const content = (
    <>
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{label}</span>
      <span className="money truncate text-base font-semibold sm:text-xl">{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </>
  );
  return href ? (
    <a href={href} className={`${className} hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}
