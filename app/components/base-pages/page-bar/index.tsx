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
 * `animated` liga o movimento da faixa; cada página escolhe o seu preset. `true` (Dashboard): título que sobe de
 * uma máscara, sombra e título que reagem à rolagem e linha de progresso na borda de baixo. `'letters'`
 * (Transações): letras do título que caem em sequência, linha de acento que se expande do centro ao rolar e
 * três pontos pulsando ao lado do título enquanto `loading`. `'trail'` (telas de criação): o breadcrumb se
 * constrói: os níveis deslizam, os chevrons encaixam e o título é digitado com um cursor. `'focus'` (Contas): o título
 * entra desfocado e as letras se fecham até ficarem nítidas, e um feixe de luz cruza a borda de baixo uma vez. Sem `animated` a faixa é estática.
 */
export default function PageBar({
  crumbs,
  actions,
  animated = false,
  loading = false,
}: {
  crumbs: Crumb[];
  actions?: ReactNode;
  animated?: boolean | 'letters' | 'trail' | 'focus';
  loading?: boolean;
}) {
  const current = crumbs[crumbs.length - 1];
  const parents = crumbs.slice(0, -1);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const shadowOpacity = useTransform(scrollY, [0, 48], [0, 1]);
  const titleScale = useTransform(scrollY, [0, 80], [1, 0.96]);
  const accentScale = useTransform(scrollY, [0, 60], [0, 1]);
  const letters = animated === 'letters';
  const trail = animated === 'trail';
  const focus = animated === 'focus';

  return (
    <header
      className="sticky top-0 z-[var(--z-header)] -mx-[var(--orbit-page-padding-inline)] -mt-[var(--orbit-page-padding-block)] flex min-h-[var(--app-mobile-topbar-height)] items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--orbit-navigation-surface)] px-[var(--orbit-page-padding-inline)] py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] lg:min-h-[var(--app-sidebar-header-height)] lg:pt-2"
    >
      <nav aria-label="Você está em" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2">
          {parents.map((crumb, parentIndex) => (
            <motion.li
              key={crumb.label}
              className="flex shrink-0 items-center gap-2"
              initial={trail ? { x: -18, opacity: 0 } : false}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28, delay: 0.05 + parentIndex * 0.1 }}
            >
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
              <motion.span
                className="flex"
                initial={trail ? { rotate: -90, scale: 0.4, opacity: 0 } : false}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.2 + parentIndex * 0.1 }}
              >
                <FaChevronRight className="translate-y-px text-xs text-[var(--text-subtle)]" aria-hidden="true" />
              </motion.span>
            </motion.li>
          ))}
          <li aria-current="page" className={letters ? 'flex min-w-0 items-center gap-3' : 'min-w-0'}>
            {trail ? (
              // O título é revelado da esquerda para a direita, com o cursor acompanhando a borda da revelação.
              <span className="relative inline-block max-w-full align-middle">
                <motion.h1
                  className={`truncate ${pageTitleClassName} lg:text-xl`}
                  initial={{ clipPath: 'inset(0 100% 0 0)' }}
                  animate={{ clipPath: 'inset(0 0% 0 0)' }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: 0.35 }}
                >
                  {current.label}
                </motion.h1>
                {!reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-y-1 w-0.5 rounded-full bg-[var(--primary)]"
                    initial={{ left: '0%', opacity: 1 }}
                    animate={{ left: '100%', opacity: [1, 1, 0, 1, 0] }}
                    transition={{ left: { duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: 0.35 }, opacity: { duration: 1.5, delay: 0.35, times: [0, 0.45, 0.6, 0.8, 1] } }}
                  />
                )}
              </span>
            ) : focus ? (
              <motion.h1
                className={`truncate ${pageTitleClassName} lg:text-xl`}
                initial={reduceMotion ? false : { opacity: 0, x: -16, filter: 'blur(8px)', letterSpacing: '0.18em' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)', letterSpacing: '-0.025em' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              >
                {current.label}
              </motion.h1>
            ) : letters ? (
              <h1 aria-label={current.label} className={`truncate ${pageTitleClassName} lg:text-xl`}>
                {[...current.label].map((char, index) => (
                  <motion.span
                    key={index}
                    aria-hidden="true"
                    className="inline-block whitespace-pre"
                    initial={{ y: -18, opacity: 0, rotate: -8 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.05 + index * 0.03 }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
            ) : animated ? (
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
            {letters && (
              <AnimatePresence>
                {loading && (
                  <motion.span
                    key="dots"
                    aria-hidden="true"
                    className="flex shrink-0 items-center gap-1"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                  >
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </li>
        </ol>
      </nav>
      {actions && <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">{actions}</div>}
      {letters && (
        <motion.span
          aria-hidden="true"
          style={{ scaleX: accentScale }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-center bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
        />
      )}
      {focus && !reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-1/4 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
          initial={{ x: '-100%', opacity: 1 }}
          animate={{ x: '400%', opacity: [1, 1, 0] }}
          transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.3 }}
        />
      )}
      {animated === true && (
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
