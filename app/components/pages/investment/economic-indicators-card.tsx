'use client';

import { RiseSection } from '@/app/components/ui/motion';

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
    <RiseSection aria-label="Contexto econômico" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando indicadores...</p>
      ) : failed || !snapshot ? (
        <p className="text-sm text-[var(--text-muted)]">Indicadores temporariamente indisponíveis.</p>
      ) : (
        <details>
          <summary className="flex min-h-9 cursor-pointer list-none flex-wrap items-center gap-x-6 gap-y-1 text-sm [&::-webkit-details-marker]:hidden">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Contexto econômico</span>
            {snapshot.indicators.map((indicator) => (
              <span key={indicator.key} className="text-[var(--text-muted)]">
                {indicator.label}{' '}
                <strong className="money text-[var(--foreground)]">{formatPercent(indicator)}</strong>
                {indicator.isStale ? ' · desatualizado' : ''}
              </span>
            ))}
          </summary>
          <ul className="mt-2 grid gap-1 text-xs leading-relaxed text-[var(--text-muted)]">
            {snapshot.indicators.map((indicator) => (
              <li key={indicator.key}>
                {indicator.label}: {indicator.periodLabel} · {referenceDateLabel(indicator.referenceDate)}
              </li>
            ))}
            <li>
              Fonte: Banco Central do Brasil · SGS · séries 13522, 1178 e 12
              {updatedAt ? ' · cache atualizado em ' + updatedAt : ''}
              {hasStaleData ? ' · mantendo a última observação válida por indisponibilidade da fonte' : ''}. Estes dados não alteram posições, transações ou saldos.
            </li>
          </ul>
        </details>
      )}
    </RiseSection>
  );
}
