import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';

/** Cartões de resumo: caem de cima com um quique, um depois do outro. */
export const dropIn = (order: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0, y: -34, rotateX: 25 },
  animate: { opacity: 1, y: 0, rotateX: 0 },
  transition: reducedTransition(reduce, { type: 'spring', stiffness: 260, damping: 14, delay: 0.2 + order * 0.1 }),
  style: { transformPerspective: 700, transformOrigin: 'top center' },
});

/** Blocos grandes: sobem quando entram na tela (vale na rolagem do celular). */
export const riseInView = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: reducedTransition(reduce, { type: 'spring', stiffness: 140, damping: 20, delay }),
});

/** Linhas de lista: entram deslizando de lado, em sequência (atraso limitado para listas longas). */
export const slideInRow = (index: number, reduce: boolean | null, from = 28) => ({
  initial: reduce ? false : { opacity: 0, x: from },
  animate: { opacity: 1, x: 0 },
  transition: reducedTransition(reduce, { type: 'spring', stiffness: 260, damping: 24, delay: 0.05 + Math.min(index, 8) * 0.06 }),
});

export { CARD_EASE };
