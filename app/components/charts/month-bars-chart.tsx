'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';

export type MonthBarDatum = {
  key: string;
  label: string;
  /** Texto do valor mostrado na leitura (já formatado, ou `••••` com valores ocultos). */
  valueLabel: string;
  heightPercent: number;
  current: boolean;
  /** Cor de preenchimento; sem ela usa a cor de destaque (mês atual) ou sua versão suave. */
  color?: string;
};

/**
 * Gráfico de colunas em CSS com a interação padrão dos gráficos: passar o mouse, tocar ou usar as
 * setas escolhe uma coluna e a leitura mostra o valor do mês. Sem escolha, a leitura mostra o mês atual.
 */
export function MonthBarsChart({
  bars,
  ariaLabel,
  accentColor = 'var(--orbit-primary)',
  heightClass = 'h-28',
  overlay,
}: {
  bars: MonthBarDatum[];
  ariaLabel: string;
  accentColor?: string;
  heightClass?: string;
  /** Camada sobre as colunas (ex.: linha de limite), posicionada em relação à área das barras. */
  overlay?: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const currentIndex = Math.max(0, bars.findIndex((bar) => bar.current));
  const shownIndex = active ?? currentIndex;
  const shown = bars[shownIndex];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActive(Math.min(bars.length - 1, Math.max(0, shownIndex + step)));
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  }

  return (
    <div>
      <p className="mb-2 min-h-5 text-sm text-[var(--text-muted)]" aria-live="polite">
        {shown ? (
          <>
            {shown.label}
            {active === null && shown.current ? ' (mês atual)' : ''}:{' '}
            <strong className="money text-[var(--foreground)]">{shown.valueLabel}</strong>
          </>
        ) : null}
      </p>
      <div
        role="group"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
        className={`relative grid ${heightClass} items-end gap-2 rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]`}
        style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
      >
        {overlay}
        {bars.map((bar, index) => {
          const dim = active !== null && active !== index;
          return (
            <div
              key={bar.key}
              className="flex h-full cursor-pointer flex-col items-center justify-end gap-1"
              onPointerEnter={(event) => event.pointerType === 'mouse' && setActive(index)}
              onPointerDown={() => setActive(index)}
            >
              <div
                className={`w-full max-w-10 rounded-t-md transition-opacity ${dim ? 'opacity-45' : ''}`}
                style={{
                  height: `${bar.heightPercent}%`,
                  backgroundColor: bar.color ?? (bar.current ? accentColor : `color-mix(in srgb, ${accentColor} 50%, var(--surface-subtle))`),
                  outline: active === index ? `2px solid ${accentColor}` : undefined,
                  outlineOffset: 1,
                }}
                role="img"
                aria-label={`${bar.label}: ${bar.valueLabel}`}
              />
              <span className={`text-xs ${index === shownIndex ? 'font-bold text-[var(--foreground)]' : 'text-[var(--text-muted)]'}`}>{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
