'use client';

import type { ReactNode } from 'react';

import { useMediaQuery } from '@/app/hooks/use-media-query';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

const MIN_WIDTH: Record<Breakpoint, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 };

/** Monta os filhos só a partir do breakpoint (em vez de montar sempre e esconder por CSS). */
export function ShowFrom({ breakpoint, children }: { breakpoint: Breakpoint; children: ReactNode }) {
  const matches = useMediaQuery(`(min-width: ${MIN_WIDTH[breakpoint]}px)`);
  return matches ? <>{children}</> : null;
}

/** Monta os filhos só abaixo do breakpoint. */
export function ShowBelow({ breakpoint, children }: { breakpoint: Breakpoint; children: ReactNode }) {
  const matches = useMediaQuery(`(min-width: ${MIN_WIDTH[breakpoint]}px)`);
  return matches ? null : <>{children}</>;
}
