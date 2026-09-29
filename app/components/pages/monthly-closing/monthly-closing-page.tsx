'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthlyClosingService } from '@/app/services/monthly-closing-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { MonthlyClosingData } from '@/app/types/monthly-closing';

const CURRENCIES: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

function displayMoney(amount: number, currency: SupportedCurrency, showValues: boolean) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function periodValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export default function MonthlyClosingPage() {
  const now = useMemo(() => new Date(), []);
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [data, setData] = useState<MonthlyClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    monthlyClosingService.get({ year, month, currency })
      .then((response) => {
        if (!active) return;
        setData(response.data);
        setError(null);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Erro ao carregar fechamento');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [year, month, currency]);

  function handlePeriod(value: string) {
    const [nextYear, nextMonth] = value.split('-').map(Number);
    if (Number.isInteger(nextYear) && Number.isInteger(nextMonth)) {
      setYear(nextYear);
      setMonth(nextMonth);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">Retrospectiva</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Fechamento mensal</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Realizado, planejamento e patrimônio do período, sem misturar moedas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Período do fechamento"
            type="month"
            value={periodValue(year, month)}
            onChange={(event) => handlePeriod(event.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3 text-[var(--foreground)]"
          />
          <select
            aria-label="Moeda"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as SupportedCurrency)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3 text-[var(--foreground)]"
          >
            {CURRENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </header>

      {loading && <p className="py-12 text-center text-[var(--text-muted)]">Carregando fechamento…</p>}
      {error && <div role="alert" className="mt-5 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-[var(--expense)]">{error}</div>}

      {!loading && !error && data && (
        <div className="mt-5 space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            {[
              ['Receitas realizadas', data.summary.income],
              ['Despesas realizadas', data.summary.expense],
              ['Resultado do mês', data.summary.balance],
            ].map(([label, amount]) => (
              <article key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-sm text-[var(--text-muted)]">{label}</p>
                <strong className="mt-2 block text-2xl text-[var(--foreground)]">{displayMoney(Number(amount), currency, showValues)}</strong>
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Planejamento</h2>
              <dl className="mt-4 grid gap-3">
                {[
                  ['Orçado', data.planning.budget],
                  ['Realizado', data.planning.realized],
                  ['Comprometido', data.planning.committed],
                  ['Disponível', data.planning.available],
                ].map(([label, amount]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0">
                    <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
                    <dd className="font-semibold text-[var(--foreground)]">{displayMoney(Number(amount), currency, showValues)}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Patrimônio</h2>
              {data.netWorth ? (
                <dl className="mt-4 grid gap-3">
                  <div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">Mês anterior</dt><dd className="font-semibold">{displayMoney(data.netWorth.previous, currency, showValues)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">Fim do período</dt><dd className="font-semibold">{displayMoney(data.netWorth.current, currency, showValues)}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-3"><dt className="font-semibold">Variação</dt><dd className="font-black">{displayMoney(data.netWorth.difference, currency, showValues)}</dd></div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-[var(--text-muted)]">Ainda não há dois pontos de patrimônio nessa moeda para calcular a variação.</p>
              )}
            </article>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Maiores categorias</h2>
              <Link href={`/transacoes?year=${year}&month=${month}`} className="text-sm font-semibold text-[var(--orbit-primary)]">Ver transações</Link>
            </div>
            {data.topCategories.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma despesa realizada no período.</p>
            ) : (
              <div className="mt-4 grid gap-2">
                {data.topCategories.map((category) => (
                  <Link key={category.id} href={`/transacoes?year=${year}&month=${month}&categoryId=${category.id}`} className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 hover:bg-[var(--surface-hover)]">
                    <span className="min-w-0 truncate font-semibold text-[var(--foreground)]">{category.name}</span>
                    <span className="shrink-0 text-sm text-[var(--text-muted)]">{displayMoney(category.realized, currency, showValues)} · {category.sharePercentage}%</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold text-[var(--foreground)]">Comparação com o mês anterior</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {([
                { label: 'Receitas', metric: data.comparison.income },
                { label: 'Despesas', metric: data.comparison.expense },
                { label: 'Resultado', metric: data.comparison.balance },
              ] satisfies Array<{
                label: string;
                metric: MonthlyClosingData['comparison']['income'];
              }>).map(({ label, metric }) => (
                <div key={label} className="rounded-xl bg-[var(--surface-raised)] p-4">
                  <p className="text-xs text-[var(--text-muted)]">{label}</p>
                  <strong className="mt-1 block text-[var(--foreground)]">{displayMoney(metric.difference, currency, showValues)}</strong>
                  <span className="text-xs text-[var(--text-muted)]">{metric.percentage === null ? 'Sem base comparável' : `${metric.percentage > 0 ? '+' : ''}${metric.percentage}%`}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
