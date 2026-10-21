'use client';

import { useEffect, useState } from 'react';

/**
 * Altura (px) ocupada pelo teclado virtual: diferença entre a viewport de layout e a
 * `visualViewport`. Zero quando não há teclado ou o navegador não expõe a API.
 */
export function useVisualViewportInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const next = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      setInset((current) => (current === next ? current : next));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  // O campo focado não pode ficar sob o teclado nem sob o rodapé sticky (~96px).
  useEffect(() => {
    if (inset <= 0) return;
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = `${inset + 96}px`;
    return () => {
      root.style.scrollPaddingBottom = previous;
    };
  }, [inset]);

  return inset;
}
