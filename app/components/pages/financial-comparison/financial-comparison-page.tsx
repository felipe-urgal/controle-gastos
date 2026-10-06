'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { logicalDateFromUtcInstant } from '@/app/lib/date/logical-date';
import { financialComparisonService } from '@/app/services/financial-comparison-service';
import type { FinancialComparisonData, FinancialComparisonMetric } from '@/app/types/financial-comparison';
import type { SupportedCurrency } from '@/app/types/financial-summary';

function monthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}
function displayMoney(value: number, currency: SupportedCurrency, showValues: boolean) {
  return showValues ? formatCurrency(value, currency) : '••••';
}
function metricLabel(metric: FinancialComparisonMetric) {
  return metric.percentage === null ? 'Sem base percentual' : `${metric.percentage > 0 ? '+' : ''}${metric.percentage}%`;
}

export default function FinancialComparisonPage() {
  const initial = useMemo(() => {
    const now = logicalDateFromUtcInstant(new Date());
    return {
      currentMonth: monthValue(now.year, now.month),
      aFrom: monthValue(now.year - 1, 1),
      aTo: monthValue(now.year - 1, now.month),
      bFrom: monthValue(now.year, 1),
      bTo: monthValue(now.year, now.month),
    };
  }, []);
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [aFrom, setAFrom] = useState(initial.aFrom);
  const [aTo, setATo] = useState(initial.aTo);
  const [bFrom, setBFrom] = useState(initial.bFrom);
  const [bTo, setBTo] = useState(initial.bTo);
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [data, setData] = useState<FinancialComparisonData | null>(null);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [errorQuery, setErrorQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const queryKey = useMemo(
    () => [aFrom, aTo, bFrom, bTo, currency].join('|'),
    [aFrom, aTo, bFrom, bTo, currency],
  );

  useEffect(() => {
    let active = true;
    const activeQuery = queryKey;

    setLoading(true);
    setError(null);
    setErrorQuery(null);

    financialComparisonService.get({ aFrom, aTo, bFrom, bTo, currency })
      .then((response) => {
        if (!active) return;
        setData(response.data);
        setLoadedQuery(activeQuery);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Erro ao comparar períodos');
        setErrorQuery(activeQuery);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [aFrom, aTo, bFrom, bTo, currency, queryKey, retryNonce]);

  const hasCurrentData = loadedQuery === queryKey && data !== null;
  const hasCurrentError = errorQuery === queryKey && error !== null;
  const showLoading = loading || (!hasCurrentData && !hasCurrentError);

  const rows: Array<readonly [string, number, number, FinancialComparisonMetric]> = hasCurrentData ? [
    ['Receitas', data.a.income, data.b.income, data.difference.income],
    ['Despesas', data.a.expense, data.b.expense, data.difference.expense],
    ['Resultado', data.a.balance, data.b.balance, data.difference.balance],
    ['Média mensal', data.a.averageMonthlyExpense, data.b.averageMonthlyExpense, data.difference.averageMonthlyExpense],
  ] : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">Análise</p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Comparar períodos</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Compare dois intervalos de até 24 meses usando a mesma moeda.</p>
      </header>

      <section className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[1fr_1fr_auto]">
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-bold">Período A</legend>
          <input
            aria-label="Início período A"
            type="month"
            max={initial.currentMonth}
            value={aFrom}
            onChange={(e) => setAFrom(e.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
          <input
            aria-label="Fim período A"
            type="month"
            max={initial.currentMonth}
            value={aTo}
            onChange={(e) => setATo(e.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-bold">Período B</legend>
          <input
            aria-label="Início período B"
            type="month"
            max={initial.currentMonth}
            value={bFrom}
            onChange={(e) => setBFrom(e.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
          <input
            aria-label="Fim período B"
            type="month"
            max={initial.currentMonth}
            value={bTo}
            onChange={(e) => setBTo(e.target.value)}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
        </fieldset>
        <label className="grid content-end gap-2 text-sm font-bold">
          Moeda
          <select value={currency} onChange={(e) => setCurrency(e.target.value as SupportedCurrency)} className="ds-control min-h-11 bg-[var(--surface)] px-3">
            <option>BRL</option><option>USD</option><option>EUR</option>
          </select>
        </label>
      </section>

      {showLoading && <p className="py-12 text-center text-[var(--text-muted)]">Comparando períodos…</p>}
      {!showLoading && hasCurrentError && (
        <div role="alert" className="mt-5 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-[var(--expense)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetryNonce((value) => value + 1)}
            className="mt-3 min-h-11 rounded-lg border border-current px-4 text-sm font-bold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!showLoading && !hasCurrentError && hasCurrentData && (
        <div className="mt-5 space-y-5">
          <section className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-2 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                <span>Métrica</span><span>Período A</span><span>Período B</span><span>Diferença</span>
              </div>
              {rows.map(([label, a, b, metric]) => (
                <div key={label} className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-2 border-b border-[var(--border)] px-4 py-4 last:border-0">
                  <strong className="text-sm">{label}</strong>
                  <span>{displayMoney(a, currency, showValues)}</span>
                  <span>{displayMoney(b, currency, showValues)}</span>
                  <span><strong>{displayMoney(metric.difference, currency, showValues)}</strong><small className="ml-2 text-[var(--text-muted)]">{metricLabel(metric)}</small></span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-lg font-bold">Patrimônio no fim do período</h2>
              {data.a.netWorthEnd === null || data.b.netWorthEnd === null || data.difference.netWorthEnd === null ? (
                <p className="mt-3 text-sm text-[var(--text-muted)]">Sem dados suficientes nessa moeda.</p>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div><small className="text-[var(--text-muted)]">A</small><strong className="block">{displayMoney(data.a.netWorthEnd, currency, showValues)}</strong></div>
                  <div><small className="text-[var(--text-muted)]">B</small><strong className="block">{displayMoney(data.b.netWorthEnd, currency, showValues)}</strong></div>
                  <div><small className="text-[var(--text-muted)]">Diferença</small><strong className="block">{displayMoney(data.difference.netWorthEnd.difference, currency, showValues)}</strong></div>
                </div>
              )}
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-lg font-bold">Cobertura</h2>
              <p className="mt-3 text-sm text-[var(--text-muted)]">Período A: {data.a.months} mês(es) · Período B: {data.b.months} mês(es).</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Percentuais são omitidos quando a base é zero.</p>
            </article>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-bold">Categorias de despesa</h2>
            {data.categories.length === 0 ? <p className="mt-3 text-sm text-[var(--text-muted)]">Sem despesas nos períodos selecionados.</p> : (
              <div className="mt-4 grid gap-2">
                {data.categories.map((category) => (
                  <div key={category.id} className="grid grid-cols-[minmax(120px,1.4fr)_1fr_1fr_1.2fr] gap-2 rounded-xl border border-[var(--border)] px-4 py-3">
                    <strong className="truncate text-sm">{category.name}</strong>
                    <span>{displayMoney(category.a, currency, showValues)}</span>
                    <span>{displayMoney(category.b, currency, showValues)}</span>
                    <span><strong>{displayMoney(category.difference.difference, currency, showValues)}</strong><small className="ml-2 text-[var(--text-muted)]">{metricLabel(category.difference)}</small></span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
