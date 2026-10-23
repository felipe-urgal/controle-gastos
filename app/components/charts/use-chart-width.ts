'use client';

import { useCallback, useState } from 'react';

/**
 * Largura real do contêiner do gráfico. Os gráficos SVG desenham no tamanho que aparecem, então a
 * altura fica fixa e os rótulos mantêm o tamanho do texto em qualquer tela (em vez de escalar com o viewBox).
 * Retorna `fallback` até a primeira medição.
 */
export function useChartWidth(fallback = 640) {
  const [width, setWidth] = useState(fallback);

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const update = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      if (next > 0) setWidth((current) => (current === next ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
