'use client';

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaChevronRight } from 'react-icons/fa';

import { pageTitleClassName } from '@/app/components/base-pages/page-title-classes';

export type Crumb = { label: string; href?: string };

/** Botões da faixa: um pouco mais baixos (40px no desktop; no toque seguem 44px). */
export const pageBarButtonProps = { size: 'sm', className: 'sm:min-h-10' } as const;

/**
 * Faixa do título da página. Com sidebar (`lg`), encosta nela, usa a mesma cor e altura do bloco
 * do logo (a linha de baixo é uma só) e fica fixa no topo ao rolar. O título é um breadcrumb: os
 * níveis acima são links e o último, o `h1`, é a página atual. A barra é sempre uma linha só: ações que
 * não cabem numa linha (rótulos em cima, grupos empilhados) ficam num bloco abaixo dela. Abaixo de `lg` também fica fixa no topo e faz o papel da barra superior.
 *
 * `animated` liga o conjunto de movimento da faixa (título que sobe de uma máscara, sombra e título que
 * reagem à rolagem) e `loading` mostra a linha de progresso na borda de baixo. Sem `animated` a faixa é estática.
 */
export default function PageBar({
  crumbs,
  actions,
  animated = false,
  loading = false,
}: {
  crumbs: Crumb[];
  actions?: ReactNode;
  animated?: boolean;
  loading?: boolean;
}) {
  const current = crumbs[crumbs.length - 1];
  const parents = crumbs.slice(0, -1);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const shadowOpacity = useTransform(scrollY, [0, 48], [0, 1]);
  const titleScale = useTransform(scrollY, [0, 80], [1, 0.96]);

  return (
    <header
      className="sticky top-0 z-[var(--z-header)] -mx-[var(--orbit-page-padding-inline)] -mt-[var(--orbit-page-padding-block)] flex min-h-[var(--app-mobile-topbar-height)] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--orbit-navigation-surface)] px-[var(--orbit-page-padding-inline)] py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] lg:min-h-[var(--app-sidebar-header-height)] lg:pt-2"
    >
      <nav aria-label="Você está em" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2">
          {parents.map((crumb) => (
            <li key={crumb.label} className="flex shrink-0 items-center gap-2">
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="rounded-[var(--radius-sm)] text-xl font-semibold tracking-tight text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-xl font-semibold tracking-tight text-[var(--text-muted)]">{crumb.label}</span>
              )}
              <FaChevronRight className="translate-y-px text-xs text-[var(--text-subtle)]" aria-hidden="true" />
            </li>
          ))}
          <li aria-current="page" className="min-w-0">
            {animated ? (
              <span className="block overflow-hidden pb-0.5">
                <motion.h1
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32, delay: 0.05 }}
                  style={{ scale: titleScale, transformOrigin: 'left center' }}
                  className={`truncate ${pageTitleClassName} lg:text-xl`}
                >
                  {current.label}
                </motion.h1>
              </span>
            ) : (
              <h1 className={`truncate ${pageTitleClassName} lg:text-xl`}>{current.label}</h1>
            )}
          </li>
        </ol>
      </nav>
      {actions && <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">{actions}</div>}
      {animated && (
        <>
          {/* Sombra que aparece só depois de rolar: separa a faixa fixa do conteúdo que passa por baixo. */}
          <motion.span
            aria-hidden="true"
            style={{ opacity: shadowOpacity }}
            className="pointer-events-none absolute inset-x-0 top-full h-3 bg-gradient-to-b from-black/10 to-transparent"
          />
          <AnimatePresence>
            {loading && (
              <motion.span
                key="progress"
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
              >
                <motion.span
                  className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--primary)]"
                  animate={reduceMotion ? { opacity: [0.3, 1, 0.3] } : { x: ['-100%', '300%'] }}
                  transition={{ duration: reduceMotion ? 1.2 : 1.1, ease: 'easeInOut', repeat: Infinity }}
                />
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </header>
  );
}
