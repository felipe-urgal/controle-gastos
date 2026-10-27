import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';

/** Blocos grandes: sobem quando entram na tela (vale na rolagem do celular). */
export const riseInView = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 140, damping: 20, delay }),
});

/** Revela o bloco a partir do canto de cima à esquerda, num círculo que cresce. */
export const circleReveal = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { clipPath: 'circle(0% at 0% 0%)', opacity: 0.5 },
  animate: { clipPath: 'circle(150% at 0% 0%)', opacity: 1, transitionEnd: { clipPath: 'none' } },
  transition: reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay }),
});

/** Quadradinhos de resumo: entram girando e crescendo, um depois do outro. */
export const spinPop = (index: number, reduce: boolean | null, base = 0.5) => ({
  initial: reduce ? false : { opacity: 0, scale: 0.6, rotate: -12 },
  animate: { opacity: 1, scale: 1, rotate: 0, transition: reducedTransition(reduce, { type: 'spring', stiffness: 300, damping: 15, delay: base + index * 0.1 }) },
});
