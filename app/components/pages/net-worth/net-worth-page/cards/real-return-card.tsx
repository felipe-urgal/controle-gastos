'use client';

import { NetWorthRealReturnData } from '@/app/types/net-worth';
import { displayMoney, displayPercent, monthShort } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';

export function RealReturnCard({
  data,
  summary,
  showValues,
}: {
  data: NetWorthRealReturnData['byCurrency'][number];
  summary: NetWorthRealReturnData;
  showValues: boolean;
}) {
  const nominalOnly = data.status === 'NOMINAL_ONLY';
  const statusMessage =
    data.status === 'BASELINE_NOT_POSITIVE'
      ? 'A variação percentual exige patrimônio inicial positivo.'
      : data.status === 'INFLATION_INCOMPLETE'
        ? `IPCA disponível em ${summary.inflation.availableMonths} de ${summary.inflation.expectedMonths} meses. A evolução real em BRL só aparece quando o período estiver completo.`
        : nominalOnly
          ? `Em ${data.currency}, a evolução permanece nominal na moeda original. O IPCA brasileiro não é aplicado sem conversão histórica auditável para BRL.`
          : null;

  return (
    <article className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Evolução patrimonial
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {monthShort(summary.period.start.year, summary.period.start.month)} →{' '}
            {monthShort(summary.period.end.year, summary.period.end.month)} ·{' '}
            {summary.period.months} meses · {data.currency}.
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
          {data.currency === 'BRL'
            ? `BRL real · IPCA SGS ${summary.inflation.seriesCode}`
            : `${data.currency} nominal`}
        </span>
      </div>

      <dl
        className={`mt-4 grid gap-3 sm:grid-cols-2 ${data.currency === 'BRL' ? 'xl:grid-cols-5' : 'xl:grid-cols-3'}`}
      >
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Patrimônio inicial</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayMoney(data.initial, showValues, data.currency)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Patrimônio final</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayMoney(data.current, showValues, data.currency)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Variação nominal</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayPercent(data.nominalPercentage, showValues)}
          </dd>
        </div>
        {data.currency === 'BRL' && (
          <>
            <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
              <dt className="text-xs text-[var(--text-muted)]">IPCA do período</dt>
              <dd className="mt-1 font-bold text-[var(--foreground)]">
                {displayPercent(summary.inflation.percentage, showValues)}
              </dd>
            </div>
            <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
              <dt className="text-xs text-[var(--text-muted)]">Evolução real</dt>
              <dd className="mt-1 font-bold text-[var(--foreground)]">
                {displayPercent(data.realPercentage, showValues)}
              </dd>
            </div>
          </>
        )}
      </dl>

      {statusMessage && (
        <p className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
          {statusMessage}
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-[var(--text-muted)]">
        <p>
          Esta métrica mede evolução patrimonial e inclui aportes, retiradas e
          reavaliações de passivos. Não representa rentabilidade isolada de investimentos.
        </p>
        <p>
          A série usa a base contábil histórica: transações concluídas menos passivos
          pela data efetiva. Não reconstrói mercado passado com cotação atual.
        </p>
        {data.currency === 'BRL' && (
          <p>
            Fonte de inflação: {summary.inflation.sourceLabel} · série{' '}
            {summary.inflation.seriesCode}. Fórmula: {summary.formula}. {summary.rounding}.
          </p>
        )}
      </div>
    </article>
  );
}
