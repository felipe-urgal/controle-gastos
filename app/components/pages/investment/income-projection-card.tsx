'use client';

import { useEffect, useMemo, useState } from 'react';

import { MonthBarsChart } from '@/app/components/charts/month-bars-chart';
import { Alert } from '@/app/components/feedback';
import { RiseArticle } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { errorMessage } from '@/app/lib/error-message';
import { investmentService, type InvestmentIncomeProjection } from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Proventos dos próximos 12 meses tomando como referência o que cada mês pagou um ano antes, só dos ativos em carteira.
 * É um espelho do histórico (sem crescimento nem mudança de quantidade), e o card diz isso.
 */
export function IncomeProjectionCard({
  currency,
  showValues,
}: {
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const [state, setState] = useState<{ key: string; data: InvestmentIncomeProjection } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    investmentService
      .getIncomeProjection(currency)
      .then((response) => {
        if (!active) return;
        setState({ key: currency, data: response.data });
        setFailure(null);
      })
      .catch((cause) => {
        if (active) setFailure({ key: currency, message: errorMessage(cause, 'Não foi possível projetar os proventos.') });
      });
    return () => {
      active = false;
    };
  }, [currency]);

  const data = state?.key === currency ? state.data : null;
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const bars = useMemo(() => {
    if (!data) return [];
    const max = Math.max(...data.months.map((item) => item.amountCents), 1);
    return data.months.map((item) => ({
      key: `${item.year}-${item.month}`,
      label: monthNames[item.month - 1],
      valueLabel: money(item.amountCents),
      heightPercent: item.amountCents <= 0 ? 0 : Math.max(4, Math.round((item.amountCents / max) * 100)),
      // Todos são meses futuros: nenhuma barra é "o mês atual".
      current: false,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, showValues, currency]);

  if (failure?.key === currency && !data) {
    return (
      <RiseArticle className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <Alert variant="error" message={failure.message} />
      </RiseArticle>
    );
  }
  // Sem ativo em carteira ou sem provento de referência não há o que projetar: o card some em vez de mostrar zeros.
  if (!data || data.openAssetCount === 0 || data.referenceMonthsWithIncome === 0) return null;

  return (
    <RiseArticle className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Proventos projetados</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Próximos 12 meses em {currency}, pelo que cada mês pagou um ano antes.
          </p>
        </div>
        <div className="text-right">
          <strong className="money block text-xl font-semibold">{money(data.totalCents)}</strong>
          <span className="text-xs text-[var(--text-muted)]">em 12 meses</span>
        </div>
      </div>
      <div className="mt-3">
        <MonthBarsChart ariaLabel={`Proventos projetados por mês em ${currency}`} heightClass="h-28" bars={bars} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
        Referência, não promessa: repete o histórico dos {data.openAssetCount} {data.openAssetCount === 1 ? 'ativo em carteira' : 'ativos em carteira'}, sem crescimento, sem mudança de quantidade e sem proventos novos. Valores líquidos.
      </p>
    </RiseArticle>
  );
}
