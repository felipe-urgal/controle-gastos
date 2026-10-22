'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { PageContainer } from '@/app/components/base-pages';
import { pageTitleClassName } from '@/app/components/base-pages/page-title';
import { PageError } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import MonthlyClosingView from '@/app/components/pages/monthly-closing/monthly-closing-view';
import {
  countItemsToReview,
  monthName,
  monthTitle,
  periodValue,
  shiftPeriod,
} from '@/app/components/pages/monthly-closing/monthly-closing-model';
import { Chip, IconButton } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { monthlyClosingService } from '@/app/services/monthly-closing-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { MonthlyClosingData } from '@/app/types/monthly-closing';

const CURRENCIES: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

const PERIOD_STATUS_LABELS = {
  IN_PROGRESS: 'Mês em andamento',
  REVIEWABLE: 'Pronto para revisão',
  FUTURE: 'Período futuro',
} as const;

export default function MonthlyClosingPage() {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [result, setResult] = useState<{
    key: string;
    data: MonthlyClosingData;
  } | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const queryKey = periodValue(year, month) + ':' + currency;
  const data = result?.key === queryKey ? result.data : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const loading = data === null && error === null;

  useEffect(() => {
    let active = true;
    const requestKey = queryKey;

    monthlyClosingService
      .get({ year, month, currency })
      .then((response) => {
        if (!active) return;
        setResult({ key: requestKey, data: response.data });
        setFailure(null);
      })
      .catch((cause) => {
        if (!active) return;
        setFailure({
          key: requestKey,
          message:
            cause instanceof Error
              ? cause.message
              : 'Erro ao carregar fechamento',
        });
      });

    return () => {
      active = false;
    };
  }, [currency, month, queryKey, reloadToken, year]);

  function goTo(offset: number) {
    const next = shiftPeriod(year, month, offset);
    setYear(next.year);
    setMonth(next.month);
  }

  function retry() {
    setResult(null);
    setFailure(null);
    setReloadToken((current) => current + 1);
  }

  const retrospective = data?.retrospective ?? null;
  const transactionsHref = '/transacoes?year=' + year + '&month=' + month;
  const atCurrentMonth = year === currentYear && month === currentMonth;
  const pendingItems = retrospective ? countItemsToReview(retrospective.readiness) : 0;

  return (
    <ProtectedRoute>
      <PageContainer>
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="grid gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Revisão mensal</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className={`text-balance ${pageTitleClassName}`}>Fechamento de {monthName(month)}</h1>
              {data && (
                <span className="rounded-full bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--orbit-primary)]">
                  {PERIOD_STATUS_LABELS[data.status]}
                </span>
              )}
              {data && retrospective && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pendingItems === 0 ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : 'bg-[var(--warning-subtle)] text-[var(--warning)]'}`}>
                  {pendingItems === 0 ? 'Tudo conferido' : pendingItems === 1 ? '1 item para revisar' : pendingItems + ' itens para revisar'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded-[12px] border border-[var(--border)] bg-[var(--surface)]" role="group" aria-label="Período do fechamento">
              <IconButton label="Mês anterior" icon={<FaChevronLeft />} onClick={() => goTo(-1)} />
              <output className="min-w-[150px] text-center text-sm font-bold capitalize">{monthTitle(year, month)}</output>
              <IconButton label="Próximo mês" icon={<FaChevronRight />} disabled={atCurrentMonth} onClick={() => goTo(1)} />
            </div>
            <div className="flex gap-2" role="group" aria-label="Moeda">
              {CURRENCIES.map((item) => (
                <Chip key={item} selected={item === currency} onClick={() => setCurrency(item)}>
                  {item}
                </Chip>
              ))}
            </div>
          </div>
        </header>

        <div className="mt-5">
          {loading && (
            <div role="status" className="space-y-4" aria-live="polite">
              <p className="text-sm text-[var(--text-muted)]">Carregando revisão do período…</p>
              <div className="animate-pulse space-y-4" aria-hidden="true">
                <div className="h-56 rounded-[20px] bg-[var(--skeleton)]" />
                <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
                  <div className="h-64 rounded-[16px] bg-[var(--skeleton)]" />
                  <div className="h-64 rounded-[16px] bg-[var(--skeleton)]" />
                </div>
              </div>
            </div>
          )}

          {error && <PageError message={error} buttonText="Tentar novamente" onRetry={retry} />}

          {data?.status === 'FUTURE' && (
            <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-bold">Este período ainda é futuro</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Fechamento é uma retrospectiva. Use Planejamento e Compromissos para consultar projeções futuras.
              </p>
              <Link href="/compromissos" className="mt-3 inline-flex min-h-11 items-center font-bold text-[var(--orbit-primary)]">
                Ver compromissos
              </Link>
            </section>
          )}

          {data && retrospective && (
            <MonthlyClosingView
              data={data}
              retrospective={retrospective}
              currency={currency}
              showValues={showValues}
              transactionsHref={transactionsHref}
            />
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
