'use client';

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaChevronRight } from 'react-icons/fa';

import { pageTitleClassName } from '@/app/components/base-pages/page-title-classes';

export type Crumb = { label: string; href?: string };

/** Botões da faixa: um pouco mais baixos (40px no desktop; no toque seguem 44px). */
export const pageBarButtonProps = { size: 'sm', className: 'sm:min-h-10' } as const;

/** Presets de movimento da faixa do título (cada página escolhe o seu). */
export type PageBarAnimation = boolean | 'letters' | 'trail' | 'focus' | 'flip' | 'stamp' | 'collide' | 'conveyor' | 'deal' | 'spin' | 'climb' | 'zoom' | 'swing' | 'wave' | 'slam' | 'fan' | 'neon' | 'dangle';

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
 * entra desfocado e as letras se fecham até ficarem nítidas, e um feixe de luz cruza a borda de baixo uma vez. `'flip'` (Calendário): as letras do título viram como folhas de um calendário,
 * uma depois da outra, e três pontos pulsam ao lado do título enquanto `loading`. `'stamp'` (Fechamento): o título "carimba" a página (entra grande e desfocado e assenta com um
 * tranco) e um traço de tinta o sublinha; troca de título carimba de novo. `'collide'` (Comparar): as palavras do título vêm de lados opostos e se encontram no meio, com um
 * tranco de mola no encontro. `'conveyor'` (Compromissos): o título chega pela direita como numa esteira, inclinado, e endireita ao
 * parar, enquanto uma barra de "prazo" se esgota por baixo. `'deal'` (Modelos): o título é "dado" como uma carta de baralho, girando e caindo no lugar.
 * `'spin'` (Recorrências): as letras giram uma volta completa, em sequência, como um ciclo que se repete.
 * `'climb'` (Metas): as letras sobem como degraus, uma mais alta que a outra, e uma barra de progresso se enche por baixo.
 * `'zoom'` (Patrimônio): o título vem de longe, crescendo e se nitidificando, como uma visão geral que se aproxima.
 * `'swing'` (Investimentos): o título balança como um pêndulo preso pelo canto de cima e se acalma.
 * `'wave'` (Rendimentos): as letras sobem e descem em onda, uma depois da outra, até assentar.
 * `'slam'` (Dívidas): o título despenca pesado do alto e amassa ao bater, com um tremor curto.
 * `'fan'` (Categorias): o título se abre como um leque, girando a partir do canto de baixo à esquerda, e uma faixa de cores varre a base.
 * `'neon'` (Estabelecimentos): o título acende como um letreiro, piscando até firmar, com um brilho que se apaga.
 * `'dangle'` (Tags): o título balança preso pela ponta esquerda, como uma etiqueta pendurada, e se acalma.
 * Sem `animated` a faixa é estática.
 */
export default function PageBar({
  crumbs,
  actions,
  animated = false,
  loading = false,
}: {
  crumbs: Crumb[];
  actions?: ReactNode;
  animated?: PageBarAnimation;
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
  const flip = animated === 'flip';
  const stamp = animated === 'stamp';
  const collide = animated === 'collide';
  const conveyor = animated === 'conveyor';
  const deal = animated === 'deal';
  const spin = animated === 'spin';
  const climb = animated === 'climb';
  const zoom = animated === 'zoom';
  const swing = animated === 'swing';
  const wave = animated === 'wave';
  const slam = animated === 'slam';
  const fan = animated === 'fan';
  const neon = animated === 'neon';
  const dangle = animated === 'dangle';

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
          <li aria-current="page" className={letters || flip ? 'flex min-w-0 items-center gap-3' : 'min-w-0'}>
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
            ) : fan ? (
              <span className="relative inline-block max-w-full align-middle">
                <motion.h1
                  className={`truncate ${pageTitleClassName} lg:text-xl`}
                  style={{ transformOrigin: '0% 100%' }}
                  initial={reduceMotion ? false : { rotate: -35, opacity: 0, scale: 0.9 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 14 }}
                >
                  {current.label}
                </motion.h1>
                {!reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 origin-left rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--expense), var(--warning), var(--income), var(--primary))' }}
                    initial={{ scaleX: 0, opacity: 1 }}
                    animate={{ scaleX: 1, opacity: [1, 1, 0] }}
                    transition={{ duration: 1.1, delay: 0.3, ease: 'easeOut', times: [0, 0.7, 1] }}
                  />
                )}
              </span>
            ) : neon ? (
              <motion.h1
                className={`truncate ${pageTitleClassName} lg:text-xl`}
                initial={reduceMotion ? false : { opacity: 0, textShadow: '0 0 0 transparent' }}
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : {
                        opacity: [0, 1, 0.2, 1, 0.4, 1, 1],
                        textShadow: ['0 0 0px transparent', '0 0 14px var(--primary)', '0 0 2px transparent', '0 0 16px var(--primary)', '0 0 2px transparent', '0 0 18px var(--primary)', '0 0 0px transparent'],
                      }
                }
                transition={{ duration: 1.3, times: [0, 0.12, 0.2, 0.4, 0.5, 0.65, 1], ease: 'linear' }}
              >
                {current.label}
              </motion.h1>
            ) : dangle ? (
              <motion.h1
                className={`truncate ${pageTitleClassName} lg:text-xl`}
                style={{ transformOrigin: '0% 50%' }}
                initial={reduceMotion ? false : { rotate: 24, y: 10, opacity: 0 }}
                animate={{ rotate: 0, y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 5, mass: 0.9 }}
              >
                {current.label}
              </motion.h1>
            ) : zoom ? (
              <motion.h1
                className={`truncate ${pageTitleClassName} lg:text-xl`}
                style={{ transformOrigin: 'left center' }}
                initial={reduceMotion ? false : { scale: 0.3, opacity: 0, filter: 'blur(10px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ type: 'spring', stiffness: 140, damping: 16 }}
              >
                {current.label}
              </motion.h1>
            ) : swing ? (
              <motion.h1
                className={`truncate ${pageTitleClassName} lg:text-xl`}
                style={{ transformOrigin: '12% 0%' }}
                initial={reduceMotion ? false : { rotate: -28, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 90, damping: 6, mass: 1.2 }}
              >
                {current.label}
              </motion.h1>
            ) : wave ? (
              <h1 aria-label={current.label} className={`truncate ${pageTitleClassName} lg:text-xl`}>
                {[...current.label].map((char, index) => (
                  <motion.span
                    key={index}
                    aria-hidden="true"
                    className="inline-block whitespace-pre"
                    initial={reduceMotion ? false : { y: 0, opacity: 0 }}
                    animate={reduceMotion ? { opacity: 1 } : { y: [0, -12, 6, -3, 0], opacity: 1 }}
                    transition={{ duration: 0.9, delay: 0.05 + index * 0.04, ease: 'easeOut' }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
            ) : slam ? (
              <motion.h1
                className={`truncate ${pageTitleClassName} lg:text-xl`}
                style={{ transformOrigin: '50% 100%' }}
                initial={reduceMotion ? false : { y: -90, opacity: 0, scaleY: 1.4 }}
                animate={reduceMotion ? { opacity: 1 } : { y: [-90, 0, -8, 0], scaleY: [1.4, 0.7, 1.05, 1], opacity: 1, x: [0, 0, -4, 3, 0] }}
                transition={{ duration: 0.7, ease: 'easeIn', times: [0, 0.5, 0.75, 1] }}
              >
                {current.label}
              </motion.h1>
            ) : deal ? (
              <motion.h1
                className={`truncate ${pageTitleClassName} lg:text-xl`}
                style={{ transformOrigin: '0% 100%' }}
                initial={reduceMotion ? false : { x: -60, y: -40, rotate: -14, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 13 }}
              >
                {current.label}
              </motion.h1>
            ) : spin || climb ? (
              <span className="relative inline-block max-w-full align-middle">
                <h1 aria-label={current.label} className={`truncate ${pageTitleClassName} lg:text-xl`}>
                  {[...current.label].map((char, index) => (
                    <motion.span
                      key={index}
                      aria-hidden="true"
                      className="inline-block whitespace-pre"
                      initial={reduceMotion ? false : spin ? { rotate: 360, scale: 0, opacity: 0 } : { y: 22 + index * 1.5, opacity: 0 }}
                      animate={{ rotate: 0, scale: 1, y: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: spin ? 200 : 260, damping: spin ? 14 : 16, delay: 0.05 + index * (spin ? 0.045 : 0.035) }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </h1>
                {climb && !reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 origin-left rounded-full bg-[var(--primary)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </span>
            ) : conveyor ? (
              <span className="relative inline-block max-w-full align-middle">
                <motion.h1
                  className={`truncate ${pageTitleClassName} lg:text-xl`}
                  style={{ transformOrigin: 'left center' }}
                  initial={reduceMotion ? false : { x: 120, skewX: -18, opacity: 0 }}
                  animate={{ x: 0, skewX: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                >
                  {current.label}
                </motion.h1>
                {!reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 origin-left rounded-full bg-[var(--warning)]"
                    initial={{ scaleX: 1, opacity: 1 }}
                    animate={{ scaleX: 0, opacity: [1, 1, 0] }}
                    transition={{ duration: 1.4, delay: 0.3, ease: 'linear', times: [0, 0.85, 1] }}
                  />
                )}
              </span>
            ) : collide ? (
              <h1 aria-label={current.label} className={`truncate ${pageTitleClassName} lg:text-xl`}>
                {current.label.split(' ').map((word, index, words) => (
                  <motion.span
                    key={index}
                    aria-hidden="true"
                    className="inline-block whitespace-pre"
                    initial={reduceMotion ? false : { x: index % 2 === 0 ? -70 : 70, opacity: 0, filter: 'blur(6px)' }}
                    animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.05 + index * 0.04 }}
                  >
                    {index < words.length - 1 ? `${word} ` : word}
                  </motion.span>
                ))}
              </h1>
            ) : stamp ? (
              <span className="relative inline-block max-w-full align-middle">
                <motion.h1
                  key={current.label}
                  className={`truncate ${pageTitleClassName} lg:text-xl`}
                  style={{ transformOrigin: 'left center' }}
                  initial={reduceMotion ? false : { scale: 1.7, opacity: 0, rotate: -4, filter: 'blur(6px)' }}
                  animate={{ scale: 1, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                >
                  {current.label}
                </motion.h1>
                {!reduceMotion && (
                  <motion.span
                    key={`ink-${current.label}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 origin-left rounded-full bg-[var(--primary)]"
                    initial={{ scaleX: 0, opacity: 1 }}
                    animate={{ scaleX: 1, opacity: [1, 1, 0] }}
                    transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut', times: [0, 0.6, 1] }}
                  />
                )}
              </span>
            ) : flip ? (
              <h1 aria-label={current.label} className={`truncate ${pageTitleClassName} lg:text-xl`} style={{ perspective: 500 }}>
                {[...current.label].map((char, index) => (
                  <motion.span
                    key={index}
                    aria-hidden="true"
                    className="inline-block whitespace-pre"
                    style={{ transformOrigin: '50% 0%' }}
                    initial={reduceMotion ? false : { rotateX: -100, opacity: 0, y: -6 }}
                    animate={{ rotateX: 0, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.05 + index * 0.05 }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
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
            {(letters || flip) && (
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
