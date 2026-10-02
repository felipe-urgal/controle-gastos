'use client';

import { useEffect, useState } from 'react';

import { economicIndicatorService } from '@/app/services/economic-indicator-service';
import type {
  EconomicIndicator,
  EconomicIndicatorSnapshot,
} from '@/app/types/economic-indicator';

function formatPercent(indicator: EconomicIndicator) {
  if (indicator.value === null) return 'Indisponível';

  const value = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: indicator.key === 'CDI_DAILY' ? 6 : 2,
  }).format(indicator.value);

  return value + indicator.unitLabel;
}

function referenceDateLabel(value: string | null) {
  if (!value) return 'sem data de referência';
  const [year, month, day] = value.split('-');
  return day + '/' + month + '/' + year;
}

function updatedAtLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function EconomicIndicatorsCard() {
  const [snapshot, setSnapshot] = useState<EconomicIndicatorSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void economicIndicatorService
      .getCurrent()
      .then((response) => {
        if (cancelled) return;
        setSnapshot(response.data);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasStaleData =
    snapshot?.indicators.some(
      (indicator) => indicator.value !== null && indicator.isStale,
    ) ?? false;
  const updatedAt = updatedAtLabel(snapshot?.updatedAt ?? null);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Contexto econômico
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Referências oficiais para contexto. Estes dados não alteram posições,
          transações ou saldos.
        </p>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Carregando indicadores...
        </p>
      ) : failed || !snapshot ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Indicadores temporariamente indisponíveis.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {snapshot.indicators.map((indicator) => (
              <div
                key={indicator.key}
                className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-3"
              >
                <span className="block text-xs font-semibold text-[var(--text-muted)]">
                  {indicator.label}
                </span>
                <strong className="mt-1 block text-lg text-[var(--foreground)]">
                  {formatPercent(indicator)}
                </strong>
                <span className="mt-1 block text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {indicator.periodLabel}
                  {' · '}
                  {referenceDateLabel(indicator.referenceDate)}
                  {indicator.isStale ? ' · desatualizado' : ''}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
            Fonte: Banco Central do Brasil · SGS · séries 13522, 1178 e 12
            {updatedAt ? ' · cache atualizado em ' + updatedAt : ''}
            {hasStaleData
              ? ' · mantendo a última observação válida por indisponibilidade da fonte'
              : ''}
          </p>
        </>
      )}
    </article>
  );
}
