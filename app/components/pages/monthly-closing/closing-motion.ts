import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';

/** Folha que se desenrola: o bloco é revelado da esquerda para a direita, como um relatório sendo aberto. */
export const unroll = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { clipPath: 'inset(0 100% 0 0 round 16px)', opacity: 0.4 },
  animate: { clipPath: 'inset(0 0% 0 0 round 16px)', opacity: 1, transitionEnd: { clipPath: 'none' } },
  transition: reducedTransition(reduce, { duration: 0.8, ease: CARD_EASE, delay }),
});

/** Cartões abaixo do resultado: sobem quando entram na tela (vale na rolagem do celular). */
export const riseInView = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 140, damping: 20, delay }),
});

/** Linhas de lista: entram em sequência, de baixo para cima e com um leve giro. */
export const tickIn = (index: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 260, damping: 22, delay: Math.min(index, 8) * 0.08 }),
});
