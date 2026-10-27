import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';

/** Blocos grandes: sobem quando entram na tela (vale na rolagem do celular). */
export const riseInView = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 140, damping: 20, delay }),
});

/** Duelo A × B: os itens vêm de lados alternados (par da esquerda, ímpar da direita) e se encontram no lugar. */
export const fromSide = (index: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0, x: index % 2 === 0 ? -40 : 40 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 240, damping: 20, delay: Math.min(index, 8) * 0.07 }),
});

export { CARD_EASE };
