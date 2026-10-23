'use client';

import { useCallback, useState, type PointerEvent } from 'react';

/**
 * Interação padrão dos gráficos: passar o mouse ou tocar escolhe o ponto mais próximo.
 * `xs` são as posições dos pontos no sistema de coordenadas do viewBox e `width` é a largura do viewBox.
 */
export function useChartScrub(xs: number[], width: number) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const select = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (xs.length === 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0) return;
      setActiveIndex(nearestIndex(xs, ((event.clientX - rect.left) / rect.width) * width));
    },
    [xs, width],
  );

  const handlers = {
    onPointerDown: select,
    onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
      if (event.pointerType === 'mouse') select(event);
    },
    onPointerLeave: (event: PointerEvent<SVGSVGElement>) => {
      if (event.pointerType === 'mouse') setActiveIndex(null);
    },
  };

  return { activeIndex, handlers, reset: () => setActiveIndex(null) };
}

export function nearestIndex(xs: number[], x: number) {
  let nearest = 0;
  for (let index = 1; index < xs.length; index += 1) {
    if (Math.abs(xs[index] - x) < Math.abs(xs[nearest] - x)) nearest = index;
  }
  return nearest;
}
