import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';

/** Blocos grandes: sobem quando entram na tela (vale na rolagem do celular). */
export const riseInView = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 140, damping: 20, delay }),
});

/** Linhas da fila de compromissos: chegam pela direita, uma depois da outra, como numa esteira. */
export const conveyorRow = (index: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0, x: 48 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 240, damping: 24, delay: Math.min(index, 8) * 0.06 }),
});

export { CARD_EASE };
